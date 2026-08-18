import "server-only";

import Anthropic, {
  AnthropicError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  ContentBlock,
  RefusalStopDetails,
  TextBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

import {
  salidaAssessmentSchema,
  type SalidaAssessment,
} from "@/lib/assessment/esquema";
import {
  construirMensajeUsuario,
  construirSystem,
} from "@/lib/assessment/prompt";
import { env, envCon } from "@/lib/env";
import type { LeadAssessmentNormalizado } from "@/lib/leads";

/**
 * Cliente del modelo para el pre-diagnóstico (plan de Fase 2, §15b).
 *
 * ⚠️ **CONTRATO ESCRITO POR /arquitecto — la implementación la completa /dev.**
 *
 * ## Un solo camino para el modelo local y para Claude
 *
 * `ia.codebass.org` expone la Messages API de Anthropic detrás de un shim, así
 * que el cliente **no se bifurca**: es el SDK oficial apuntado a otra `baseURL`.
 * Nada de adaptadores, nada de código que no corra en producción.
 *
 * ## Tres correcciones al §15b del plan, medidas contra el SDK 0.117.1 instalado
 *
 * El plan se escribió antes de leer la referencia de la API. Lo que cambia:
 *
 * 1. 🛑 **`temperature` NO EXISTE en `claude-opus-5`: mandarlo devuelve 400.**
 *    El §10 del plan apoyaba la coherencia entre leads en `temperature: 0`. Eso
 *    ya no es una opción, es un error de request. **La coherencia pasa a
 *    depender enteramente de la escala 0–4 del prompt** (`prompt.ts`, bloque 4)
 *    y de un `effort` fijo. Hay que decirlo en voz alta porque es una garantía
 *    más débil: dos leads parecidos pueden divergir más que antes, y la única
 *    red es lo explícita que sea esa escala.
 *
 * 2. ⚠️ **El thinking viene PRENDIDO por defecto en `claude-opus-5`** (a
 *    diferencia de Opus 4.8, donde omitir el parámetro significaba no pensar), y
 *    **`max_tokens` es un techo sobre thinking + texto juntos**. La tabla de
 *    presupuesto del §15b se calculó sin contar tokens de thinking, así que
 *    **está desactualizada y hay que volver a medirla** con el paso 6 andando.
 *    Decisión: se deja el thinking adaptativo (omitir el campo) con
 *    `effort: "low"` — en Opus 5 los niveles bajos rinden muy por encima de lo
 *    que rendían en modelos anteriores, y esta es una tarea de extracción
 *    estructurada, no de razonamiento abierto. `max_tokens` se sube a 8000 para
 *    que el thinking no coma la salida.
 *
 * 3. ✅ **`messages.parse()` + `zodOutputFormat()` existen y sirven** — verificado
 *    en `node_modules/@anthropic-ai/sdk/helpers/zod.d.ts`, que importa de
 *    `zod/v4`; el proyecto tiene zod 4.4.3 y el SDK declara peer `^3.25 || ^4`.
 *    El resto del §15b se sostiene: `timeout` en MILISEGUNDOS, `maxRetries: 0`
 *    porque el SDK reintenta los timeouts por su cuenta y el reloj de pared
 *    llegaría a `timeout × 3`, y la validación propia con `safeParse` siempre.
 *
 * ## Refusal: se detecta, no se reintenta, y no hay `fallbacks`
 *
 * `claude-opus-5` puede devolver **HTTP 200 con `stop_reason: "refusal"`** y
 * `content` vacío. Hay que chequear `stop_reason` ANTES de leer el contenido: el
 * código que hace `content[0]` a ciegas revienta ahí. Un refusal **no es un error
 * de esquema y no dispara el reintento** — reintentar el mismo cuerpo da el mismo
 * refusal y se come el presupuesto de tiempo.
 *
 * **Decisión: no se declara el parámetro `fallbacks`** (beta, y solo en la API de
 * Anthropic — no existe contra el shim del modelo local). Un refusal sobre un
 * formulario de datos de negocio sería rarísimo y, si ocurre, **queremos verlo en
 * el log, no que se resuelva solo en silencio**. El lead ya está a salvo: el
 * EMAIL #1 con las respuestas crudas salió antes de tocar el modelo (§11).
 */

/**
 * Resultado de una generación. Unión discriminada a propósito: el route del paso
 * 7 tiene que poder distinguir "no hay documento" de "hay documento", y la razón
 * del fallo va al log, nunca al usuario (que ya recibió su 200).
 */
export type ResultadoGeneracion =
  | { ok: true; salida: SalidaAssessment }
  | { ok: false; motivo: MotivoFallo; detalle: string };

/**
 * Los cuatro modos de falla, separados porque se leen distinto en el log:
 * - `sin-credencial` — `ANTHROPIC_API_KEY` ausente. **No es un error**: el sitio
 *   tiene que poder desplegarse sin ningún secreto (convención de `lib/env.ts`).
 * - `timeout` — se agotó el presupuesto. En desarrollo contra el modelo local es
 *   lo normal si no se sube `ASSESSMENT_TIMEOUT_MS`.
 * - `esquema-invalido` — el modelo respondió pero la salida no valida ni después
 *   del único reintento. Es el camino NORMAL, no el de borde: JSON Schema no
 *   admite la mitad de nuestras restricciones (`.min(80)`, `.length(4)`, el
 *   `.refine()` de nivel/evidencia), así que el SDK las quita del esquema que
 *   manda y las valida del lado del cliente — el modelo no está *restringido*
 *   por ellas, solo *chequeado*.
 * - `rechazo` — `stop_reason: "refusal"`. Ver arriba: no se reintenta.
 * - `error-api` — el proveedor falló: 400, 401, 429, 5xx. **No es culpa nuestra
 *   ni del prompt**, y por eso no comparte motivo con `esquema-invalido`.
 * - `error-interno` — un error nuestro (un `TypeError`, un bug en `prompt.ts`).
 *   Tampoco es del proveedor.
 *
 * ⚠️ **Los dos últimos los agregó `/arquitecto` corrigiendo el contrato original,
 * que enumeraba cuatro y dejaba los errores de API bucketeados en
 * `esquema-invalido`.** `/dev` lo implementó así como correspondía —el contrato
 * decía cuatro— y lo marcó para revisión, que era exactamente lo correcto.
 *
 * El motivo por el que se corrige: **este proyecto ya perdió tiempo una vez por no
 * distinguir un 502 de un 503 en el formulario de contacto**, y la lección quedó
 * escrita — "distinguir 502 de 503 ya es medio diagnóstico". Un 529 de Anthropic
 * logueado como `esquema-invalido` manda a quien depure a leer el prompt, que es
 * el único lugar donde el problema no está. El enum existe para que la línea de
 * log diga dónde mirar; tres destinos distintos necesitan tres nombres distintos.
 */
export type MotivoFallo =
  | "sin-credencial"
  | "timeout"
  | "esquema-invalido"
  | "rechazo"
  | "error-api"
  | "error-interno";

/**
 * Presupuesto de tiempo por intento, en MILISEGUNDOS.
 *
 * 🛑 **`ASSESSMENT_TIMEOUT_MS` existe para el desarrollo y NO se setea en
 * producción.** A ~34 tok/s el Qwen local tarda cerca de un minuto en los ~2K
 * tokens de salida del §5, así que el default de 22 s corta siempre. La env var
 * es la forma correcta de resolverlo; un número editado a mano en este archivo
 * es la forma que alguien termina commiteando.
 */
export const TIMEOUT_POR_DEFECTO_MS = 22_000;

/** El modelo de producción. El local se elige con `ASSESSMENT_BASE_URL`, no cambiando esto. */
export const MODELO_POR_DEFECTO = "claude-opus-5";

/**
 * Techo de tokens del turno. En `claude-opus-5` **`max_tokens` cubre thinking +
 * texto juntos** y el thinking adaptativo viene prendido por defecto, así que
 * este número no es el tamaño de la salida: es el tamaño de la salida más lo que
 * el modelo haya pensado. 8000 le deja aire al razonamiento sin que se coma los
 * ~2K del §5.
 *
 * 🛑 No agregar `temperature`, `top_p`, `top_k` ni `thinking`: los cuatro están
 * removidos en `claude-opus-5` y devuelven **400**.
 */
const MAX_TOKENS = 8000;

/**
 * Esfuerzo de razonamiento. Fijo a propósito: desde que `temperature` no existe,
 * lo único que sostiene la coherencia entre dos leads parecidos es la escala 0–4
 * del prompt **y** que el esfuerzo no varíe entre llamadas.
 */
const ESFUERZO = "low" as const;

/**
 * El `output_config.format` derivado del esquema zod, memoizado.
 *
 * Se construye tarde (y una sola vez) en vez de en el tope del módulo: importar
 * este archivo no debería ejecutar `z.toJSONSchema` en un proceso que quizá
 * nunca llame al modelo.
 *
 * ⚠️ **Lo que el SDK manda a la API es más débil de lo que el `.d.ts` sugiere.**
 * `transformJSONSchema` no *quita* las restricciones no expresables: las degrada
 * a texto dentro de `description` (`"{minLength: 80, maxLength: 600}"`), y eso
 * **incluye los `enum`** — `servicioRecomendado` viaja como `type: "string"` con
 * el enum escrito en la descripción. O sea que ni siquiera el enum del catálogo
 * está restringido del lado del modelo. Es una sugerencia; la garantía es el
 * `safeParse()` de más abajo.
 */
function crearFormato() {
  return zodOutputFormat(salidaAssessmentSchema);
}

let formatoMemo: ReturnType<typeof crearFormato> | undefined;

function formatoSalida(): ReturnType<typeof crearFormato> {
  formatoMemo ??= crearFormato();
  return formatoMemo;
}

/**
 * Presupuesto por intento. `ASSESSMENT_TIMEOUT_MS` se lee en cada llamada (no al
 * importar) para que el valor siga a la configuración y no al orden de imports.
 * Un valor no numérico o ≤ 0 cae al default en vez de propagar un `NaN` al SDK.
 */
function timeoutMs(): number {
  const crudo = envCon(
    process.env.ASSESSMENT_TIMEOUT_MS,
    String(TIMEOUT_POR_DEFECTO_MS),
  );
  const ms = Number(crudo);
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : TIMEOUT_POR_DEFECTO_MS;
}

/**
 * Los bloques del system prompt con el `cache_control` en el ÚLTIMO.
 *
 * El breakpoint va acá y no en `prompt.ts` a propósito: ese módulo decide el
 * contenido, este decide cómo se transporta. Las respuestas del lead van en el
 * mensaje de usuario — interpolarlas acá cambiaría el prefijo en cada request y
 * el caché no acertaría nunca, en silencio y facturando de más.
 */
function systemConCache(): TextBlockParam[] | undefined {
  const bloques = construirSystem();
  if (bloques.length === 0) return undefined;

  return bloques.map((text, i) =>
    i === bloques.length - 1
      ? { type: "text", text, cache_control: { type: "ephemeral" } }
      : { type: "text", text },
  );
}

/**
 * Resultado de UN intento, separado de `ResultadoGeneracion` porque acá importa
 * una distinción que afuera no: `reintentable` es el único caso que gasta el
 * segundo intento. Todo lo demás termina el trabajo, salga bien o mal.
 */
type Intento =
  | { clase: "ok"; salida: SalidaAssessment }
  | { clase: "reintentable"; detalle: string }
  | { clase: "final"; motivo: MotivoFallo; detalle: string };

/** Recorta el detalle: va a un log, no a un archivo. */
function recortar(texto: string): string {
  return texto.length > 400 ? `${texto.slice(0, 400)}…` : texto;
}

function describir(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/**
 * Traduce lo que lanzó el SDK a uno de los tres desenlaces.
 *
 * ⚠️ **Descubrimiento contra el bundle: `messages.parse()` LANZA cuando la salida
 * no valida.** El §15b del plan dice que `parsed_output` vuelve `null` y que ese
 * `null` es el disparador del reintento — es falso en 0.117.1. En
 * `lib/parser.js`, `parseOutputFormat()` envuelve cualquier fallo de `JSON.parse`
 * o del `safeParse` interno en un `AnthropicError` y lo tira. `parsed_output`
 * solo vuelve `null` cuando **no hay ningún bloque de texto** (el caso del
 * refusal, con `content: []`).
 *
 * De ahí la clasificación, que sigue el orden de la jerarquía de clases
 * (`APIConnectionTimeoutError` < `APIConnectionError` < `APIError` <
 * `AnthropicError`) y por eso va de lo más específico a lo más general:
 *
 * - timeout / abort → `timeout`. **No se reintenta**: el `maxDuration = 60` del
 *   route no da para dos esperas completas más el render y el EMAIL #2.
 * - `APIError` (400, 401, 429, 5xx) → **no se reintenta** tampoco. Un 529
 *   transitorio pierde el pre-diagnóstico y eso está aceptado en el §15b: el
 *   EMAIL #1 ya salió (§11), se pierde el documento, nunca el lead.
 * - `AnthropicError` que no es `APIError` → es el fallo de parseo/validación del
 *   helper. **Este sí es el reintentable**, y es el camino normal, no el de
 *   borde.
 * - cualquier otra cosa → se trata como final. Un `TypeError` nuestro no mejora
 *   pagando otra llamada al modelo.
 *
 * ✅ **Revisado y corregido por `/arquitecto` (2026-08-18).** `/dev` bucketeó los
 * errores de API en `esquema-invalido` —correctamente, porque el contrato solo
 * enumeraba cuatro motivos— y lo marcó. Se agregaron `error-api` y
 * `error-interno`: ver el doc de `MotivoFallo` para el porqué.
 *
 * ⚠️ **El `detalle` NO trae el nombre de la clase, aunque el informe de `/dev`
 * decía que sí.** Un 529 sale como `"Error: 529 overloaded"`, no como
 * `"InternalServerError: 529 …"`: las clases de error del SDK no setean `name`,
 * así que el prefijo colapsa a `Error` para todas. Lo encontró un test que
 * afirmaba el nombre de la clase y salió rojo — el código estaba bien y la
 * afirmación mal. **Lo accionable es el código de estado**, que sí viaja: 429 se
 * reintenta más tarde, 400 es nuestro, 529 es del proveedor. El `motivo` ya
 * distingue el destino; el número dice qué hacer.
 */
function clasificarError(error: unknown): Intento {
  const detalle = recortar(describir(error));

  if (
    error instanceof APIConnectionTimeoutError ||
    error instanceof APIUserAbortError
  ) {
    return { clase: "final", motivo: "timeout", detalle };
  }

  if (error instanceof APIError) {
    return { clase: "final", motivo: "error-api", detalle };
  }

  if (error instanceof AnthropicError) {
    return { clase: "reintentable", detalle };
  }

  return { clase: "final", motivo: "error-interno", detalle };
}

function describirRechazo(detalles: RefusalStopDetails | null): string {
  if (!detalles) return "stop_reason=refusal sin stop_details";
  const categoria = detalles.category ?? "sin-categoría";
  const explicacion = detalles.explanation ?? "sin explicación";
  return recortar(`refusal[${categoria}]: ${explicacion}`);
}

/**
 * Camino de texto plano: el primer bloque `text` parseado a JSON a mano.
 *
 * Existe para el shim de `ia.codebass.org`, que puede ignorar
 * `output_config.format`. En la práctica casi nunca se ejecuta —con un formato
 * parseable presente el SDK ya intentó parsear el bloque y, si falló, lanzó—,
 * pero es lo que hace que el módulo no dependa de ese detalle interno del SDK
 * para seguir siendo correcto. **Nunca lanza**: devuelve `undefined` y el
 * llamador lo trata como salida inválida.
 *
 * Se busca el primer bloque `text` en vez de `content[0]` porque el thinking
 * adaptativo puede poner un bloque `thinking` adelante.
 */
function jsonDelTexto(content: ContentBlock[]): unknown {
  const bloque = content.find((b) => b.type === "text");
  if (!bloque) return undefined;

  try {
    return JSON.parse(bloque.text);
  } catch {
    return undefined;
  }
}

/**
 * Genera el pre-diagnóstico. **Nunca lanza**: todos los fallos vuelven como
 * `{ ok: false }`, porque el llamador (el `after()` del route) ya respondió 200 y
 * lo único que puede hacer con una excepción es loguearla.
 *
 * Un solo reintento, y **exclusivamente cuando la salida no valida** — no ante
 * timeout, no ante 529, no ante refusal. La contrapartida es explícita: un 529
 * transitorio pierde el pre-diagnóstico. Es aceptable porque el EMAIL #1 ya salió
 * (§11): se pierde el documento, nunca el lead.
 */
export async function generarPreDiagnostico(
  lead: LeadAssessmentNormalizado,
): Promise<ResultadoGeneracion> {
  try {
    const apiKey = env(process.env.ANTHROPIC_API_KEY);
    if (!apiKey) {
      return {
        ok: false,
        motivo: "sin-credencial",
        detalle: "ANTHROPIC_API_KEY ausente o vacía",
      };
    }

    /**
     * El cliente se construye acá y no en el tope del módulo por dos razones que
     * apuntan al mismo lado: importar este archivo sin credencial no debe
     * instanciar nada, y las env vars tienen que leerse en el momento de la
     * llamada. `baseURL: undefined` deja el default del SDK
     * (`api.anthropic.com`), que es exactamente lo que pide el contrato.
     */
    const cliente = new Anthropic({
      apiKey,
      baseURL: env(process.env.ASSESSMENT_BASE_URL),
      timeout: timeoutMs(),
      maxRetries: 0,
    });

    const modelo = envCon(process.env.ASSESSMENT_MODELO, MODELO_POR_DEFECTO);

    const primero = await intentar(cliente, modelo, lead);
    if (primero.clase === "ok") return { ok: true, salida: primero.salida };
    if (primero.clase === "final") {
      return { ok: false, motivo: primero.motivo, detalle: primero.detalle };
    }

    // Único reintento, y solo por salida que no valida. Mismo cuerpo: lo que
    // cambia es el muestreo del modelo, no el pedido.
    const segundo = await intentar(cliente, modelo, lead);
    if (segundo.clase === "ok") return { ok: true, salida: segundo.salida };
    if (segundo.clase === "final") {
      return { ok: false, motivo: segundo.motivo, detalle: segundo.detalle };
    }

    return {
      ok: false,
      motivo: "esquema-invalido",
      detalle: `2 intentos inválidos. #1 ${primero.detalle} | #2 ${segundo.detalle}`,
    };
  } catch (error) {
    /**
     * La red de seguridad del "nunca lanza". Cubre lo que está fuera del
     * `try` de `intentar()`: el constructor del cliente y, sobre todo,
     * `construirSystem()` / `construirMensajeUsuario()`, que hoy lanzan `TODO`.
     * Sin esto, una excepción del prompt se propagaría al `after()` del route,
     * donde nadie la puede atajar.
     */
    return {
      ok: false,
      motivo: "esquema-invalido",
      detalle: recortar(`fallo inesperado — ${describir(error)}`),
    };
  }
}

/**
 * Un intento completo: request, chequeo de refusal, extracción y validación.
 *
 * El orden no es negociable. **`stop_reason` se lee ANTES que el contenido**
 * porque en un refusal `claude-opus-5` devuelve HTTP 200 con `content: []`, y
 * cualquier lectura posicional revienta ahí.
 */
async function intentar(
  cliente: Anthropic,
  modelo: string,
  lead: LeadAssessmentNormalizado,
): Promise<Intento> {
  let respuesta;

  try {
    /**
     * Los parámetros van inline y no en una variable anotada: el genérico
     * `ExtractParsedContentFromParams` del SDK infiere el tipo de
     * `parsed_output` desde el literal, y anotarlo como
     * `MessageCreateParamsNonStreaming` lo colapsaría a `null`.
     */
    respuesta = await cliente.messages.parse({
      model: modelo,
      max_tokens: MAX_TOKENS,
      system: systemConCache(),
      output_config: { effort: ESFUERZO, format: formatoSalida() },
      messages: [{ role: "user", content: construirMensajeUsuario(lead) }],
    });
  } catch (error) {
    return clasificarError(error);
  }

  if (respuesta.stop_reason === "refusal") {
    return {
      clase: "final",
      motivo: "rechazo",
      detalle: describirRechazo(respuesta.stop_details),
    };
  }

  const crudo = respuesta.parsed_output ?? jsonDelTexto(respuesta.content);

  /**
   * Se valida SIEMPRE, incluso cuando vino por `parsed_output` y el helper del
   * SDK ya corrió el mismo esquema. No es redundancia defensiva: es lo que hace
   * converger los dos caminos —Claude con `output_config.format`, y el shim del
   * modelo local que puede ignorarlo y caer al texto plano— en un único
   * contrato. El tipo de `salida` sale de acá, de nuestro `safeParse`, y no de
   * la palabra del SDK.
   */
  const validado = salidaAssessmentSchema.safeParse(crudo);
  if (!validado.success) {
    return {
      clase: "reintentable",
      detalle: recortar(
        validado.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
          .join(" | ") || "salida vacía o no parseable",
      ),
    };
  }

  return { clase: "ok", salida: validado.data };
}
