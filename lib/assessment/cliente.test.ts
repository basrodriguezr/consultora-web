import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SalidaAssessment } from "@/lib/assessment/esquema";
import type { LeadAssessmentNormalizado } from "@/lib/leads";

/**
 * Tests del cliente del modelo.
 *
 * 🛑 **Ningún test gasta un token** (§16 del plan): el SDK está mockeado entero
 * y `messages.parse` es un `vi.fn()`. Si algún día uno de estos tests tarda
 * segundos, es porque alguien rompió el mock y está pegándole a la API.
 *
 * Lo que se cubre es lo que el paso 7 va a asumir sin poder verificarlo: cuántas
 * veces se llama al modelo en cada modo de falla, y que la función **nunca
 * lanza** — corre dentro de un `after()`, donde una excepción no la atrapa
 * nadie.
 */

const { parseMock, constructorMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
  constructorMock: vi.fn(),
}));

/**
 * Se reemplaza SOLO el default export (la clase cliente). Las clases de error se
 * dejan reales con `importOriginal`: la clasificación de fallos de `cliente.ts`
 * es a base de `instanceof`, así que mockearlas convertiría el test en una
 * tautología sobre dobles en vez de una prueba sobre la jerarquía del SDK.
 */
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const real = await importOriginal<typeof import("@anthropic-ai/sdk")>();

  class ClienteFalso {
    messages = { parse: parseMock };
    constructor(opciones: unknown) {
      constructorMock(opciones);
    }
  }

  return { ...real, default: ClienteFalso };
});

/**
 * `prompt.ts` lo implementa otro agente en paralelo y hoy lanza `TODO`. Se
 * mockea para aislar el cliente: lo que se prueba acá es el transporte y el
 * manejo de fallos, no el contenido del prompt.
 */
vi.mock("@/lib/assessment/prompt", () => ({
  construirSystem: () => ["rol y encuadre", "catálogo y reglas"],
  construirMensajeUsuario: () => "respuestas del lead",
  CATALOGO_FUENTE: [],
}));

const { APIConnectionTimeoutError, AnthropicError, InternalServerError } =
  await import("@anthropic-ai/sdk");

const { generarPreDiagnostico, MODELO_POR_DEFECTO, TIMEOUT_POR_DEFECTO_MS } =
  await import("@/lib/assessment/cliente");

const { MAX_DURATION_SEGUNDOS, PRESUPUESTO_MODELO_MS, RESERVA_MS } =
  await import("@/lib/assessment/presupuesto");

const VARIABLES = [
  "ANTHROPIC_API_KEY",
  "ASSESSMENT_BASE_URL",
  "ASSESSMENT_MODELO",
  "ASSESSMENT_TIMEOUT_MS",
] as const;

const originales = new Map(
  VARIABLES.map((clave) => [clave, process.env[clave]] as const),
);

beforeEach(() => {
  vi.clearAllMocks();
  for (const clave of VARIABLES) delete process.env[clave];
  process.env.ANTHROPIC_API_KEY = "sk-test-no-se-usa";
});

afterEach(() => {
  for (const [clave, valor] of originales) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

function lead(): LeadAssessmentNormalizado {
  return {
    tipo: "assessment",
    nombre: "Ana Pérez",
    email: "ana@acme.cl",
    empresa: "Acme SpA",
    problemaPrincipal: "Los reportes mensuales se arman a mano y tardan días.",
    solucionActual: "Planillas Excel que consolida una persona.",
    fuentesDatos: ["erp", "planillas-excel"],
    equipoDatos: "parcial",
    personasConDatos: 4,
    cloud: "aws",
    presupuesto: "asignado",
    urgencia: "alta",
    horasSemanaProceso: "15-40",
    recibidoEn: "2026-08-09T12:00:00.000Z",
  };
}

/** Una salida que sí valida `salidaAssessmentSchema` de punta a punta. */
function salidaValida(): SalidaAssessment {
  return {
    resumen:
      "La consolidación mensual de reportes se hace a mano y depende de una sola persona. Lo primero sería centralizar la fuente de ventas y automatizar el reporte.",
    nivelMadurez: 2,
    dimensiones: [
      { clave: "completitud", nivel: null, evidencia: null, impacto: "Reportes incompletos." },
      { clave: "unicidad", nivel: 1, evidencia: "Mencionan clientes repetidos.", impacto: "Doble conteo." },
      { clave: "consistencia", nivel: null, evidencia: null, impacto: "Cifras que no cuadran." },
      { clave: "vigencia", nivel: null, evidencia: null, impacto: "Se decide con datos de ayer." },
    ],
    hipotesisCausaRaiz: "Sin una fuente única, cada área mantiene su propia copia.",
    procesosManuales: [
      { proceso: "Consolidación mensual", impactoOperativo: "Tres días de una persona." },
    ],
    riesgos: [
      { titulo: "Dependencia de una persona", severidad: "alta", impactoNegocio: "Si se va, nadie sabe rehacer el reporte." },
      { titulo: "Errores de tipeo", severidad: "media", impactoNegocio: "Se decide sobre cifras equivocadas." },
    ],
    quickWins: [
      { accion: "Centralizar la fuente de ventas", esfuerzo: "1 semana", impacto: "Elimina la reconciliación manual.", fraccionHorasLiberadas: 0.3 },
      { accion: "Automatizar el reporte mensual", esfuerzo: "2 semanas", impacto: "Libera tres días al mes.", fraccionHorasLiberadas: 0.2 },
      { accion: "Validaciones en la carga", esfuerzo: "3 días", impacto: "Corta los errores de tipeo.", fraccionHorasLiberadas: null },
    ],
    servicioRecomendado: "quick-win",
    justificacionServicio: "El dolor está acotado y se resuelve en semanas.",
    preguntasDiscovery: [
      "¿El ERP expone una API o solo permite exportar archivos?",
      "¿Cuántos registros duplicados hay en la base de clientes?",
      "¿Quién es hoy el dueño del dato de ventas?",
    ],
    senalesDeAlerta: [],
  };
}

/** Respuesta con `parsed_output`, que es el camino de Claude. */
function respuestaOk(salida: unknown = salidaValida()) {
  return {
    stop_reason: "end_turn",
    stop_details: null,
    content: [{ type: "text", text: JSON.stringify(salida) }],
    parsed_output: salida,
  };
}

describe("generarPreDiagnostico — credencial", () => {
  it("sin ANTHROPIC_API_KEY devuelve sin-credencial y no instancia el cliente", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const r = await generarPreDiagnostico(lead());

    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toBe("sin-credencial");
    expect(constructorMock).not.toHaveBeenCalled();
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("una variable vacía cuenta como ausente (convención de lib/env.ts)", async () => {
    process.env.ANTHROPIC_API_KEY = "   ";

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("sin-credencial");
    expect(constructorMock).not.toHaveBeenCalled();
  });
});

describe("generarPreDiagnostico — camino feliz", () => {
  it("una salida válida al primer intento llama una sola vez", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    const r = await generarPreDiagnostico(lead());

    expect(r.ok).toBe(true);
    expect(r.ok === true && r.salida.servicioRecomendado).toBe("quick-win");
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("valida con safeParse aunque venga por parsed_output: un parsed_output mentiroso no pasa", async () => {
    // El helper del SDK ya validó, pero el shim del modelo local podría no
    // hacerlo. La autoridad es nuestro safeParse, no la palabra del SDK.
    parseMock.mockResolvedValue({
      ...respuestaOk(),
      parsed_output: { resumen: "muy corto" },
    });

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("esquema-invalido");
  });

  it("cae al texto plano cuando parsed_output es null (shim sin output_config.format)", async () => {
    parseMock.mockResolvedValueOnce({
      stop_reason: "end_turn",
      stop_details: null,
      content: [
        { type: "thinking", thinking: "…", signature: "x" },
        { type: "text", text: JSON.stringify(salidaValida()) },
      ],
      parsed_output: null,
    });

    const r = await generarPreDiagnostico(lead());

    expect(r.ok).toBe(true);
    expect(parseMock).toHaveBeenCalledTimes(1);
  });
});

describe("generarPreDiagnostico — el único reintento", () => {
  /**
   * ⏱️ **El reintento está condicionado al presupuesto de tiempo, así que estos
   * tests tienen que declarar uno donde quepa.**
   *
   * Con los valores de producción no cabe **nunca**: el intento consume el
   * presupuesto entero (52 s de techo contra ~35 s medidos en la calibración), y
   * un segundo intento completo moriría cortado por la plataforma. Setear
   * `ASSESSMENT_TIMEOUT_MS` es lo que hace un desarrollador contra el modelo
   * local — está fuera del reloj de Vercel — y con eso el techo pasa a ser dos
   * intentos de ese tamaño (ver `presupuestoDeTiempo` en `cliente.ts`).
   *
   * El caso de producción tiene su propio test más abajo.
   */
  beforeEach(() => {
    process.env.ASSESSMENT_TIMEOUT_MS = "1000";
  });

  it("inválida y después válida: dos llamadas y ok", async () => {
    parseMock
      .mockResolvedValueOnce(respuestaOk({ resumen: "corto" }))
      .mockResolvedValueOnce(respuestaOk());

    const r = await generarPreDiagnostico(lead());

    expect(r.ok).toBe(true);
    expect(parseMock).toHaveBeenCalledTimes(2);
  });

  it("inválida dos veces: esquema-invalido y exactamente dos llamadas, no tres", async () => {
    parseMock.mockResolvedValue(respuestaOk({ resumen: "corto" }));

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("esquema-invalido");
    expect(parseMock).toHaveBeenCalledTimes(2);
  });

  it("el AnthropicError que lanza messages.parse() cuenta como esquema inválido y se reintenta", async () => {
    // Descubrimiento contra el bundle 0.117.1: parse() LANZA cuando la salida
    // no valida; no devuelve parsed_output: null como decía el §15b.
    parseMock
      .mockRejectedValueOnce(
        new AnthropicError("Failed to parse structured output: too_small"),
      )
      .mockResolvedValueOnce(respuestaOk());

    const r = await generarPreDiagnostico(lead());

    expect(r.ok).toBe(true);
    expect(parseMock).toHaveBeenCalledTimes(2);
  });
});

describe("generarPreDiagnostico — el reintento consciente del presupuesto", () => {
  /**
   * El defecto que esto cierra: el reintento del §15b **no podía correr en
   * producción y nadie lo notaba**. Un fallo `reintentable` (parseo/validación)
   * ocurre *después* de que el modelo respondió —35,7 s y 29,1 s medidos en la
   * calibración—, así que un segundo intento completo pedía otros ~35 s y la
   * plataforma mataba la función a mitad de camino: sin documento y sin el log
   * limpio del timeout.
   *
   * Ahora la llamada no se gasta. **Y el fallo sigue saliendo con el motivo que
   * corresponde** (`esquema-invalido`, que es lo que efectivamente pasó), con el
   * detalle diciendo por qué no hubo segundo intento.
   */
  it("un intento que consumió el reloj no gasta el reintento: una sola llamada", async () => {
    // Los 35,7 s medidos en la calibración. `Date.now()` se llama exactamente
    // dos veces por invocación (el inicio y el corte antes del reintento), así
    // que la secuencia describe un primer intento que tardó lo que tarda de
    // verdad, sin que el test espere un solo milisegundo.
    const reloj = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(35_700);
    parseMock.mockResolvedValue(respuestaOk({ resumen: "corto" }));

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("esquema-invalido");
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(r.ok === false && r.detalle).toContain("no entra en el presupuesto");

    reloj.mockRestore();
  });

  /**
   * 🛑 **Y con los valores de producción tampoco entra un fallo rápido.** El
   * intento por defecto vale el presupuesto entero (52 s de 52 s), así que
   * cualquier tiempo transcurrido mayor que cero deja el reintento afuera: en
   * producción el camino existe pero **no se recorre nunca**.
   *
   * Este test afirma esa consecuencia en vez de dejarla implícita en la
   * aritmética. Es información para `/arquitecto`, no una preferencia: si algún
   * día se quiere un reintento real en producción, hay que **bajar el timeout
   * por intento** (o subir `MAX_DURATION_SEGUNDOS`), y ese día este test cambia
   * y se ve en el diff. Lo que no puede volver a pasar es lo de antes: un
   * reintento que se lee como red, se paga en tokens y muere cortado.
   */
  it("con los valores de producción ni siquiera un fallo rápido deja lugar al reintento", async () => {
    const reloj = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(900);
    parseMock.mockResolvedValue(respuestaOk({ resumen: "corto" }));

    const r = await generarPreDiagnostico(lead());

    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(r.ok === false && r.detalle).toContain("no entra en el presupuesto");

    reloj.mockRestore();
  });

  /**
   * Un camino de recuperación que no cabe en el presupuesto se lee como una red
   * y no lo es. Este test es el que impide que vuelva a serlo en silencio: si
   * alguien sube `MAX_DURATION_SEGUNDOS` o baja el timeout por intento, el
   * reintento se vuelve alcanzable y **es una decisión que se ve en el diff**.
   */
  it("el timeout por intento es estrictamente menor que maxDuration", () => {
    expect(TIMEOUT_POR_DEFECTO_MS).toBe(PRESUPUESTO_MODELO_MS);
    expect(TIMEOUT_POR_DEFECTO_MS).toBeLessThan(MAX_DURATION_SEGUNDOS * 1_000);
    // Y el margen que queda es exactamente la reserva del render + EMAIL #2.
    expect(MAX_DURATION_SEGUNDOS * 1_000 - TIMEOUT_POR_DEFECTO_MS).toBe(RESERVA_MS);
  });
});

describe("generarPreDiagnostico — fallos que no se reintentan", () => {
  it("stop_reason refusal devuelve rechazo con una sola llamada", async () => {
    parseMock.mockResolvedValue({
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "general_harms", explanation: null },
      // HTTP 200 con content vacío: leer content[0] acá reventaría.
      content: [],
      parsed_output: null,
    });

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("rechazo");
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("timeout devuelve timeout sin reintentar", async () => {
    parseMock.mockRejectedValue(new APIConnectionTimeoutError({}));

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("timeout");
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("un 5xx no se reintenta: se pierde el documento, nunca el lead", async () => {
    parseMock.mockRejectedValue(
      new InternalServerError(529, undefined, "overloaded", new Headers()),
    );

    const r = await generarPreDiagnostico(lead());

    expect(r.ok).toBe(false);
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  // Un 529 es del proveedor y NO tiene que leerse como un problema del prompt:
  // logueado como `esquema-invalido` mandaría a quien depure al único lugar donde
  // el problema no está. Es la lección del 502/503 del formulario de contacto.
  it("un 5xx se clasifica como error-api, no como esquema-invalido", async () => {
    parseMock.mockRejectedValue(
      new InternalServerError(529, undefined, "overloaded", new Headers()),
    );

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("error-api");
    // El código de estado es lo accionable: 429 se espera y se reintenta más
    // tarde, 400 es nuestro y 529 es del proveedor. Se afirma el 529 y no el
    // nombre de la clase a propósito — ver el comentario de `describir()`.
    expect(r.ok === false && r.detalle).toContain("529");
  });
});

describe("generarPreDiagnostico — nunca lanza", () => {
  it("un error cualquiera del SDK vuelve como { ok: false }", async () => {
    parseMock.mockRejectedValue(new TypeError("algo raro"));

    await expect(generarPreDiagnostico(lead())).resolves.toMatchObject({
      ok: false,
    });
  });

  // Un bug nuestro no es ni el proveedor ni el prompt: tercer destino, tercer
  // nombre. El motivo es lo que decide dónde mira quien lee el log.
  it("un error nuestro se clasifica como error-interno", async () => {
    parseMock.mockRejectedValue(new TypeError("algo raro"));

    const r = await generarPreDiagnostico(lead());

    expect(r.ok === false && r.motivo).toBe("error-interno");
  });

  it("un throw que no es Error tampoco escapa", async () => {
    parseMock.mockRejectedValue("string pelado");

    await expect(generarPreDiagnostico(lead())).resolves.toMatchObject({
      ok: false,
    });
  });

  it("una respuesta sin la forma esperada tampoco escapa", async () => {
    parseMock.mockResolvedValue(null);

    await expect(generarPreDiagnostico(lead())).resolves.toMatchObject({
      ok: false,
    });
  });
});

describe("generarPreDiagnostico — configuración del cliente", () => {
  it("maxRetries es 0: el SDK no puede triplicar el reloj de pared", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    expect(constructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0 }),
    );
  });

  it("sin ASSESSMENT_TIMEOUT_MS el timeout es el default, en milisegundos", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    expect(constructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: TIMEOUT_POR_DEFECTO_MS }),
    );
  });

  it("con ASSESSMENT_TIMEOUT_MS seteada, ese valor manda", async () => {
    process.env.ASSESSMENT_TIMEOUT_MS = "90000";
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    expect(constructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 90_000 }),
    );
  });

  it("un ASSESSMENT_TIMEOUT_MS no numérico cae al default en vez de mandar NaN", async () => {
    process.env.ASSESSMENT_TIMEOUT_MS = "un-minuto";
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    expect(constructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: TIMEOUT_POR_DEFECTO_MS }),
    );
  });

  it("sin ASSESSMENT_BASE_URL queda undefined: el default del SDK es api.anthropic.com", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    expect(constructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: undefined }),
    );
  });

  it("ASSESSMENT_BASE_URL apunta el mismo SDK al modelo local", async () => {
    process.env.ASSESSMENT_BASE_URL = "https://ia.codebass.org";
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    expect(constructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://ia.codebass.org" }),
    );
  });
});

describe("generarPreDiagnostico — el request", () => {
  it("manda el modelo por defecto, y ASSESSMENT_MODELO lo pisa", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());
    await generarPreDiagnostico(lead());
    expect(parseMock.mock.calls[0]?.[0]).toMatchObject({
      model: MODELO_POR_DEFECTO,
    });

    process.env.ASSESSMENT_MODELO = "qwen3-coder-30b";
    parseMock.mockResolvedValueOnce(respuestaOk());
    await generarPreDiagnostico(lead());
    expect(parseMock.mock.calls[1]?.[0]).toMatchObject({
      model: "qwen3-coder-30b",
    });
  });

  it("el cache_control va en el ÚLTIMO bloque de system y en ninguno más", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    const system = parseMock.mock.calls[0]?.[0]?.system as Array<
      Record<string, unknown>
    >;
    expect(system).toHaveLength(2);
    expect(system[0]?.cache_control).toBeUndefined();
    expect(system[1]?.cache_control).toEqual({ type: "ephemeral" });
  });

  it("las respuestas del lead van en el mensaje de usuario, nunca en el system", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    const enviado = parseMock.mock.calls[0]?.[0];
    expect(enviado.messages).toEqual([
      { role: "user", content: "respuestas del lead" },
    ]);
    expect(JSON.stringify(enviado.system)).not.toContain("respuestas del lead");
  });

  it("no manda temperature, top_p, top_k ni thinking: los cuatro dan 400 en claude-opus-5", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    const enviado = parseMock.mock.calls[0]?.[0];
    expect(enviado).not.toHaveProperty("temperature");
    expect(enviado).not.toHaveProperty("top_p");
    expect(enviado).not.toHaveProperty("top_k");
    expect(enviado).not.toHaveProperty("thinking");
  });

  it("manda output_config con effort low y un json_schema derivado del zod", async () => {
    parseMock.mockResolvedValueOnce(respuestaOk());

    await generarPreDiagnostico(lead());

    const config = parseMock.mock.calls[0]?.[0]?.output_config;
    expect(config.effort).toBe("low");
    expect(config.format.type).toBe("json_schema");
    expect(config.format.schema).toHaveProperty("properties.resumen");
    expect(parseMock.mock.calls[0]?.[0]?.max_tokens).toBe(8000);
  });
});
