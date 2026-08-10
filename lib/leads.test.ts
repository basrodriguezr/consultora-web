import { describe, expect, it } from "vitest";

import {
  esCorreoPersonal,
  etiquetaDesafio,
  etiquetaRol,
  honeypotField,
  leadContactoSchema,
  leadSchema,
  normalizarLead,
  type LeadContacto,
} from "@/lib/leads";

/** Payload válido mínimo; cada test cambia solo lo que le interesa. */
function lead(cambios: Record<string, unknown> = {}) {
  return {
    tipo: "contacto",
    nombre: "Ana Pérez",
    email: "ana@acme.cl",
    rol: "gerente-ti",
    desafio: "costos-cloud",
    ...cambios,
  };
}

describe("leadContactoSchema — el honeypot", () => {
  /**
   * ESTE ES EL TEST MÁS IMPORTANTE DE LA SUITE.
   *
   * Bug real (2026-07-22): el honeypot estaba en el esquema compartido, así que
   * `zodResolver` lo validaba también en el cliente. Un gestor de contraseñas
   * rellenando un campo llamado `website` dejaba el botón "Enviar" sin hacer
   * nada — sin mensaje, para siempre, perdiendo el lead en silencio. El build,
   * el lint y Lighthouse 100/100 pasaban igual.
   *
   * El esquema tiene que ACEPTAR el honeypot con cualquier valor; quien lo
   * juzga es el endpoint.
   */
  it("acepta el honeypot con contenido (lo juzga el servidor, no el esquema)", () => {
    const resultado = leadContactoSchema.safeParse(
      lead({ [honeypotField]: "https://spam.example" }),
    );
    expect(resultado.success).toBe(true);
  });

  it("acepta el honeypot con un valor que ni siquiera es texto", () => {
    const resultado = leadContactoSchema.safeParse(
      lead({ [honeypotField]: { raro: true } }),
    );
    expect(resultado.success).toBe(true);
  });
});

describe("leadContactoSchema — inyección de headers", () => {
  /**
   * `nombre` se interpola en el asunto del email: un `\r\n` ahí es inyección de
   * headers SMTP. `.trim()` solo limpia los bordes.
   */
  it.each([
    ["salto de línea en el nombre", { nombre: "Ana\r\nBcc: victima@ejemplo.cl" }],
    ["byte nulo en el nombre", { nombre: "Ana\x00Pérez" }],
  ])("rechaza %s", (_caso, cambios) => {
    expect(leadContactoSchema.safeParse(lead(cambios)).success).toBe(false);
  });

  it("rechaza un email con salto de línea", () => {
    const resultado = leadContactoSchema.safeParse(
      lead({ email: "ana@acme.cl\r\nBcc: victima@ejemplo.cl" }),
    );
    expect(resultado.success).toBe(false);
  });
});

describe("leadContactoSchema — campos", () => {
  it("normaliza el email a minúsculas y sin espacios", () => {
    const resultado = leadContactoSchema.safeParse(lead({ email: "  ANA@Acme.CL " }));
    expect(resultado.success && resultado.data.email).toBe("ana@acme.cl");
  });

  it("rechaza un nombre de 1 carácter", () => {
    expect(leadContactoSchema.safeParse(lead({ nombre: "A" })).success).toBe(false);
  });

  /**
   * `tipo` NO tiene `.default()`: un discriminante con default dentro de una
   * `z.discriminatedUnion` es terreno resbaloso y la Fase 2 convierte esto en
   * unión. La contrapartida es que el formulario **tiene** que mandarlo en sus
   * `defaultValues`; este test documenta ese contrato para que nadie lo
   * descubra con un 400 en producción.
   */
  it("rechaza un payload sin `tipo` (el discriminante no tiene default)", () => {
    const sinTipo: Record<string, unknown> = lead();
    delete sinTipo.tipo;
    expect(leadContactoSchema.safeParse(sinTipo).success).toBe(false);
  });

  it("rechaza un `tipo` que no es 'contacto'", () => {
    expect(leadContactoSchema.safeParse(lead({ tipo: "assessment" })).success).toBe(
      false,
    );
  });

  /** Campos cerrados: cualquier valor fuera del enum es basura o manipulación. */
  it.each([
    ["rol inventado", { rol: "presidente" }],
    ["rol ausente", { rol: undefined }],
    ["desafío inventado", { desafio: "otra-cosa" }],
    ["desafío ausente", { desafio: undefined }],
    ["desafío con la etiqueta en vez del valor", { desafio: "Costos cloud" }],
  ])("rechaza %s", (_caso, cambios) => {
    expect(leadContactoSchema.safeParse(lead(cambios)).success).toBe(false);
  });

  it("da los mensajes de error en español", () => {
    // Sin `z.config(z.locales.es())` un POST malformado responde "Invalid
    // input" en una UI que está toda en español.
    const resultado = leadContactoSchema.safeParse(lead({ email: 123 }));
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const mensajes = resultado.error.issues.map((i) => i.message).join(" ");
      expect(mensajes).not.toMatch(/Invalid|Expected|Required/);
    }
  });
});

describe("normalizarLead", () => {
  const base: LeadContacto = {
    tipo: "contacto",
    nombre: "Ana Pérez",
    email: "ana@acme.cl",
    rol: "gerente-ti",
    desafio: "costos-cloud",
  };

  it("estampa la hora del servidor en ISO 8601", () => {
    const cuando = new Date("2026-07-27T15:30:00.000Z");
    expect(normalizarLead(base, cuando).recibidoEn).toBe("2026-07-27T15:30:00.000Z");
  });

  it("conserva rol y desafío tal como los validó el esquema", () => {
    const resultado = normalizarLead(base, new Date());
    // `normalizarLead` devuelve la unión: hay que estrechar por el
    // discriminante antes de leer los campos propios de esta variante.
    expect(resultado.tipo).toBe("contacto");
    if (resultado.tipo !== "contacto") throw new Error("variante inesperada");
    expect(resultado.rol).toBe("gerente-ti");
    expect(resultado.desafio).toBe("costos-cloud");
  });

  it("no arrastra el honeypot al lead normalizado", () => {
    const conTrampa = { ...base, [honeypotField]: "spam" } as LeadContacto;
    expect(normalizarLead(conTrampa, new Date())).not.toHaveProperty(honeypotField);
  });
});

describe("etiquetas de los enums", () => {
  /**
   * El email a la casilla las usa: si un valor del enum se quedara sin label,
   * Daniela leería `gerente-ti` y nadie lo arreglaría hasta que preguntara.
   */
  it("traduce los slugs a texto legible", () => {
    expect(etiquetaRol("gerente-ti")).toBe("Gerente de TI");
    expect(etiquetaDesafio("costos-cloud")).toBe(
      "Costos cloud creciendo sin visibilidad",
    );
  });
});

describe("esCorreoPersonal", () => {
  /**
   * Es solo informativo — nunca bloquea. Se usa para la sugerencia en gris del
   * formulario y para anotar el email en la notificación.
   */
  it("reconoce los dominios de correo gratuito", () => {
    expect(esCorreoPersonal("ana@gmail.com")).toBe(true);
    expect(esCorreoPersonal("  Ana@HOTMAIL.CL ")).toBe(true);
  });

  it("no marca un dominio corporativo", () => {
    expect(esCorreoPersonal("ana@acme.cl")).toBe(false);
  });

  it("no revienta con un texto sin arroba", () => {
    expect(esCorreoPersonal("ana")).toBe(false);
  });
});

describe("leadSchema — la unión discriminada", () => {
  const assessmentValido = {
    tipo: "assessment" as const,
    nombre: "Ana Pérez",
    email: "ana@acme.cl",
    empresa: "Acme SpA",
    problemaPrincipal: "Los reportes mensuales se arman a mano y tardan días.",
    solucionActual: "Planillas Excel.",
    fuentesDatos: ["erp"],
    equipoDatos: "parcial",
    personasConDatos: 4,
    cloud: "aws",
    presupuesto: "asignado",
    urgencia: "alta",
  };

  it("acepta un lead de assessment completo", () => {
    expect(leadSchema.safeParse(assessmentValido).success).toBe(true);
  });

  it("sigue aceptando el lead de contacto de la Fase 1", () => {
    expect(
      leadSchema.safeParse({
        tipo: "contacto",
        nombre: "Ana Pérez",
        email: "ana@acme.cl",
        rol: "gerente-ti",
        desafio: "costos-cloud",
      }).success,
    ).toBe(true);
  });

  /**
   * `empresa` es obligatoria solo en esta variante: el pre-diagnóstico la
   * interpola en el encabezado y sin ella el documento sale con `[Empresa]`.
   * Es un campo obligatorio del entregable, no del CRM.
   */
  it("exige empresa en assessment", () => {
    const sinEmpresa: Record<string, unknown> = { ...assessmentValido };
    delete sinEmpresa.empresa;
    expect(leadSchema.safeParse(sinEmpresa).success).toBe(false);
  });

  it("exige al menos una fuente de datos", () => {
    expect(
      leadSchema.safeParse({ ...assessmentValido, fuentesDatos: [] }).success,
    ).toBe(false);
  });

  /**
   * "No sé cuántas horas nos consume" es una respuesta legítima y de primera
   * clase: es falta de visibilidad, que es lo que vende la consultora. Si el
   * esquema la rechazara, el filtro descartaría al cliente ideal antes incluso
   * de llegar a `calificacion.ts`.
   */
  it("acepta 'no-se' como respuesta de horas", () => {
    expect(
      leadSchema.safeParse({ ...assessmentValido, horasSemanaProceso: "no-se" })
        .success,
    ).toBe(true);
  });

  it("las cuatro preguntas nuevas son opcionales", () => {
    // `assessmentValido` no trae ninguna de las cuatro y ya pasó arriba.
    expect(leadSchema.safeParse(assessmentValido).success).toBe(true);
  });

  /**
   * Un `tipo` que no es ninguna de las dos variantes no puede caer en la rama
   * equivocada: `discriminatedUnion` corta antes de evaluar campos.
   */
  it("rechaza un tipo desconocido", () => {
    expect(
      leadSchema.safeParse({ ...assessmentValido, tipo: "propuesta" }).success,
    ).toBe(false);
  });
});

describe("normalizarLead — variante assessment", () => {
  it("conserva los campos del assessment y estampa la hora", () => {
    const datos = leadSchema.parse({
      tipo: "assessment",
      nombre: "Ana Pérez",
      email: "ana@acme.cl",
      empresa: "Acme SpA",
      problemaPrincipal: "Los reportes mensuales se arman a mano y tardan días.",
      solucionActual: "Planillas Excel.",
      fuentesDatos: ["erp", "crm"],
      equipoDatos: "no",
      personasConDatos: 1,
      cloud: "ninguno",
      presupuesto: "en-evaluacion",
      urgencia: "media",
      horasSemanaProceso: "no-se",
    });

    const lead = normalizarLead(datos, new Date("2026-08-09T12:00:00.000Z"));
    expect(lead.tipo).toBe("assessment");
    if (lead.tipo !== "assessment") throw new Error("variante inesperada");
    expect(lead.empresa).toBe("Acme SpA");
    expect(lead.fuentesDatos).toEqual(["erp", "crm"]);
    expect(lead.horasSemanaProceso).toBe("no-se");
    expect(lead.recibidoEn).toBe("2026-08-09T12:00:00.000Z");
  });

  /**
   * Un campo no respondido queda `undefined`, no en un valor por defecto: el
   * renderer lo traduce a `[por confirmar en discovery]` y esa distinción es lo
   * que impide que el documento afirme cosas que nadie dijo.
   */
  it("deja en undefined lo que no se respondió", () => {
    const datos = leadSchema.parse({
      tipo: "assessment",
      nombre: "Ana Pérez",
      email: "ana@acme.cl",
      empresa: "Acme SpA",
      problemaPrincipal: "Los reportes mensuales se arman a mano y tardan días.",
      solucionActual: "Planillas Excel.",
      fuentesDatos: ["erp"],
      equipoDatos: "no",
      personasConDatos: 1,
      cloud: "ninguno",
      presupuesto: "en-evaluacion",
      urgencia: "media",
    });

    const lead = normalizarLead(datos, new Date());
    if (lead.tipo !== "assessment") throw new Error("variante inesperada");
    expect(lead.horasSemanaProceso).toBeUndefined();
    expect(lead.sponsor).toBeUndefined();
  });
});
