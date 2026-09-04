import "server-only";

import { env, envCon } from "@/lib/env";
import { generar } from "@/lib/modelo/cliente";
import type { ResultadoGeneracion as ResultadoGeneracionModelo } from "@/lib/modelo/cliente";
import type { EntradaPropuestaNormalizada } from "@/lib/propuesta/entrada";
import {
  salidaPropuestaSchema,
  type SalidaPropuesta,
} from "@/lib/propuesta/esquema";
import {
  construirMensajeUsuario,
  construirSystem,
} from "@/lib/propuesta/prompt";

/**
 * Cliente del modelo para la propuesta comercial (Fase 3).
 *
 * Es el gemelo de `lib/assessment/cliente.ts`: configuración y nada más. El
 * transporte —los seis modos de falla, el refusal, el `cache_control`, el
 * reintento, la validación— vive en `lib/modelo/cliente.ts` y no se duplicó.
 *
 * ## Las dos diferencias con el assessment, y las dos son de presupuesto
 *
 * 1. 🕐 **Acá no hay reloj de plataforma.** El assessment corre dentro del
 *    `maxDuration` de una función serverless y todo su presupuesto se deriva de
 *    ahí. La propuesta la corre un script en la máquina de Bastián (ADR-012 §1,
 *    opción A), así que el techo lo elegimos nosotros y no lo impone Vercel.
 *
 * 2. ♻️ **Y por eso, acá el reintento SÍ entra.** En el assessment el único
 *    reintento existe pero no se dispara nunca en producción —un fallo de
 *    validación llega a los ~35 s y otro intento pediría ~70, que no caben en la
 *    función—, así que un esquema inválido pierde el pre-diagnóstico siempre.
 *    Con el techo puesto en el doble del intento, la propuesta se recupera de la
 *    primera salida inválida, que es el camino normal y no el de borde. **La
 *    misma línea de código con presupuestos distintos deja de ser decorativa.**
 */

/** Resultado de una generación de propuesta. */
export type ResultadoPropuesta = ResultadoGeneracionModelo<SalidaPropuesta>;

/**
 * Timeout de UN intento, en milisegundos.
 *
 * 📏 **Es una estimación declarada como tal, no una medición.** Lo único medido
 * en este proyecto son las llamadas del pre-diagnóstico: 29-36 s con Opus 5 para
 * ~2K tokens de salida. La propuesta son nueve secciones con tablas, del orden
 * de 3-4× esos tokens, así que 180 s deja margen de sobra sin que un cuelgue de
 * red deje el script esperando para siempre.
 *
 * **El número real lo va a dar la calibración del paso 5**, y cuando exista, esta
 * constante se ajusta con la medición al lado — igual que pasó con los 22 s del
 * assessment, que estaban escritos sin medir nada y cortaban todas las llamadas.
 */
export const TIMEOUT_POR_DEFECTO_MS = 180_000;

/** El modelo de producción. El local se elige con `PROPUESTA_BASE_URL`. */
export const MODELO_POR_DEFECTO = "claude-opus-5";

/**
 * Presupuesto de la llamada. `PROPUESTA_TIMEOUT_MS` lo pisa (útil contra el
 * modelo local, que es mucho más lento); un valor no numérico o ≤ 0 cae al
 * default en vez de propagar un `NaN` al SDK.
 *
 * El techo es **el doble** del intento, no un valor aparte: es exactamente lo
 * que hace que el reintento quepa. Ver la nota 2 de arriba.
 */
function presupuestoDeTiempo(): { porIntento: number; techo: number } {
  const crudo = env(process.env.PROPUESTA_TIMEOUT_MS);
  const ms = crudo === undefined ? NaN : Number(crudo);

  const porIntento =
    Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : TIMEOUT_POR_DEFECTO_MS;

  return { porIntento, techo: porIntento * 2 };
}

/**
 * Genera la propuesta. **Nunca lanza**: los fallos vuelven como `{ ok: false }`.
 *
 * ⚠️ **El borrador que sale de acá no es un documento terminado.** Lo que
 * devuelve son datos validados; el Markdown lo arma `render.ts`, con el
 * encabezado de borrador y sin firma (ADR-005), y **ningún camino de código lo
 * manda a un prospecto**: termina en las manos de Daniela y ahí sigue una
 * persona.
 */
export async function generarPropuesta(
  entrada: EntradaPropuestaNormalizada,
): Promise<ResultadoPropuesta> {
  const presupuesto = presupuestoDeTiempo();

  return generar({
    apiKey: env(process.env.ANTHROPIC_API_KEY),
    nombreCredencial: "ANTHROPIC_API_KEY",
    baseURL: env(process.env.PROPUESTA_BASE_URL),
    modelo: envCon(process.env.PROPUESTA_MODELO, MODELO_POR_DEFECTO),
    timeoutMs: presupuesto.porIntento,
    techoMs: presupuesto.techo,
    esquema: salidaPropuestaSchema,
    construirSystem,
    construirMensajeUsuario: () => construirMensajeUsuario(entrada),
    // Sin `maxDuration` de por medio: la aritmética es la misma, el techo no.
    cabeOtroIntento: (transcurrido, porIntento, techo) =>
      transcurrido + porIntento <= techo,
  });
}
