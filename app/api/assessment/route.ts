import { after } from "next/server";
import { z } from "zod";

import { site } from "@/content/site";
import { calificar } from "@/lib/assessment/calificacion";
import { generarPreDiagnostico } from "@/lib/assessment/cliente";
import { renderPreDiagnostico } from "@/lib/assessment/render";
import { enviarPreDiagnostico } from "@/lib/email";
import {
  honeypotField,
  leadAssessmentSchema,
  normalizarLead,
  type RespuestaAssessment,
} from "@/lib/leads";
import { procesarLead } from "@/lib/procesar-lead";
import {
  CLAVE_GLOBAL,
  consumirCon,
  identificarCliente,
  LIMITE_ASSESSMENT,
  LIMITE_MODELO_GLOBAL,
} from "@/lib/rate-limit";

/**
 * `POST /api/assessment` — recibe el formulario largo de `/assessment`,
 * notifica el lead y, si califica, genera el pre-diagnóstico después de haber
 * respondido.
 *
 * Es hermano de `/api/contacto` y sigue sus mismas reglas —la validación del
 * cliente no se cree nunca, el rate limit corta antes de leer el body, el
 * detalle de cualquier error queda en el log del servidor— con tres diferencias
 * que vienen del §11 y el §12 del plan de Fase 2:
 *
 * 1. **Una request acá cuesta un email más tokens pagos**, así que tiene balde
 *    propio y mucho más angosto (`LIMITE_ASSESSMENT`).
 * 2. **La llamada al modelo no está en el camino de la respuesta.** Corre en
 *    `after()`: quien completó quince campos recibe su confirmación al instante
 *    en vez de mirar un spinner ~35 s.
 * 3. **La puerta del §8 vive acá.** Un lead que no califica no ve el Calendly y
 *    no gasta un token — pero su EMAIL #1 con las respuestas crudas sale igual,
 *    que es lo que impide que la supresión se vuelva silenciosa.
 */

/** Resend y el SDK de Anthropic usan APIs de Node: esto no corre en el edge. */
export const runtime = "nodejs";

/**
 * Techo de ejecución de la función, en segundos.
 *
 * 🛑 **Tiene que ser un literal, y eso NO es un descuido.** Lo natural sería
 * `export const maxDuration = MAX_DURATION_SEGUNDOS`, porque este techo y el
 * timeout de `cliente.ts` son dos valores que **no pueden divergir en silencio**:
 * si el timeout del cliente iguala o supera este número, la plataforma mata la
 * función antes de que dispare el nuestro y se pierde el camino de error limpio
 * (el `motivo: "timeout"`, el log con el detalle y la certeza de que el EMAIL #1
 * ya salió).
 *
 * **Pero Next 16.2.11 rechaza la constante importada.** Verificado con el build,
 * no con el bundle: `next build` corta con *"Invalid segment configuration export
 * detected"* y el mismo archivo compila apenas se reemplaza por el literal. La
 * config de segmento se analiza de forma estática, así que un identificador
 * importado no llega a valor.
 *
 * **Lo que mantiene la garantía es un test**, no el sistema de tipos:
 * `route.test.ts` afirma que este literal es igual a `MAX_DURATION_SEGUNDOS`. Si
 * alguien cambia el presupuesto y se olvida de este número, la suite se pone en
 * rojo. Es la red que el `import` iba a dar y que el framework no permite.
 *
 * ⚠️ `after()` **no escapa a este techo**: el doc de Next es explícito en que la
 * tarea corre dentro del `maxDuration` configurado de la ruta. Mueve la latencia
 * percibida, no el límite.
 */
export const maxDuration = 60;

function responder(
  cuerpo: RespuestaAssessment,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(cuerpo, { status, headers });
}

/** ¿Es un objeto JSON plano? Un array o un `null` no sirven como payload. */
function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Techo del body. El payload más grande que el esquema admite son ~3.400
 * caracteres de texto libre (dos campos de 1.500, más `sistemasActuales` y
 * `sponsor`) que en UTF-8 con acentos no pasan de ~8 KB con el JSON incluido.
 * 32 KB deja margen de sobra sin dejar que un POST arbitrario nos haga
 * bufferizar megabytes.
 */
const MAX_BYTES_BODY = 32 * 1024;

/**
 * Claves de error que nunca se le devuelven al cliente por campo. Mismo
 * criterio que en `/api/contacto`: `website` es el honeypot (reportarlo le
 * confirma al bot que existe) y `tipo` es el discriminante de la unión, no un
 * control del formulario.
 */
const NO_REPORTABLES = new Set<string>([honeypotField, "tipo"]);

/** Mensaje genérico: nunca expone qué falló adentro. */
const ERROR_GENERICO =
  "No pudimos procesar tus respuestas. Revisa los datos e intenta de nuevo.";

/**
 * Rechaza POSTs cross-origin hechos desde el navegador.
 *
 * Igual que en `/api/contacto`, y duplicado a propósito: cada route es dueño de
 * su superficie HTTP y el de contacto está en producción hace un mes. Unificar
 * los helpers es un refactor de los dos endpoints, no parte de cablear este.
 */
function esMismoOrigen(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!esMismoOrigen(request)) {
    return responder({ ok: false, error: "Solicitud rechazada." }, 403);
  }

  // Antes de leer el body. Acá pesa más que en contacto: una request procesada
  // gasta un email **y** tokens pagos, así que si solo se contaran las válidas,
  // floodear con basura saldría gratis y nos dejaría pagando el resto.
  const limite = consumirCon(LIMITE_ASSESSMENT, identificarCliente(request));
  if (!limite.permitido) {
    return responder(
      {
        ok: false,
        error:
          "Ya recibimos tu solicitud hace poco. Si necesitas corregir algo, escríbenos y lo vemos.",
      },
      429,
      { "Retry-After": String(limite.reintentarEnSegundos) },
    );
  }

  const largo = Number(request.headers.get("content-length"));
  if (Number.isFinite(largo) && largo > MAX_BYTES_BODY) {
    return responder({ ok: false, error: "La solicitud es demasiado grande." }, 413);
  }

  // 1. Body defensivo: JSON roto o payload que no es objeto → 400, nunca 500.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return responder(
      { ok: false, error: "No pudimos leer el formulario. Intenta de nuevo." },
      400,
    );
  }

  if (!esObjetoPlano(body)) {
    return responder(
      { ok: false, error: "No pudimos leer el formulario. Intenta de nuevo." },
      400,
    );
  }

  // 2. Honeypot: si vino con contenido es un bot. Se le devuelve éxito para no
  //    darle señal de que lo detectamos, pero no se procesa ni se envía nada —
  //    y `calificado: false`, para no regalarle la agenda a un bot.
  //    Este es el ÚNICO lugar donde se juzga la trampa: el esquema la acepta
  //    con cualquier valor para no bloquear nunca el envío desde el cliente
  //    (un gestor de contraseñas rellenando `website` dejaría el botón sin
  //    hacer nada, que es un bug que este proyecto ya tuvo).
  const trampa = body[honeypotField];
  if (trampa !== undefined && trampa !== null && String(trampa).trim() !== "") {
    return responder({ ok: true, calificado: false }, 200);
  }

  // 3. Validación en el servidor contra la fuente de verdad compartida.
  const analisis = leadAssessmentSchema.safeParse(body);
  if (!analisis.success) {
    const { fieldErrors } = z.flattenError(analisis.error);
    const campos: Record<string, string[]> = {};
    for (const [clave, mensajes] of Object.entries(fieldErrors)) {
      if (NO_REPORTABLES.has(clave)) continue;
      if (mensajes && mensajes.length > 0) campos[clave] = mensajes;
    }

    // Sin ningún campo que marcar, "revisa los campos marcados" deja a la
    // persona sin nada que corregir. Ahí conviene el genérico.
    if (Object.keys(campos).length === 0) {
      return responder({ ok: false, error: ERROR_GENERICO }, 400);
    }

    return responder(
      { ok: false, error: "Revisa los campos marcados.", campos },
      400,
    );
  }

  // 4. Normalización + flujo. `procesarLead` calcula la calificación y manda el
  //    EMAIL #1 con las respuestas crudas; acá solo se traduce a HTTP.
  const lead = normalizarLead(analisis.data, new Date());
  const resultado = await procesarLead(lead);

  /*
   * Estrechamiento, no validación: `leadAssessmentSchema` solo puede producir
   * un lead de assessment y `procesarLead` despacha por el mismo discriminante,
   * así que esta rama es inalcanzable. Existe para que TypeScript deje leer
   * `resultado.calificado` y para pasarle a `generarPreDiagnostico` un
   * `LeadAssessmentNormalizado` sin un cast que mienta.
   */
  if (lead.tipo !== "assessment" || resultado.tipo !== "assessment") {
    console.error(
      `[assessment] tipo inesperado tras normalizar (lead: ${lead.tipo}, resultado: ${resultado.tipo})`,
    );
    return responder({ ok: false, error: ERROR_GENERICO }, 500);
  }

  const { envio, calificado } = resultado;

  if (!envio.ok) {
    // El detalle (incluida cualquier respuesta de Resend) queda solo en el log.
    console.error(`[assessment] envío fallido (${envio.motivo}): ${envio.detalle}`);

    if (envio.motivo === "sin-configurar") {
      return responder(
        {
          ok: false,
          // El email público del sitio, nunca el destinatario real del entorno.
          error: `El envío automático no está disponible por ahora. Escríbenos directo a ${site.email} y te respondemos igual.`,
        },
        503,
      );
    }

    return responder(
      {
        ok: false,
        error:
          "No pudimos enviar tus respuestas en este momento. Intenta de nuevo en unos minutos.",
      },
      502,
    );
  }

  // Solo el id del envío: es lo que permite rastrear un email perdido en el
  // panel de Resend. Nada del lead va al log.
  console.info(`[assessment] EMAIL #1 ok (id: ${envio.id ?? "sin id"})`);

  /*
   * 5. 🛑 **La puerta del §8, y vive únicamente acá.**
   *
   * `generarPreDiagnostico()` NO la lleva adentro: no hay ningún `if` de
   * calificación en `cliente.ts`. Llamarla sin este chequeo gastaría tokens en
   * un lead que Daniela decidió no atender y reintroduciría el gasto que la
   * decisión del 2026-08-09 suprime. Si alguien mueve esta condición, no hay
   * ninguna capa debajo que la vuelva a aplicar.
   *
   * El flag que decide es `resultado.calificado`, calculado una sola vez dentro
   * de `procesarLead` — el mismo booleano que viaja en la respuesta HTTP. Así
   * es imposible que la agenda y el diagnóstico se contradigan sobre un lead.
   */
  /*
   * 5b. El tope GLOBAL de llamadas al modelo.
   *
   * Va después de la puerta del §8 y antes de agendar el `after()`: no tiene
   * sentido reservar trabajo que vamos a descartar.
   *
   * 🛑 **Cuando este balde se agota, la respuesta HTTP NO cambia.** Quien
   * completó el formulario no hizo nada malo: recibe su `ok`, su Calendly si
   * corresponde, y su EMAIL #1 ya salió. Castigarlo por una condición global
   * —que puede haber causado otra persona— sería trasladarle a un lead legítimo
   * el costo de un abuso ajeno. Lo único que se suprime es el documento.
   *
   * Y se loguea como `warn`, no como `error`: esto es una supresión deliberada
   * que funcionó, no una falla. Mezclarla con los errores reales del `after()`
   * entrena a ignorar la única línea de diagnóstico que tiene este camino.
   */
  const cupoModelo = calificado
    ? consumirCon(LIMITE_MODELO_GLOBAL, CLAVE_GLOBAL)
    : null;

  if (calificado && cupoModelo && !cupoModelo.permitido) {
    console.warn(
      `[assessment] tope global de llamadas al modelo alcanzado ` +
        `(${LIMITE_MODELO_GLOBAL.max}/hora). Se omite el pre-diagnóstico; ` +
        `el EMAIL #1 con las respuestas ya salió.`,
    );
  }

  if (calificado && cupoModelo?.permitido) {
    after(async () => {
      /*
       * Nadie está esperando esto: es un correo a Daniela, no algo que la
       * persona vea. Si falla, la request ya respondió `ok` y está bien — el
       * EMAIL #1 salió antes de tocar el modelo (§11), así que se pierde el
       * documento, nunca el lead. El log es el único lugar donde eso se nota,
       * y en Vercel es el atajo de diagnóstico.
       */
      const generacion = await generarPreDiagnostico(lead);
      if (!generacion.ok) {
        console.error(
          `[assessment] pre-diagnóstico fallido (${generacion.motivo}): ${generacion.detalle}`,
        );
        return;
      }

      /*
       * `calificar(lead)` se recalcula acá y no se arrastra desde
       * `procesarLead`: `ResultadoProceso` expone un booleano y **nunca la
       * `Calificacion`**, para que el criterio comercial no tenga forma de
       * llegar al navegador desde una capa que también sirve la respuesta.
       *
       * Recalcularlo es seguro y no contradice al §11: es una función pura
       * sobre tres enums del mismo lead inmutable. Lo que el §11 prohíbe es que
       * la *decisión* tenga dos fuentes — y la decisión la tomó el `if` de
       * arriba con `resultado.calificado`. Este valor solo imprime las líneas
       * auditables de la §8 del documento; no decide nada.
       */
      const documento = renderPreDiagnostico(lead, generacion.salida, calificar(lead));

      const envioDoc = await enviarPreDiagnostico(lead, documento);
      if (!envioDoc.ok) {
        console.error(
          `[assessment] EMAIL #2 fallido (${envioDoc.motivo}): ${envioDoc.detalle}`,
        );
        return;
      }

      console.info(`[assessment] EMAIL #2 ok (id: ${envioDoc.id ?? "sin id"})`);
    });
  } else {
    // Sin esta línea, la supresión sería indistinguible de una falla del
    // modelo: en los dos casos no llega el EMAIL #2 y no hay nada más que ver.
    console.info("[assessment] lead no calificado: sin pre-diagnóstico (§8)");
  }

  // 6. La respuesta sale ya, sin esperar al modelo. `calificado` es lo único
  //    que decide si la confirmación muestra el Calendly; el motivo del
  //    descarte es criterio comercial interno y no viaja al navegador.
  return responder({ ok: true, calificado }, 200);
}
