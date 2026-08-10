import { describe, expect, it } from "vitest";

import type { SalidaAssessment } from "@/lib/assessment/esquema";
import { renderPreDiagnostico } from "@/lib/assessment/render";
import type { LeadAssessmentNormalizado } from "@/lib/leads";

/**
 * El golden test del entregable.
 *
 * Es el test de mayor valor del plan de Fase 2: congela el documento completo,
 * así que cualquier cambio en el renderer aparece como diff en la revisión en
 * vez de descubrirse cuando Daniela manda algo raro a un cliente. Si el diff es
 * intencional se actualiza el snapshot; si no, es el bug.
 */

function lead(
  cambios: Partial<LeadAssessmentNormalizado> = {},
): LeadAssessmentNormalizado {
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
    ...cambios,
  };
}

function salida(cambios: Partial<SalidaAssessment> = {}): SalidaAssessment {
  return {
    resumen:
      "La consolidación mensual de reportes se hace a mano y depende de una sola persona. Lo primero sería centralizar la fuente de ventas y automatizar el reporte.",
    nivelMadurez: 2,
    dimensiones: [
      { clave: "completitud", nivel: null, evidencia: null, impacto: "Reportes incompletos." },
      { clave: "unicidad", nivel: 1, evidencia: "Mencionan clientes repetidos.", impacto: "Doble conteo." },
      { clave: "consistencia", nivel: null, evidencia: null, impacto: "Cifras que no cuadran entre áreas." },
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
    justificacionServicio: "El dolor está acotado y se resuelve en semanas, no en meses.",
    preguntasDiscovery: [
      "¿El ERP expone una API o solo permite exportar archivos?",
      "¿Cuántos registros duplicados hay en la base de clientes?",
      "¿Quién es hoy el dueño del dato de ventas?",
    ],
    senalesDeAlerta: [],
    ...cambios,
  };
}

describe("renderPreDiagnostico — golden", () => {
  it("congela el documento completo", () => {
    expect(
      renderPreDiagnostico(lead(), salida(), "a-evaluar"),
    ).toMatchSnapshot();
  });

  it("congela la variante sin horas declaradas", () => {
    expect(
      renderPreDiagnostico(
        lead({ horasSemanaProceso: undefined }),
        salida({ hipotesisCausaRaiz: null }),
        "probablemente-no",
      ),
    ).toMatchSnapshot();
  });
});

describe("renderPreDiagnostico — las reglas de contenido", () => {
  /**
   * El encabezado es literal y acordado con Daniela. No es decoración: encuadra
   * qué es el documento si alguna vez sale de su bandeja.
   */
  it("abre con el encabezado exacto", () => {
    expect(renderPreDiagnostico(lead(), salida(), "a-evaluar")).toMatch(
      /^Pre-diagnóstico preliminar — pendiente de validación en discovery\n/,
    );
  });

  /**
   * "Causa raíz" afirma haber mirado el sistema. El agente no lo miró: leyó un
   * formulario. El rótulo tiene que decir hipótesis.
   */
  it("dice 'Hipótesis a verificar', nunca 'causa raíz'", () => {
    const doc = renderPreDiagnostico(lead(), salida(), "a-evaluar");
    expect(doc).toContain("Hipótesis a verificar");
    expect(doc.toLowerCase()).not.toContain("causa raíz");
  });

  /**
   * Daniela aprobó la tabla de calidad *"sin porcentajes y como preliminar"*.
   * Un `87%` derivado de un formulario tiene apariencia de medición sin serlo.
   */
  it("no imprime ningún porcentaje", () => {
    expect(renderPreDiagnostico(lead(), salida(), "a-evaluar")).not.toContain("%");
  });

  /**
   * La regla del "cómo": el pre-diagnóstico dice qué arreglar, nunca cómo. El
   * diseño se cobra en la propuesta comercial, y un modelo al que se le piden
   * quick wins deriva solo hacia "Lambda + EventBridge + S3".
   *
   * El renderer no puede impedir que el modelo lo escriba —eso es trabajo del
   * prompt—, pero este test lo detecta antes de que salga.
   */
  it("no nombra servicios de AWS", () => {
    const doc = renderPreDiagnostico(lead(), salida(), "a-evaluar");
    for (const servicio of [
      "Lambda",
      "Glue",
      "S3",
      "Athena",
      "Redshift",
      "EventBridge",
      "Step Functions",
    ]) {
      expect(doc).not.toContain(servicio);
    }
  });

  it("nombra el servicio recomendado con su rango y plazo", () => {
    const doc = renderPreDiagnostico(lead(), salida({ servicioRecomendado: "finops" }), "a-evaluar");
    expect(doc).toContain("FinOps");
    expect(doc).toContain("$8–18M CLP");
    expect(doc).toContain("4-6 semanas");
  });

  /**
   * Sin horas declaradas no hay cifra: sale la marca de pendiente y **nunca un
   * `$0`**. "No sé cuántas horas me consume" no significa que no cueste nada.
   */
  it("sin horas declaradas imprime la marca de pendiente, no un cero", () => {
    const doc = renderPreDiagnostico(
      lead({ horasSemanaProceso: undefined }),
      salida(),
      "a-evaluar",
    );
    expect(doc).toContain("[por confirmar en discovery]");
    expect(doc).not.toContain("$0,0M CLP");
  });

  it("deja la calificación y sus insumos en la parte interna", () => {
    const doc = renderPreDiagnostico(lead(), salida(), "probablemente-no");
    expect(doc).toContain("interno y no va al cliente");
    expect(doc).toContain("probablemente-no");
    // Los motivos se listan siempre: un veredicto sin sus insumos no se audita.
    expect(doc).toContain("Presupuesto: asignado");
  });

  it("dice explícitamente que la madurez es una hipótesis", () => {
    expect(renderPreDiagnostico(lead(), salida(), "a-evaluar")).toContain(
      "hipótesis a partir del formulario, no una medición",
    );
  });
});
