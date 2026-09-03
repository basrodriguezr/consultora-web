import { describe, expect, it } from "vitest";

import {
  MINIMO_NOTAS,
  entradaPropuestaSchema,
  normalizarEntrada,
} from "@/lib/propuesta/entrada";

const notasValidas = "N".repeat(MINIMO_NOTAS);

describe("entradaPropuestaSchema", () => {
  it("acepta notas desordenadas: valida tamaño, no estructura", () => {
    // La captura real llega así — media pregunta sin responder, una cita larga,
    // fuentes anotadas al margen. Un esquema que exigiera las nueve secciones
    // rechazaría justo el caso normal.
    const notas = `CLIENTE: RetailCo
PROBLEMA: "Nadie sabe cuánto vendimos realmente."
FUENTES: Shopify, Google Ads, PostgreSQL
PRESUPUESTO:
DECISOR: Pablo (CTO)
${"detalle de la conversación. ".repeat(30)}`;

    const r = entradaPropuestaSchema.safeParse({
      empresa: "RetailCo",
      notas,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza notas demasiado cortas para sostener una oferta", () => {
    const r = entradaPropuestaSchema.safeParse({
      empresa: "RetailCo",
      notas: "Quieren un dashboard.",
    });
    expect(r.success).toBe(false);
  });

  it("no acepta espacios como notas: mide después de `trim`", () => {
    const r = entradaPropuestaSchema.safeParse({
      empresa: "RetailCo",
      notas: " ".repeat(MINIMO_NOTAS + 50),
    });
    expect(r.success).toBe(false);
  });

  /**
   * La empresa va aparte del texto libre porque encabeza el documento. Que el
   * modelo la dedujera de la prosa pondría un error en la primera línea, en
   * negrita, de una oferta comercial.
   */
  it("exige el nombre de la empresa", () => {
    const r = entradaPropuestaSchema.safeParse({ notas: notasValidas });
    expect(r.success).toBe(false);
  });

  it("acepta el pre-diagnóstico cuando viene, y también cuando no", () => {
    expect(
      entradaPropuestaSchema.safeParse({
        empresa: "RetailCo",
        notas: notasValidas,
      }).success,
    ).toBe(true);

    expect(
      entradaPropuestaSchema.safeParse({
        empresa: "RetailCo",
        notas: notasValidas,
        preDiagnostico: "# Pre-diagnóstico preliminar\n\nContenido.",
      }).success,
    ).toBe(true);
  });

  it("rechaza notas por encima del techo de tamaño", () => {
    const r = entradaPropuestaSchema.safeParse({
      empresa: "RetailCo",
      notas: "N".repeat(40_001),
    });
    expect(r.success).toBe(false);
  });
});

describe("normalizarEntrada", () => {
  it("resuelve la fecha una sola vez, para que el documento sea reproducible", () => {
    const entrada = normalizarEntrada(
      entradaPropuestaSchema.parse({
        empresa: "  RetailCo  ",
        notas: notasValidas,
      }),
      new Date("2026-09-03T12:00:00.000Z"),
    );

    expect(entrada.empresa).toBe("RetailCo");
    expect(entrada.preparadaEn).toBe("2026-09-03T12:00:00.000Z");
  });

  it("omite el pre-diagnóstico en vez de dejarlo vacío", () => {
    const entrada = normalizarEntrada(
      entradaPropuestaSchema.parse({
        empresa: "RetailCo",
        notas: notasValidas,
      }),
      new Date("2026-09-03T12:00:00.000Z"),
    );
    expect("preDiagnostico" in entrada).toBe(false);
  });
});
