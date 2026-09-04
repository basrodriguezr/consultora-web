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
import type { z } from "zod";

/**
 * **El transporte al modelo, sin saber qué documento se está generando.**
 *
 * Salió de `lib/assessment/cliente.ts`, que ya corría en producción, cuando la
 * Fase 3 necesitó lo mismo para las propuestas. Lo que se movió es lo que no
 * tiene opinión sobre el contenido: construir el cliente, poner el
 * `cache_control`, clasificar los seis modos de falla, detectar el refusal,
 * caer al texto plano cuando el shim ignora `output_config.format`, validar
 * contra el esquema propio y decidir si cabe el único reintento.
 *
 * Lo que **no** se movió, porque es de cada agente: el esquema, el prompt, los
 * nombres de las env vars (`ASSESSMENT_*` no puede gobernar a las propuestas) y
 * el presupuesto de tiempo, que en el assessment sale del `maxDuration` de una
 * función serverless y en las propuestas sale de un script que corre sin reloj.
 *
 * ## La condición que hizo seguro el refactor
 *
 * `/arquitecto` lo autorizó con una condición verificable: **si mover esto
 * obligaba a editar `lib/assessment/cliente.test.ts` (558 líneas cubriendo
 * código en producción), no era un refactor sino un cambio de comportamiento, y
 * había que abortar y duplicar el cliente en la Fase 3.** No hizo falta: el test
 * mockea `@anthropic-ai/sdk` y `@/lib/assessment/prompt`, y todo lo que afirma
 * lo observa a través de `generarPreDiagnostico`. Ni una línea de ese archivo
 * cambió, y por eso el test sigue siendo evidencia de que el comportamiento es
 * el mismo — un test que hay que tocar para que el refactor pase deja de probar
 * lo que probaba.
 *
 * ⚠️ **Todo lo que este módulo sabe del SDK está medido contra la versión
 * instalada (0.117.1), no recordado**; los detalles y sus porqués siguen en los
 * comentarios de `lib/assessment/cliente.ts`, que es donde se descubrieron.
 * Los tres que gobiernan el código de acá:
 *
 *   1. `temperature`, `top_p`, `top_k` y `thinking` **no existen** en
 *      `claude-opus-5`: mandarlos devuelve 400.
 *   2. `messages.parse()` **lanza** cuando la salida no valida (no devuelve
 *      `null`), y `parsed_output` es `null` solo cuando no hay bloque de texto
 *      — el caso del refusal.
 *   3. El SDK **degrada** las restricciones que JSON Schema no expresa a texto
 *      dentro de `description`, enums incluidos. El modelo no queda restringido
 *      por el esquema: queda chequeado por el `safeParse` de este archivo.
 */

/**
 * Los seis modos de falla, separados porque se leen distinto en el log.
 *
 * - `sin-credencial` — no hay API key. **No es un error**: el sitio tiene que
 *   poder desplegarse sin ningún secreto (convención de `lib/env.ts`).
 * - `timeout` — se agotó el presupuesto de la llamada.
 * - `esquema-invalido` — el modelo respondió y la salida no valida. Es el camino
 *   NORMAL y no el de borde, por el punto 3 de arriba.
 * - `rechazo` — `stop_reason: "refusal"`. No se reintenta: el mismo cuerpo da el
 *   mismo refusal y se come el presupuesto.
 * - `error-api` — el proveedor falló (400, 401, 429, 5xx). No es culpa nuestra
 *   ni del prompt, y por eso no comparte motivo con `esquema-invalido`.
 * - `error-interno` — un error nuestro (un `TypeError`, un bug en el prompt).
 *
 * La razón de que sean seis y no cuatro está escrita en `lib/assessment/
 * cliente.ts`: este proyecto ya perdió tiempo por no distinguir un 502 de un
 * 503, y un 529 del proveedor logueado como `esquema-invalido` manda a quien
 * depure a leer el prompt, que es el único lugar donde el problema no está.
 */
export type MotivoFallo =
  | "sin-credencial"
  | "timeout"
  | "esquema-invalido"
  | "rechazo"
  | "error-api"
  | "error-interno";

/**
 * Resultado de una generación. Unión discriminada a propósito: quien llama tiene
 * que poder distinguir "no hay documento" de "hay documento", y la razón del
 * fallo va al log, nunca a quien está del otro lado.
 */
export type ResultadoGeneracion<T> =
  | { ok: true; salida: T }
  | { ok: false; motivo: MotivoFallo; detalle: string };

/**
 * Techo de tokens del turno. En `claude-opus-5` **`max_tokens` cubre thinking +
 * texto juntos** y el thinking adaptativo viene prendido por defecto, así que
 * este número no es el tamaño de la salida: es la salida más lo que el modelo
 * haya pensado.
 *
 * ⚠️ Es común a los dos agentes y hoy alcanza para los dos, pero **la propuesta
 * es un documento de nueve secciones (3-4× la salida del pre-diagnóstico)**: si
 * alguna vez se corta a la mitad, este es el primer número a mirar, y el momento
 * de que deje de ser una constante compartida y pase a la petición.
 */
export const MAX_TOKENS = 8000;

/**
 * Esfuerzo de razonamiento. Fijo a propósito: desde que `temperature` no existe,
 * lo único que sostiene la coherencia entre dos generaciones parecidas es lo
 * explícito que sea el prompt **y** que el esfuerzo no varíe entre llamadas.
 */
const ESFUERZO = "low" as const;

/**
 * Lo que hay que darle al transporte para que haga una generación completa.
 *
 * Es un objeto y no ocho parámetros sueltos porque cada agente arma el suyo una
 * sola vez, y porque un booleano posicional en la posición equivocada acá cuesta
 * una llamada paga.
 */
export interface PeticionGeneracion<T> {
  /** `undefined` o vacía ⇒ `sin-credencial`, sin instanciar el cliente. */
  apiKey: string | undefined;
  /**
   * Cómo se llama la credencial en el log cuando falta.
   *
   * Parece cosmético y no lo es: el valor del mensaje es decirle a quien lee el
   * log **qué variable setear**. Un `sin-credencial` genérico obliga a abrir el
   * código para averiguarlo.
   */
  nombreCredencial?: string;
  /** `undefined` deja el default del SDK (`api.anthropic.com`). */
  baseURL: string | undefined;
  modelo: string;
  /** Timeout de UN intento, en milisegundos. */
  timeoutMs: number;
  /** Techo del reloj de pared del que salen los dos intentos, en milisegundos. */
  techoMs: number;
  /** La garantía real de la salida: el SDK solo sugiere (ver punto 3 arriba). */
  esquema: z.ZodType<T>;
  /**
   * Bloques del system prompt. El `cache_control` lo pone este módulo.
   *
   * ⚠️ **Son funciones y no strings ya armados a propósito: así el prompt se
   * construye DENTRO del `try` de `generar()`.** Si armar el prompt lanza —ya
   * pasó, cuando el módulo era un `TODO`—, el fallo vuelve como
   * `{ ok: false }` en vez de propagarse a un `after()` donde no lo ataja nadie.
   * Recibir los strings ya construidos movería esa excepción al llamador y
   * rompería el contrato de "nunca lanza" sin que ningún tipo se queje.
   */
  construirSystem: () => string[];
  construirMensajeUsuario: () => string;
  /**
   * Si entra un segundo intento. Vive afuera porque el presupuesto es de cada
   * agente: el assessment corre dentro del `maxDuration` de una función
   * serverless, un script local no.
   */
  cabeOtroIntento(
    transcurridoMs: number,
    porIntentoMs: number,
    techoMs: number,
  ): boolean;
  /** Cola del detalle cuando el reintento no entra (ej. `maxDuration=60s`). */
  contextoPresupuesto?: string;
}

/**
 * El `output_config.format` derivado del esquema zod, memoizado **por esquema**.
 *
 * `WeakMap` y no una variable de módulo porque ahora hay más de un agente: con
 * un solo memo, el segundo esquema recibiría el formato del primero y el modelo
 * devolvería la forma del otro documento — un bug silencioso y caro. La clave es
 * el objeto esquema, así que la entrada se libera sola si el módulo se descarga.
 *
 * Se construye tarde (y una sola vez por esquema) en vez de en el tope del
 * módulo: importar esto no debería ejecutar `z.toJSONSchema` en un proceso que
 * quizá nunca llame al modelo.
 */
const formatos = new WeakMap<object, ReturnType<typeof zodOutputFormat>>();

function formatoSalida(esquema: z.ZodType): ReturnType<typeof zodOutputFormat> {
  const memo = formatos.get(esquema);
  if (memo) return memo;

  const formato = zodOutputFormat(esquema);
  formatos.set(esquema, formato);
  return formato;
}

/**
 * Los bloques del system con el `cache_control` en el ÚLTIMO.
 *
 * El breakpoint va acá y no en los módulos de prompt a propósito: ellos deciden
 * el contenido, este decide cómo se transporta. Lo que varía en cada request va
 * en el mensaje de usuario — interpolarlo en el system cambiaría el prefijo cada
 * vez y el caché no acertaría nunca, en silencio y facturando de más.
 */
function systemConCache(bloques: string[]): TextBlockParam[] | undefined {
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
type Intento<T> =
  | { clase: "ok"; salida: T }
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
 * Traduce lo que lanzó el SDK a uno de los tres desenlaces, siguiendo la
 * jerarquía de clases (`APIConnectionTimeoutError` < `APIConnectionError` <
 * `APIError` < `AnthropicError`), de lo más específico a lo más general.
 *
 * - timeout / abort → `timeout`, **sin reintento**: el presupuesto no da para
 *   dos esperas completas.
 * - `APIError` (400, 401, 429, 5xx) → tampoco se reintenta. Un 529 transitorio
 *   pierde el documento, y eso está aceptado: en el assessment el EMAIL #1 ya
 *   salió, o sea se pierde el documento y nunca el lead.
 * - `AnthropicError` que no es `APIError` → el fallo de parseo/validación del
 *   helper. **Este sí es el reintentable.**
 * - cualquier otra cosa → final. Un `TypeError` nuestro no mejora pagando otra
 *   llamada al modelo.
 *
 * ⚠️ **El `detalle` NO trae el nombre de la clase**: las clases de error del SDK
 * no setean `name`, así que un 529 sale como `"Error: 529 overloaded"`. Lo
 * accionable es el código de estado, que sí viaja.
 */
function clasificarError<T>(error: unknown): Intento<T> {
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
 * `output_config.format`. En la práctica casi nunca se ejecuta, pero es lo que
 * hace que el módulo no dependa de un detalle interno del SDK para seguir siendo
 * correcto. **Nunca lanza**: devuelve `undefined` y el llamador lo trata como
 * salida inválida.
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
 * Genera un documento estructurado. **Nunca lanza**: todos los fallos vuelven
 * como `{ ok: false }`, porque quien llama puede estar dentro de un `after()`
 * que ya respondió 200 y lo único que puede hacer con una excepción es loguearla.
 *
 * Un solo reintento, y **exclusivamente cuando la salida no valida** — no ante
 * timeout, no ante 529, no ante refusal —, y aun así condicionado al
 * presupuesto: un fallo `reintentable` ocurre *después* de que el modelo
 * respondió, así que un segundo intento completo pide el mismo tiempo otra vez.
 * Un camino de recuperación que no entra en el presupuesto se lee como una red y
 * no lo es.
 */
export async function generar<T>(
  peticion: PeticionGeneracion<T>,
): Promise<ResultadoGeneracion<T>> {
  const inicio = Date.now();

  try {
    if (!peticion.apiKey) {
      return {
        ok: false,
        motivo: "sin-credencial",
        detalle: `${peticion.nombreCredencial ?? "API key"} ausente o vacía`,
      };
    }

    /*
     * El cliente se construye acá y no en el tope del módulo por dos razones que
     * apuntan al mismo lado: importar este archivo sin credencial no debe
     * instanciar nada, y la configuración tiene que leerse en el momento de la
     * llamada.
     */
    const cliente = new Anthropic({
      apiKey: peticion.apiKey,
      baseURL: peticion.baseURL,
      timeout: peticion.timeoutMs,
      // El SDK reintenta los timeouts por su cuenta y el reloj de pared llegaría
      // a `timeout × 3`. El único reintento que existe es el de más abajo.
      maxRetries: 0,
    });

    const primero = await intentar(cliente, peticion);
    if (primero.clase === "ok") return { ok: true, salida: primero.salida };
    if (primero.clase === "final") {
      return { ok: false, motivo: primero.motivo, detalle: primero.detalle };
    }

    const transcurrido = Date.now() - inicio;
    if (
      !peticion.cabeOtroIntento(
        transcurrido,
        peticion.timeoutMs,
        peticion.techoMs,
      )
    ) {
      const contexto = peticion.contextoPresupuesto
        ? `, ${peticion.contextoPresupuesto}`
        : "";

      return {
        ok: false,
        motivo: "esquema-invalido",
        detalle: recortar(
          `1 intento inválido y el reintento no entra en el presupuesto ` +
            `(${transcurrido} ms transcurridos + ${peticion.timeoutMs} ms del intento > ` +
            `${peticion.techoMs} ms de techo${contexto}). ` +
            `#1 ${primero.detalle}`,
        ),
      };
    }

    // Mismo cuerpo: lo que cambia es el muestreo del modelo, no el pedido.
    const segundo = await intentar(cliente, peticion);
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
    /*
     * La red de seguridad del "nunca lanza": el constructor del cliente y
     * cualquier cosa que haya quedado afuera del `try` de `intentar()`.
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
async function intentar<T>(
  cliente: Anthropic,
  peticion: PeticionGeneracion<T>,
): Promise<Intento<T>> {
  let respuesta;

  try {
    /*
     * ⚠️ En `lib/assessment/cliente.ts` los parámetros iban inline para que el
     * genérico del SDK infiriera el tipo de `parsed_output` desde el literal.
     * Acá el formato llega por variable y esa inferencia se pierde — **y no
     * importa**: la salida se valida contra `peticion.esquema` unas líneas más
     * abajo, así que el tipo de `T` sale de nuestro `safeParse` y nunca de la
     * palabra del SDK. Es la misma razón por la que la validación propia corre
     * incluso cuando el helper ya validó.
     */
    respuesta = await cliente.messages.parse({
      model: peticion.modelo,
      max_tokens: MAX_TOKENS,
      system: systemConCache(peticion.construirSystem()),
      output_config: {
        effort: ESFUERZO,
        format: formatoSalida(peticion.esquema),
      },
      messages: [{ role: "user", content: peticion.construirMensajeUsuario() }],
    });
  } catch (error) {
    return clasificarError<T>(error);
  }

  if (respuesta.stop_reason === "refusal") {
    return {
      clase: "final",
      motivo: "rechazo",
      detalle: describirRechazo(respuesta.stop_details),
    };
  }

  const crudo = respuesta.parsed_output ?? jsonDelTexto(respuesta.content);

  /*
   * Se valida SIEMPRE, incluso cuando vino por `parsed_output` y el helper del
   * SDK ya corrió el mismo esquema. No es redundancia defensiva: es lo que hace
   * converger los dos caminos —Claude con `output_config.format`, y el shim del
   * modelo local que puede ignorarlo y caer al texto plano— en un único
   * contrato.
   */
  const validado = peticion.esquema.safeParse(crudo);
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
