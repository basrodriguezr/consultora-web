import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EntradaPropuestaNormalizada } from "@/lib/propuesta/entrada";
import { salidaPropuestaSchema } from "@/lib/propuesta/esquema";

/**
 * Tests del adaptador de propuestas. **No prueban el transporte**: eso ya está
 * cubierto por las 30 pruebas de `lib/assessment/cliente.test.ts`, que corren
 * contra el mismo `lib/modelo/cliente.ts` con el SDK mockeado.
 *
 * Lo que se prueba acá es lo único que este archivo decide y que puede estar mal
 * sin que nada falle: **qué esquema, qué prompt y qué env vars.** Un adaptador
 * que le pasa el esquema del assessment al modelo devuelve un documento con la
 * forma equivocada; un `ASSESSMENT_TIMEOUT_MS` copiado por inercia haría que la
 * propuesta cambie de timeout cuando alguien configura el otro agente.
 *
 * 🛑 Ningún test gasta un token: se mockea `generar` y se inspecciona la
 * petición.
 */

const { generarMock } = vi.hoisted(() => ({ generarMock: vi.fn() }));

vi.mock("@/lib/modelo/cliente", () => ({
  generar: generarMock,
}));

const { generarPropuesta, MODELO_POR_DEFECTO, TIMEOUT_POR_DEFECTO_MS } =
  await import("@/lib/propuesta/cliente");

const VARIABLES = [
  "ANTHROPIC_API_KEY",
  "PROPUESTA_BASE_URL",
  "PROPUESTA_MODELO",
  "PROPUESTA_TIMEOUT_MS",
  "ASSESSMENT_TIMEOUT_MS",
] as const;

const originales = new Map(
  VARIABLES.map((clave) => [clave, process.env[clave]] as const),
);

beforeEach(() => {
  vi.clearAllMocks();
  generarMock.mockResolvedValue({ ok: false, motivo: "timeout", detalle: "—" });
  for (const clave of VARIABLES) delete process.env[clave];
  process.env.ANTHROPIC_API_KEY = "sk-test-no-se-usa";
});

afterEach(() => {
  for (const [clave, valor] of originales) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

function entrada(): EntradaPropuestaNormalizada {
  return {
    empresa: "Distribuidora del Sur",
    notas: "PROBLEMA: los reportes se arman a mano y nunca cuadran.",
    preparadaEn: "2026-09-04T12:00:00.000Z",
  };
}

/** La petición con la que se llamó al transporte. */
function peticion() {
  return generarMock.mock.calls[0]?.[0];
}

describe("generarPropuesta — lo que le pasa al transporte", () => {
  it("manda el esquema de la propuesta, no el del assessment", async () => {
    await generarPropuesta(entrada());

    expect(peticion().esquema).toBe(salidaPropuestaSchema);
  });

  it("construye el prompt de la propuesta, con la entrada adentro", async () => {
    await generarPropuesta(entrada());

    // Son funciones y no strings a propósito: así el prompt se arma dentro del
    // `try` de `generar()` y una excepción no escapa al llamador.
    expect(typeof peticion().construirSystem).toBe("function");
    expect(peticion().construirMensajeUsuario()).toContain(
      "Distribuidora del Sur",
    );
  });

  it("usa el modelo por defecto, y PROPUESTA_MODELO lo pisa", async () => {
    await generarPropuesta(entrada());
    expect(peticion().modelo).toBe(MODELO_POR_DEFECTO);

    process.env.PROPUESTA_MODELO = "qwen3-coder-30b";
    generarMock.mockClear();
    await generarPropuesta(entrada());
    expect(peticion().modelo).toBe("qwen3-coder-30b");
  });

  it("no lo configura ninguna variable del assessment", async () => {
    process.env.ASSESSMENT_TIMEOUT_MS = "1000";

    await generarPropuesta(entrada());

    expect(peticion().timeoutMs).toBe(TIMEOUT_POR_DEFECTO_MS);
  });

  it("PROPUESTA_TIMEOUT_MS manda, y un valor no numérico cae al default", async () => {
    process.env.PROPUESTA_TIMEOUT_MS = "90000";
    await generarPropuesta(entrada());
    expect(peticion().timeoutMs).toBe(90_000);

    process.env.PROPUESTA_TIMEOUT_MS = "tres-minutos";
    generarMock.mockClear();
    await generarPropuesta(entrada());
    expect(peticion().timeoutMs).toBe(TIMEOUT_POR_DEFECTO_MS);
  });

  /**
   * La diferencia real con el assessment: allá el reintento nunca entra en el
   * `maxDuration` de la función, acá corre en un script y sí entra. Si el techo
   * dejara de ser el doble del intento, el reintento se apagaría en silencio y
   * un esquema inválido —el camino normal— perdería la propuesta.
   */
  it("el techo deja entrar el segundo intento", async () => {
    await generarPropuesta(entrada());

    const { timeoutMs, techoMs, cabeOtroIntento } = peticion();
    expect(techoMs).toBe(timeoutMs * 2);
    expect(cabeOtroIntento(timeoutMs, timeoutMs, techoMs)).toBe(true);
    expect(cabeOtroIntento(timeoutMs + 1, timeoutMs, techoMs)).toBe(false);
  });
});
