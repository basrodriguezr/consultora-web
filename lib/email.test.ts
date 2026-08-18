import { afterEach, describe, expect, it } from "vitest";

import { enviarEmailLead, plantillaLead } from "@/lib/email";
import type {
  LeadAssessmentNormalizado,
  LeadContactoNormalizado,
} from "@/lib/leads";

/**
 * El fixture se tipa como la variante de contacto y no como `Lead`: con la
 * unión, un `Partial<Lead>` deja pasar mezclas imposibles (campos de las dos
 * variantes en el mismo objeto) y el error aparecería recién en la aserción.
 */
function lead(
  cambios: Partial<LeadContactoNormalizado> = {},
): LeadContactoNormalizado {
  return {
    tipo: "contacto",
    nombre: "Ana Pérez",
    email: "ana@acme.cl",
    rol: "gerente-ti",
    desafio: "costos-cloud",
    recibidoEn: "2026-07-27T15:30:00.000Z",
    ...cambios,
  };
}

/** Atajos: los tres cuerpos salen ahora de una sola plantilla. */
const asuntoLead = (l: LeadContactoNormalizado) => plantillaLead(l).asunto;
const cuerpoTextoLead = (l: LeadContactoNormalizado) => plantillaLead(l).texto;
const cuerpoHtmlLead = (l: LeadContactoNormalizado) => plantillaLead(l).html;

describe("asuntoLead", () => {
  it("arma un asunto escaneable de un vistazo", () => {
    expect(asuntoLead(lead())).toBe(
      "Nuevo lead: Ana Pérez — Costos cloud creciendo sin visibilidad",
    );
  });

  /**
   * Segunda barrera contra inyección de headers SMTP. El esquema zod ya
   * rechaza los saltos de línea, pero esta función es exportada y no debe
   * depender de que quien la llame haya validado antes. Resend pasa el
   * `subject` tal cual al API: no sanitiza nada.
   */
  it("aplasta saltos de línea y nulos en una sola línea", () => {
    const asunto = asuntoLead(lead({ nombre: "Ana\r\nBcc: victima@ejemplo.cl\x00" }));
    expect(asunto).not.toMatch(/[\r\n\x00]/);
  });
});

describe("cuerpoHtmlLead — escapado", () => {
  it("escapa el HTML del nombre", () => {
    const html = cuerpoHtmlLead(lead({ nombre: "<script>alert('x')</script>" }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapa comillas y ampersands", () => {
    const html = cuerpoHtmlLead(lead({ nombre: `a & b "c" 'd'` }));
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;");
  });

  it("muestra las etiquetas del rol y del desafío, no los slugs", () => {
    const html = cuerpoHtmlLead(lead());
    expect(html).toContain("Gerente de TI");
    expect(html).not.toContain("gerente-ti");
    expect(html).not.toContain("costos-cloud");
  });
});

describe("cuerpoTextoLead", () => {
  it("incluye todos los campos del lead", () => {
    const texto = cuerpoTextoLead(lead());
    expect(texto).toContain("Ana Pérez");
    expect(texto).toContain("ana@acme.cl");
    expect(texto).toContain("Gerente de TI");
    expect(texto).toContain("Costos cloud creciendo sin visibilidad");
  });

  /**
   * La nota es informativa y no bloquea nada: el formulario acepta `@gmail` a
   * propósito (el correo de la propia consultora es uno). Sirve para priorizar.
   */
  it("anota el correo personal al costado del email", () => {
    expect(cuerpoTextoLead(lead({ email: "ana@gmail.com" }))).toContain(
      "ana@gmail.com (correo personal)",
    );
  });

  it("no anota nada cuando el correo es corporativo", () => {
    expect(cuerpoTextoLead(lead())).not.toContain("correo personal");
  });

  it("no revienta con una fecha inválida", () => {
    // Cae al ISO crudo en vez de mostrar "Invalid Date".
    expect(cuerpoTextoLead(lead({ recibidoEn: "no-es-una-fecha" }))).toContain(
      "no-es-una-fecha",
    );
  });
});

describe("enviarEmailLead sin configurar", () => {
  const original = process.env.RESEND_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = original;
  });

  /**
   * Sin la key no se llama a Resend: se devuelve un resultado de error
   * explícito que el route traduce a un 503 con un mensaje útil. Es lo que
   * permite que el sitio corra y se despliegue sin ningún secreto configurado.
   * Este test no necesita mock de red justamente porque corta antes.
   */
  it("devuelve 'sin-configurar' sin tocar la red", async () => {
    delete process.env.RESEND_API_KEY;

    const resultado = await enviarEmailLead(lead());
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe("sin-configurar");
  });

  it("trata la key vacía como ausente", async () => {
    process.env.RESEND_API_KEY = "";

    const resultado = await enviarEmailLead(lead());
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe("sin-configurar");
  });
});

describe("plantillaLead — lead de assessment", () => {
  function assessment(
    cambios: Partial<LeadAssessmentNormalizado> = {},
  ): LeadAssessmentNormalizado {
    return {
      tipo: "assessment",
      nombre: "Ana Pérez",
      email: "ana@acme.cl",
      empresa: "Acme SpA",
      problemaPrincipal: "Los reportes se arman a mano.",
      solucionActual: "Planillas Excel.",
      fuentesDatos: ["erp", "planillas-excel"],
      equipoDatos: "parcial",
      personasConDatos: 4,
      cloud: "aws",
      presupuesto: "asignado",
      urgencia: "alta",
      recibidoEn: "2026-08-09T12:00:00.000Z",
      ...cambios,
    };
  }

  /**
   * Los tres campos de texto libre son la única prosa que un desconocido puede
   * meter en este email. El escapado es lo que separa "un lead con símbolos" de
   * "HTML ejecutándose en la bandeja de Daniela".
   */
  it.each([
    ["problemaPrincipal", { problemaPrincipal: "<img src=x onerror=alert(1)>" }],
    ["solucionActual", { solucionActual: "<script>alert('x')</script>" }],
    ["sistemasActuales", { sistemasActuales: "<b>SAP</b>" }],
    ["empresa", { empresa: "<script>alert('x')</script>" }],
  ])("escapa el HTML de %s", (_campo, cambio) => {
    const html = plantillaLead(assessment(cambio)).html;

    // Lo que importa es que no quede NINGÚN delimitador de tag sin escapar.
    // Un `onerror=` suelto sobrevive como texto plano y es inofensivo: sin
    // `<` que abra una etiqueta, no hay nada que lo interprete.
    expect(html).not.toMatch(/<script|<img|<b>/);
    expect(html).toContain("&lt;");
  });

  /**
   * `nombre` y `empresa` se interpolan en el asunto: un `\r\n` ahí es inyección
   * de headers SMTP. El esquema ya los rechaza, pero esta función es exportada
   * y no debe depender de que quien la llame haya validado antes.
   */
  it("aplasta el asunto en una sola línea", () => {
    const asunto = plantillaLead(
      assessment({ empresa: "Acme\r\nBcc: victima@ejemplo.cl\x00" }),
    ).asunto;
    expect(asunto).not.toMatch(/[\r\n\x00]/);
  });

  it("muestra las etiquetas de los enums, no los slugs", () => {
    const texto = plantillaLead(
      assessment({ horasSemanaProceso: "5-15" }),
    ).texto;
    expect(texto).toContain("Planillas Excel");
    expect(texto).not.toContain("planillas-excel");
    expect(texto).toContain("Entre 5 y 15 horas");
    expect(texto).not.toContain("5-15");
  });

  /**
   * `horasSemanaProceso` es el último enum que viajaba crudo a la bandeja: se
   * emitía `"5-15 (declarado)"`. Los cinco valores se cubren enteros porque el
   * mapa vive en `lib/leads.ts` y lo comparten formulario y email — si alguien
   * agrega un rango y se olvida de la etiqueta, esto lo dice acá y no en la
   * bandeja de Daniela.
   */
  it.each([
    ["<5", "Menos de 5 horas"],
    ["5-15", "Entre 5 y 15 horas"],
    ["15-40", "Entre 15 y 40 horas"],
    [">40", "Más de 40 horas"],
    ["no-se", "No lo tengo medido"],
  ] as const)("traduce el rango de horas %s", (rango, etiqueta) => {
    const texto = plantillaLead(
      assessment({ horasSemanaProceso: rango }),
    ).texto;
    expect(texto).toContain(etiqueta);
    expect(texto).not.toContain(rango);
    // El sufijo "(declarado)" se sacó: la etiqueta ya se lee como respuesta.
    expect(texto).not.toContain("(declarado)");
  });

  /**
   * *"No lo tengo medido"* y *"no contestó"* son dos cosas distintas y tienen
   * que verse distinto: la primera es la respuesta del cliente ideal (falta de
   * visibilidad, que es lo que vende la consultora), la segunda es un campo
   * opcional que se saltearon. Colapsarlas en el email borra esa señal.
   */
  it("distingue 'no lo tengo medido' de un campo sin responder", () => {
    const medido = plantillaLead(
      assessment({ horasSemanaProceso: "no-se" }),
    ).texto;
    const sinResponder = plantillaLead(
      assessment({ horasSemanaProceso: undefined }),
    ).texto;

    expect(medido).toContain("No lo tengo medido");
    expect(sinResponder).not.toContain("No lo tengo medido");
    expect(sinResponder).toContain("Horas/semana del proceso");
    expect(sinResponder).toContain("[no respondido]");
  });

  /** La marca del asunto es lo que permite triar desde la lista de la bandeja. */
  it("marca el asunto solo cuando el lead no califica", () => {
    expect(plantillaLead(assessment(), "probablemente-no").asunto).toContain(
      "⚠️ probablemente no califica",
    );
    expect(plantillaLead(assessment(), "a-evaluar").asunto).not.toContain("⚠️");
    expect(plantillaLead(assessment()).asunto).not.toContain("⚠️");
  });

  /**
   * Un campo opcional sin responder tiene que verse como tal. Un espacio en
   * blanco en la bandeja se lee como un bug del formulario.
   */
  it("marca los opcionales no respondidos", () => {
    expect(plantillaLead(assessment()).texto).toContain("[no respondido]");
  });
});
