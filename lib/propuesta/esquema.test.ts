import { describe, expect, it } from "vitest";

import { salidaPropuestaSchema } from "@/lib/propuesta/esquema";

/** Una salida válida mínima, para mutar en cada caso. */
function salida(): Record<string, unknown> {
  return {
    contexto: {
      necesidad:
        "RetailCo necesita una visión única de sus ventas para decidir sobre campañas y stock antes de Black Friday.",
      situacionActual:
        "Cada área saca su propio reporte y el Excel del gerente comercial es la referencia que nadie valida.",
    },
    solucion: {
      descripcion:
        "Construimos una plataforma de datos en la cuenta AWS de RetailCo que consolida Shopify, Google Ads y el CRM en un modelo dimensional, con dashboards de gestión sobre esa única fuente.",
      flujo: [
        { nombre: "Extracción", detalle: "Shopify, Google Ads y PostgreSQL." },
        { nombre: "Transformación", detalle: "Modelo dimensional con tests." },
        { nombre: "Consumo", detalle: "Dashboards ejecutivos." },
      ],
      componentes: [
        {
          componente: "Ingesta",
          tecnologia: "AWS Glue",
          funcion: "Carga incremental desde las APIs.",
        },
        {
          componente: "Transformación",
          tecnologia: "dbt",
          funcion: "Modelo dimensional y tests de calidad.",
        },
      ],
    },
    alcance: {
      incluido: [
        {
          entregable: "Diseño de arquitectura",
          descripcion: "Diagrama, ADRs y modelo de datos.",
          semanaInicio: 1,
          semanaFin: 2,
        },
        {
          entregable: "Implementación del pipeline",
          descripcion: "Código productivo en la cuenta del cliente.",
          semanaInicio: 3,
          semanaFin: 6,
        },
        {
          entregable: "Documentación y capacitación",
          descripcion: "Runbook y dos sesiones con el equipo.",
          semanaInicio: 7,
          semanaFin: 8,
        },
      ],
      fueraDeAlcance: ["Migración de datos anteriores a 2024."],
    },
    equipo: [{ rol: "Data Architect (líder)", dedicacionHorasSemana: 20 }],
    inversion: {
      servicio: "business-intelligence",
      posicion: "medio",
      justificacion:
        "Tres fuentes con APIs estables y un consumidor claro, pero sin equipo interno que opere lo entregado.",
      presupuestoDeclarado: '"Tenemos entre 10 y 20 millones para esto"',
    },
    supuestos: ["Las APIs de Shopify y Google Ads siguen disponibles."],
    faltantes: ["Confirmar el volumen diario de la tabla de ventas."],
    plazoLimiteCliente: "Black Friday, noviembre 2026",
  };
}

describe("salidaPropuestaSchema", () => {
  it("acepta una propuesta completa", () => {
    expect(salidaPropuestaSchema.safeParse(salida()).success).toBe(true);
  });

  /**
   * El enum es lo que impide cotizar algo que la consultora no vende. Sin él, un
   * "Migración a Snowflake" plausible entraría al documento y al cálculo de
   * precios, que buscaría un rango inexistente.
   */
  it("rechaza un servicio fuera del catálogo", () => {
    const s = salida();
    s.inversion = { ...(s.inversion as object), servicio: "migracion-snowflake" };
    expect(salidaPropuestaSchema.safeParse(s).success).toBe(false);
  });

  it("rechaza una posición de rango inventada", () => {
    const s = salida();
    s.inversion = { ...(s.inversion as object), posicion: "muy-alto" };
    expect(salidaPropuestaSchema.safeParse(s).success).toBe(false);
  });

  /**
   * 🛑 El refinamiento que evita el defecto clásico de las propuestas a mano:
   * un entregable que termina antes de empezar produce un timeline incoherente,
   * y el timeline se deriva de esta misma tabla.
   */
  it("rechaza un entregable que termina antes de empezar", () => {
    const s = salida();
    const alcance = s.alcance as { incluido: Array<Record<string, unknown>> };
    alcance.incluido[0] = {
      ...alcance.incluido[0],
      semanaInicio: 6,
      semanaFin: 2,
    };
    expect(salidaPropuestaSchema.safeParse(s).success).toBe(false);
  });

  /**
   * `plazoLimiteCliente` es nullable y no opcional: `null` es la respuesta
   * explícita "no aparece en las notas", y un campo ausente es un output
   * incompleto. Son cosas distintas y el esquema las distingue.
   */
  it("exige `plazoLimiteCliente` presente, aunque sea null", () => {
    const conNull = { ...salida(), plazoLimiteCliente: null };
    expect(salidaPropuestaSchema.safeParse(conNull).success).toBe(true);

    const sinCampo = salida();
    delete sinCampo.plazoLimiteCliente;
    expect(salidaPropuestaSchema.safeParse(sinCampo).success).toBe(false);
  });

  it("acepta que no falte nada, pero exige que el modelo lo declare", () => {
    const sinFaltantes = { ...salida(), faltantes: [] };
    expect(salidaPropuestaSchema.safeParse(sinFaltantes).success).toBe(true);

    const sinCampo = salida();
    delete sinCampo.faltantes;
    expect(salidaPropuestaSchema.safeParse(sinCampo).success).toBe(false);
  });

  /**
   * El §2 es la sección donde el "cómo" es obligatorio — lo contrario de la
   * regla del pre-diagnóstico. Una propuesta sin componentes no tiene solución
   * técnica, que es lo que se está cobrando.
   */
  it("exige al menos dos componentes con tecnología", () => {
    const s = salida();
    const solucion = s.solucion as { componentes: unknown[] };
    solucion.componentes = [solucion.componentes[0]];
    expect(salidaPropuestaSchema.safeParse(s).success).toBe(false);
  });

  it("no tiene ningún campo donde el modelo pueda escribir un monto", () => {
    // La regla dura de la fase, expresada como test: si alguien agrega un
    // `montoCLP` al esquema, este caso lo señala en la revisión.
    const claves = JSON.stringify(Object.keys(salidaPropuestaSchema.shape));
    expect(claves).not.toMatch(/monto|precio|clp|inversionCLP/i);
  });
});
