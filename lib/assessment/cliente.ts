import "server-only";

import {
  salidaAssessmentSchema,
  type SalidaAssessment,
} from "@/lib/assessment/esquema";
import {
  cabeOtroIntento,
  MAX_DURATION_SEGUNDOS,
  PRESUPUESTO_MODELO_MS,
} from "@/lib/assessment/presupuesto";
import {
  construirMensajeUsuario,
  construirSystem,
} from "@/lib/assessment/prompt";
import { env, envCon } from "@/lib/env";
import type { LeadAssessmentNormalizado } from "@/lib/leads";
import { generar } from "@/lib/modelo/cliente";
import type {
  MotivoFallo as MotivoFalloModelo,
  ResultadoGeneracion as ResultadoGeneracionModelo,
} from "@/lib/modelo/cliente";

/**
 * Cliente del modelo para el pre-diagnóstico (plan de Fase 2, §15b).
 *
 * ⚠️ **El transporte se mudó a `lib/modelo/cliente.ts` (Fase 3, paso 4).** Este
 * archivo pasó de 538 líneas a la configuración del assessment y nada más: qué
 * esquema, qué prompt, qué env vars y qué presupuesto de tiempo. Todo lo que era
 * "cómo se habla con el modelo" —el `cache_control`, la clasificación de los
 * seis modos de falla, el refusal, el camino de texto plano del shim, la
 * validación propia y el único reintento— vive allá, sin saber qué documento se
 * está generando.
 *
 * 🛑 **`lib/assessment/cliente.test.ts` NO se tocó, y esa era la condición del
 * refactor**: si moverlo hubiera obligado a editar el test, no sería un refactor
 * sino un cambio de comportamiento. Los 558 tests siguen apuntando acá y siguen
 * siendo la evidencia de que la conducta es la misma.
 *
 * ## Lo que sigue siendo cierto y hay que saber antes de tocar nada
 *
 * `ia.codebass.org` expone la Messages API detrás de un shim, así que el cliente
 * **no se bifurca**: es el SDK oficial apuntado a otra `baseURL`. Nada de
 * adaptadores, nada de código que no corra en producción.
 *
 * 1. 🛑 **`temperature` NO EXISTE en `claude-opus-5`: mandarlo devuelve 400.** El
 *    §10 del plan apoyaba la coherencia entre leads en `temperature: 0`. Eso ya
 *    no es una opción, es un error de request. **La coherencia pasa a depender
 *    enteramente de la escala 0–4 del prompt** (`prompt.ts`, bloque 4) y de un
 *    `effort` fijo. Es una garantía más débil: dos leads parecidos pueden
 *    divergir más que antes, y la única red es lo explícita que sea esa escala.
 * 2. ⚠️ **El thinking viene PRENDIDO por defecto en `claude-opus-5`** y
 *    `max_tokens` es un techo sobre thinking + texto juntos. Se deja adaptativo
 *    con `effort: "low"`: en Opus 5 los niveles bajos rinden muy por encima de
 *    lo que rendían antes, y esto es extracción estructurada, no razonamiento
 *    abierto.
 * 3. ✅ **`messages.parse()` + `zodOutputFormat()` existen y sirven** —
 *    verificado contra el SDK 0.117.1 instalado, no recordado.
 *
 * ## Refusal: se detecta, no se reintenta, y no hay `fallbacks`
 *
 * `claude-opus-5` puede devolver **HTTP 200 con `stop_reason: "refusal"`** y
 * `content` vacío. Un refusal no es un error de esquema y no dispara el
 * reintento: el mismo cuerpo da el mismo refusal y se come el presupuesto.
 *
 * **No se declara el parámetro `fallbacks`** (beta, y solo en la API de
 * Anthropic — no existe contra el shim local). Un refusal sobre un formulario de
 * datos de negocio sería rarísimo y, si ocurre, **queremos verlo en el log, no
 * que se resuelva solo en silencio**. El lead ya está a salvo: el EMAIL #1 con
 * las respuestas crudas salió antes de tocar el modelo (§11).
 */

/** Los seis modos de falla. El detalle de cada uno, en `lib/modelo/cliente.ts`. */
export type MotivoFallo = MotivoFalloModelo;

/** Resultado de una generación de pre-diagnóstico. */
export type ResultadoGeneracion = ResultadoGeneracionModelo<SalidaAssessment>;

/**
 * Presupuesto de tiempo por intento, en MILISEGUNDOS. **Derivado, no elegido.**
 *
 * Sale de `lib/assessment/presupuesto.ts` —el mismo módulo del que el route saca
 * su `maxDuration`— porque son dos números que **no pueden divergir en
 * silencio**: el timeout del cliente tiene que ser estrictamente menor que el
 * techo de la función, o la plataforma mata el proceso antes de que dispare
 * nuestro timeout y se pierde el camino de error limpio.
 *
 * 📏 El valor anterior era `22_000`, escrito antes de que existiera ninguna
 * medición. **La calibración del paso 6b midió 35,7 s y 29,1 s contra Claude
 * real: con 22 s las dos llamadas habrían dado timeout.**
 *
 * 🛑 **`ASSESSMENT_TIMEOUT_MS` existe para el desarrollo y NO se setea en
 * producción.** A ~34 tok/s el Qwen local tarda cerca de un minuto en los ~2K
 * tokens de salida del §5, así que ahí hay que subirlo. La env var es la forma
 * correcta de resolverlo; un número editado a mano en este archivo es la forma
 * que alguien termina commiteando.
 */
export const TIMEOUT_POR_DEFECTO_MS = PRESUPUESTO_MODELO_MS;

/** El modelo de producción. El local se elige con `ASSESSMENT_BASE_URL`, no cambiando esto. */
export const MODELO_POR_DEFECTO = "claude-opus-5";

/**
 * El presupuesto de esta llamada: cuánto dura un intento y cuál es el techo del
 * reloj de pared del que salen los dos.
 *
 * `ASSESSMENT_TIMEOUT_MS` se lee en cada llamada (no al importar) para que el
 * valor siga a la configuración y no al orden de imports. Un valor no numérico o
 * ≤ 0 cae al default en vez de propagar un `NaN` al SDK.
 *
 * **El override mueve el techo con él, a propósito.** En producción los dos
 * valores son el presupuesto derivado. Quien setea `ASSESSMENT_TIMEOUT_MS` está
 * corriendo contra el modelo local en `next dev`, o sea **fuera del reloj de la
 * plataforma**: dejarle el techo de producción apagaría en silencio el camino de
 * reintento justo en el entorno que el §15b quiere que lo ejercite (el modelo
 * local produce JSON inválido solo, sin que haya que simularlo).
 */
function presupuestoDeTiempo(): { porIntento: number; techo: number } {
  const crudo = env(process.env.ASSESSMENT_TIMEOUT_MS);
  const ms = crudo === undefined ? NaN : Number(crudo);

  if (!Number.isFinite(ms) || ms <= 0) {
    return { porIntento: TIMEOUT_POR_DEFECTO_MS, techo: PRESUPUESTO_MODELO_MS };
  }

  const porIntento = Math.floor(ms);
  return { porIntento, techo: porIntento * 2 };
}

/**
 * Genera el pre-diagnóstico. **Nunca lanza**: todos los fallos vuelven como
 * `{ ok: false }`, porque el llamador (el `after()` del route) ya respondió 200 y
 * lo único que puede hacer con una excepción es loguearla.
 *
 * ⏱️ El único reintento está condicionado al presupuesto (`cabeOtroIntento`): un
 * fallo `reintentable` ocurre *después* de que el modelo respondió —a los ~35 s
 * medidos—, así que un segundo intento pediría ~70 s y la plataforma cortaría la
 * función a mitad de camino. Con los números de producción no cabe nunca, y esa
 * es exactamente la razón por la que la condición está escrita: un camino de
 * recuperación que no entra en el presupuesto se lee como una red y no lo es.
 *
 * ⚠️ **`construirSystem()` y `construirMensajeUsuario()` se llaman acá, dentro
 * del contrato de "nunca lanza" de `generar()`.** Si el prompt lanzara —ya pasó,
 * cuando `prompt.ts` era un `TODO`—, la excepción vuelve como
 * `{ ok: false, motivo: "esquema-invalido" }` en vez de propagarse al `after()`
 * del route, donde no la atajaría nadie.
 */
export async function generarPreDiagnostico(
  lead: LeadAssessmentNormalizado,
): Promise<ResultadoGeneracion> {
  const presupuesto = presupuestoDeTiempo();

  return generar({
    apiKey: env(process.env.ANTHROPIC_API_KEY),
    nombreCredencial: "ANTHROPIC_API_KEY",
    // `undefined` deja el default del SDK (`api.anthropic.com`).
    baseURL: env(process.env.ASSESSMENT_BASE_URL),
    modelo: envCon(process.env.ASSESSMENT_MODELO, MODELO_POR_DEFECTO),
    timeoutMs: presupuesto.porIntento,
    techoMs: presupuesto.techo,
    esquema: salidaAssessmentSchema,
    construirSystem,
    construirMensajeUsuario: () => construirMensajeUsuario(lead),
    cabeOtroIntento,
    contextoPresupuesto: `maxDuration=${MAX_DURATION_SEGUNDOS}s`,
  });
}
