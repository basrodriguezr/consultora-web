import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RespuestaAssessment } from "@/lib/leads";

/**
 * Tests de integración del endpoint del assessment.
 *
 * Se mockea todo lo que sale a la red —los dos envíos de email y la llamada al
 * modelo— y también el renderer, que tiene su propio golden test: lo que se
 * verifica acá es el **cableado**, o sea el orden de los chequeos, la puerta del
 * §8 y qué se le devuelve al formulario. El resto corre de verdad (validación,
 * honeypot, rate limit, calificación).
 *
 * El test que más pesa es el primero de "puerta del §8": es la única red que
 * existe por debajo del route para la decisión de Daniela del 2026-08-09
 * (`generarPreDiagnostico` no lleva la calificación adentro).
 */

const enviarEmailLead = vi.fn();
const enviarPreDiagnostico = vi.fn();
vi.mock("@/lib/email", () => ({
  enviarEmailLead: (...args: unknown[]) => enviarEmailLead(...args),
  enviarPreDiagnostico: (...args: unknown[]) => enviarPreDiagnostico(...args),
}));

const generarPreDiagnostico = vi.fn();
vi.mock("@/lib/assessment/cliente", () => ({
  generarPreDiagnostico: (...args: unknown[]) => generarPreDiagnostico(...args),
}));

const renderPreDiagnostico = vi.fn();
vi.mock("@/lib/assessment/render", () => ({
  renderPreDiagnostico: (...args: unknown[]) => renderPreDiagnostico(...args),
}));

/**
 * `after` de Next lanza fuera de un request scope (`workAsyncStorage` vacío),
 * así que en tests se reemplaza por una cola que corremos a mano. Es además lo
 * que permite afirmar lo que importa: que la respuesta HTTP ya está armada
 * **antes** de que la tarea corra.
 */
const tareasDiferidas: Array<() => void | Promise<void>> = [];
vi.mock("next/server", () => ({
  after: (tarea: () => void | Promise<void>) => {
    tareasDiferidas.push(tarea);
  },
}));

async function correrDiferidas(): Promise<void> {
  const pendientes = tareasDiferidas.splice(0, tareasDiferidas.length);
  for (const tarea of pendientes) await tarea();
}

const { POST } = await import("@/app/api/assessment/route");

/** Cada test usa su propia IP: el contador del rate limit es global. */
let ip = 0;
function nuevaIp(): string {
  ip += 1;
  return `203.0.113.${ip}`;
}

function pedir(cuerpo: unknown, extra: Record<string, string> = {}): Request {
  return new Request("https://arqdata.cl/api/assessment", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": nuevaIp(),
      ...extra,
    },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

/** Los 11 campos obligatorios. `tipo` explícito: el discriminante no tiene default. */
const LEAD_VALIDO = {
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
};

/**
 * La conjunción exacta del §8: sin presupuesto + una sola persona con datos +
 * urgencia baja. Cambiar cualquiera de las tres vuelve a calificar al lead, y
 * eso también se testea.
 */
const LEAD_NO_CALIFICA = {
  ...LEAD_VALIDO,
  presupuesto: "sin-presupuesto",
  personasConDatos: 1,
  urgencia: "baja",
};

/** Una salida cualquiera: el renderer está mockeado, su forma no importa acá. */
const SALIDA_DEL_MODELO = { resumen: "lo que sea" };

beforeEach(() => {
  tareasDiferidas.length = 0;

  enviarEmailLead.mockReset();
  enviarEmailLead.mockResolvedValue({ ok: true, id: "re_email1" });

  enviarPreDiagnostico.mockReset();
  enviarPreDiagnostico.mockResolvedValue({ ok: true, id: "re_email2" });

  generarPreDiagnostico.mockReset();
  generarPreDiagnostico.mockResolvedValue({ ok: true, salida: SALIDA_DEL_MODELO });

  renderPreDiagnostico.mockReset();
  renderPreDiagnostico.mockReturnValue("# Pre-diagnóstico\n\nmarkdown renderizado");
});

describe("configuración del segmento", () => {
  /**
   * La red que reemplaza a un `import` que el framework no permite.
   *
   * `maxDuration` tiene que ser un literal: Next 16.2.11 analiza la config de
   * segmento de forma estática y `next build` corta con "Invalid segment
   * configuration export detected" si se exporta una constante importada
   * (comprobado con el build, no deducido). Eso deja el techo de la función y el
   * presupuesto del modelo como dos números escritos por separado.
   *
   * **Y no pueden divergir:** el timeout de `cliente.ts` sale de restarle la
   * reserva a este techo. Si alguien sube el presupuesto y olvida este literal,
   * el cliente esperaría más de lo que la plataforma le concede y la función
   * moriría antes de que disparara nuestro timeout — o sea justo el fallo que
   * el presupuesto derivado existe para evitar, y sin ningún síntoma. Este test
   * es lo único que lo impide.
   */
  it("maxDuration del route coincide con el presupuesto", async () => {
    const [{ maxDuration }, { MAX_DURATION_SEGUNDOS }] = await Promise.all([
      import("@/app/api/assessment/route"),
      import("@/lib/assessment/presupuesto"),
    ]);

    expect(maxDuration).toBe(MAX_DURATION_SEGUNDOS);
  });
});

describe("POST /api/assessment — cuerpo mal formado", () => {
  it("responde 400 si el body no es JSON", async () => {
    const respuesta = await POST(pedir("esto no es json {"));
    expect(respuesta.status).toBe(400);
    expect(enviarEmailLead).not.toHaveBeenCalled();
    expect(generarPreDiagnostico).not.toHaveBeenCalled();
  });

  it("responde 400 si el body es un array", async () => {
    expect((await POST(pedir([1, 2, 3]))).status).toBe(400);
  });

  it("responde 400 si el body es null", async () => {
    expect((await POST(pedir(null))).status).toBe(400);
  });
});

describe("POST /api/assessment — validación", () => {
  it("responde 400 con los errores por campo", async () => {
    const respuesta = await POST(
      pedir({ ...LEAD_VALIDO, empresa: "", problemaPrincipal: "corto" }),
    );
    expect(respuesta.status).toBe(400);

    const cuerpo = (await respuesta.json()) as RespuestaAssessment;
    expect(cuerpo.ok).toBe(false);
    if (!cuerpo.ok) {
      expect(cuerpo.campos?.empresa).toBeDefined();
      expect(cuerpo.campos?.problemaPrincipal).toBeDefined();
    }
    expect(enviarEmailLead).not.toHaveBeenCalled();
  });

  it("rechaza un lead sin ninguna fuente de datos seleccionada", async () => {
    const respuesta = await POST(pedir({ ...LEAD_VALIDO, fuentesDatos: [] }));
    expect(respuesta.status).toBe(400);

    const cuerpo = (await respuesta.json()) as RespuestaAssessment;
    if (!cuerpo.ok) expect(cuerpo.campos?.fuentesDatos).toBeDefined();
  });

  it("acepta el lead con los cuatro opcionales vacíos", async () => {
    const respuesta = await POST(pedir(LEAD_VALIDO));
    expect(respuesta.status).toBe(200);
    expect(enviarEmailLead).toHaveBeenCalledTimes(1);
  });

  it("nunca le reporta el honeypot al cliente (no le da pistas al bot)", async () => {
    const respuesta = await POST(pedir({ tipo: "assessment", website: "" }));
    const cuerpo = (await respuesta.json()) as RespuestaAssessment;
    if (!cuerpo.ok) expect(cuerpo.campos?.website).toBeUndefined();
  });
});

describe("POST /api/assessment — honeypot", () => {
  it("responde 200 falso, sin agenda y sin enviar nada", async () => {
    const respuesta = await POST(pedir({ ...LEAD_VALIDO, website: "http://spam.example" }));
    expect(respuesta.status).toBe(200);

    const cuerpo = (await respuesta.json()) as RespuestaAssessment;
    expect(cuerpo).toEqual({ ok: true, calificado: false });
    expect(enviarEmailLead).not.toHaveBeenCalled();
    expect(generarPreDiagnostico).not.toHaveBeenCalled();
  });

  it("un honeypot vacío no bloquea a una persona real", async () => {
    const respuesta = await POST(pedir({ ...LEAD_VALIDO, website: "   " }));
    expect(respuesta.status).toBe(200);
    expect(enviarEmailLead).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/assessment — mismo origen y tamaño", () => {
  it("responde 403 a un POST desde otro origen", async () => {
    const respuesta = await POST(
      pedir(LEAD_VALIDO, { origin: "https://sitio-ajeno.example", host: "arqdata.cl" }),
    );
    expect(respuesta.status).toBe(403);
    expect(enviarEmailLead).not.toHaveBeenCalled();
  });

  it("acepta el POST del propio sitio", async () => {
    const respuesta = await POST(
      pedir(LEAD_VALIDO, { origin: "https://arqdata.cl", host: "arqdata.cl" }),
    );
    expect(respuesta.status).toBe(200);
  });

  it("responde 413 si el body declara más de 32KB", async () => {
    const respuesta = await POST(
      pedir(LEAD_VALIDO, { "content-length": String(64 * 1024) }),
    );
    expect(respuesta.status).toBe(413);
    expect(enviarEmailLead).not.toHaveBeenCalled();
  });
});

describe("POST /api/assessment — rate limit", () => {
  it("bloquea con 429 y Retry-After a partir de la 3ª request de la misma IP", async () => {
    const mismaIp = "203.0.113.250";
    const estados: number[] = [];

    for (let i = 0; i < 3; i += 1) {
      const respuesta = await POST(
        new Request("https://arqdata.cl/api/assessment", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": mismaIp },
          body: JSON.stringify(LEAD_VALIDO),
        }),
      );
      estados.push(respuesta.status);
      if (respuesta.status === 429) {
        expect(Number(respuesta.headers.get("Retry-After"))).toBeGreaterThan(0);
      }
    }

    expect(estados).toEqual([200, 200, 429]);
  });

  /**
   * El chequeo caro va después del barato: si el rate limit corriera recién
   * después de parsear y validar, floodear con basura no costaría nada — y acá
   * cada request procesada gasta un email más tokens pagos.
   */
  it("corre ANTES de leer el body: cuenta también las requests inválidas", async () => {
    const mismaIp = "203.0.113.251";
    const basura = () =>
      new Request("https://arqdata.cl/api/assessment", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": mismaIp },
        body: "no es json",
      });

    expect((await POST(basura())).status).toBe(400);
    expect((await POST(basura())).status).toBe(400);

    // La tercera ya está bloqueada aunque ninguna anterior llegó a validarse.
    const tercera = await POST(basura());
    expect(tercera.status).toBe(429);
    expect(enviarEmailLead).not.toHaveBeenCalled();
  });
});

describe("POST /api/assessment — EMAIL #1 y respuesta", () => {
  it("responde 200 con `calificado` y manda el EMAIL #1 una sola vez", async () => {
    const respuesta = await POST(pedir(LEAD_VALIDO));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, calificado: true });

    expect(enviarEmailLead).toHaveBeenCalledTimes(1);
    const [lead, calificacion] = enviarEmailLead.mock.calls[0];
    expect(lead).toMatchObject({ tipo: "assessment", empresa: "Acme SpA" });
    expect(lead.recibidoEn).toEqual(expect.any(String));
    expect(calificacion).toBe("a-evaluar");
  });

  it("responde 503 y deriva al email cuando falta la configuración", async () => {
    enviarEmailLead.mockResolvedValue({
      ok: false,
      motivo: "sin-configurar",
      detalle: "RESEND_API_KEY no está definida en el entorno.",
    });

    const respuesta = await POST(pedir(LEAD_VALIDO));
    expect(respuesta.status).toBe(503);

    const cuerpo = (await respuesta.json()) as RespuestaAssessment;
    if (!cuerpo.ok) expect(cuerpo.error).toContain("@");
    // Sin EMAIL #1 no se gasta un token: el documento no tendría a quién llegar.
    expect(generarPreDiagnostico).not.toHaveBeenCalled();
  });

  it("responde 502 cuando el proveedor falla", async () => {
    enviarEmailLead.mockResolvedValue({
      ok: false,
      motivo: "proveedor",
      detalle: "validation_error: destinatario inválido",
    });

    expect((await POST(pedir(LEAD_VALIDO))).status).toBe(502);
    expect(generarPreDiagnostico).not.toHaveBeenCalled();
  });
});

/**
 * La decisión de Daniela del 2026-08-09, entera. **`generarPreDiagnostico()` no
 * lleva la puerta adentro** — no hay ningún `if` de calificación en
 * `cliente.ts`—, así que estos tests son la única capa que la verifica.
 */
describe("POST /api/assessment — la puerta del §8", () => {
  it("un lead que NO califica no llama al modelo y no habilita la agenda", async () => {
    const respuesta = await POST(pedir(LEAD_NO_CALIFICA));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, calificado: false });

    // No se difiere ni una tarea: la llamada al modelo ni siquiera se agenda.
    expect(tareasDiferidas).toHaveLength(0);
    await correrDiferidas();

    expect(generarPreDiagnostico).not.toHaveBeenCalled();
    expect(enviarPreDiagnostico).not.toHaveBeenCalled();
  });

  it("pero su EMAIL #1 sale igual, con el asunto etiquetado", async () => {
    await POST(pedir(LEAD_NO_CALIFICA));

    expect(enviarEmailLead).toHaveBeenCalledTimes(1);
    expect(enviarEmailLead.mock.calls[0][1]).toBe("probablemente-no");
  });

  it("una sola señal negativa NO descalifica (el falso positivo es carísimo)", async () => {
    const respuesta = await POST(
      pedir({ ...LEAD_VALIDO, presupuesto: "sin-presupuesto" }),
    );
    expect(await respuesta.json()).toEqual({ ok: true, calificado: true });

    await correrDiferidas();
    expect(generarPreDiagnostico).toHaveBeenCalledTimes(1);
  });

  it("`horasSemanaProceso: \"no-se\"` nunca descalifica", async () => {
    const respuesta = await POST(pedir({ ...LEAD_VALIDO, horasSemanaProceso: "no-se" }));
    expect(await respuesta.json()).toEqual({ ok: true, calificado: true });
  });
});

describe("POST /api/assessment — el pre-diagnóstico (EMAIL #2)", () => {
  it("un lead que califica genera el documento y lo manda, después de responder", async () => {
    const respuesta = await POST(pedir(LEAD_VALIDO));
    expect(respuesta.status).toBe(200);

    // Nada de esto ocurrió mientras la persona esperaba.
    expect(generarPreDiagnostico).not.toHaveBeenCalled();
    expect(tareasDiferidas).toHaveLength(1);

    await correrDiferidas();

    expect(generarPreDiagnostico).toHaveBeenCalledTimes(1);
    expect(generarPreDiagnostico.mock.calls[0][0]).toMatchObject({
      tipo: "assessment",
      empresa: "Acme SpA",
    });

    // El renderer recibe la salida del modelo y la calificación real del lead.
    expect(renderPreDiagnostico).toHaveBeenCalledTimes(1);
    const [, salida, calificacion] = renderPreDiagnostico.mock.calls[0];
    expect(salida).toBe(SALIDA_DEL_MODELO);
    expect(calificacion).toBe("a-evaluar");

    expect(enviarPreDiagnostico).toHaveBeenCalledTimes(1);
    expect(enviarPreDiagnostico.mock.calls[0][1]).toBe(
      "# Pre-diagnóstico\n\nmarkdown renderizado",
    );
  });

  it("si el modelo falla, la respuesta ya fue 200 y el EMAIL #1 salió igual", async () => {
    generarPreDiagnostico.mockResolvedValue({
      ok: false,
      motivo: "error-api",
      detalle: "529 overloaded_error",
    });

    const respuesta = await POST(pedir(LEAD_VALIDO));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, calificado: true });

    await expect(correrDiferidas()).resolves.toBeUndefined();

    expect(enviarEmailLead).toHaveBeenCalledTimes(1);
    expect(renderPreDiagnostico).not.toHaveBeenCalled();
    expect(enviarPreDiagnostico).not.toHaveBeenCalled();
  });

  it("sin ANTHROPIC_API_KEY el formulario sigue funcionando igual", async () => {
    generarPreDiagnostico.mockResolvedValue({
      ok: false,
      motivo: "sin-credencial",
      detalle: "ANTHROPIC_API_KEY ausente o vacía",
    });

    const respuesta = await POST(pedir(LEAD_VALIDO));
    expect(respuesta.status).toBe(200);

    await correrDiferidas();
    expect(enviarEmailLead).toHaveBeenCalledTimes(1);
    expect(enviarPreDiagnostico).not.toHaveBeenCalled();
  });

  it("si el EMAIL #2 falla, tampoco convierte la request en error", async () => {
    enviarPreDiagnostico.mockResolvedValue({
      ok: false,
      motivo: "proveedor",
      detalle: "rate_limit_exceeded",
    });

    const respuesta = await POST(pedir(LEAD_VALIDO));
    expect(respuesta.status).toBe(200);

    await expect(correrDiferidas()).resolves.toBeUndefined();
    expect(enviarPreDiagnostico).toHaveBeenCalledTimes(1);
  });
});
