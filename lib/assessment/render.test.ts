import { describe, expect, it } from "vitest";

import { servicios } from "@/content/servicios";
import { rangoLegible } from "@/lib/assessment/catalogo-interno";
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
    expect(doc).toContain("Control y optimización de costos cloud");
    expect(doc).toContain("$8–18M CLP");
    expect(doc).toContain("4-6 semanas");
  });

  /**
   * Hueco real y verificado: los snapshots congelan `"quick-win"` y el test de
   * arriba usa `"finops"`. **Ningún caso tocaba el slug `assessment`** — el
   * servicio principal del producto—, así que renombrarlo no habría movido una
   * sola línea de golden.
   *
   * `nombreServicio()` y `plazoServicio()` no lanzan cuando el slug no está en
   * `content/servicios.ts`: caen al slug crudo y a la cadena vacía. Eso es
   * correcto (el documento no revienta) y es también la forma que tiene el
   * defecto de pasar desapercibido: la línea sale como `**assessment** — $3–6M
   * CLP, ` y se lee como un error de armado en la sección 5.
   *
   * Es la misma medicina que se le aplicó al enum de horas después del bug de
   * `"no-se h/semana"`: **el golden congela la forma del documento, no el
   * dominio de los valores.** Se recorre el catálogo entero, así que agregar un
   * servicio lo cubre solo.
   */
  it.each(servicios.map((s) => [s.slug, s.nombre, s.plazo] as const))(
    "renderiza el siguiente paso completo para el slug %s",
    (slug, nombre, plazo) => {
      const doc = renderPreDiagnostico(
        lead(),
        salida({ servicioRecomendado: slug }),
        "a-evaluar",
      );

      expect(doc).toContain(`**${nombre}** — ${rangoLegible(slug)}, ${plazo}`);
      expect(nombre.trim()).not.toBe("");
      expect(plazo.trim()).not.toBe("");
    },
  );

  /**
   * El hueco que destapó la auditoría del 2026-09-02, y que costó un defecto que
   * llegaba a una gerencia.
   *
   * El golden de arriba congela un caso con fracciones estimadas, y el test de
   * "sin horas declaradas" toma la OTRA rama (`horasSemana === null`). **El caso
   * intermedio —horas declaradas pero ninguna fracción estimable— no lo tocaba
   * nadie**, y ahí `ahorroAnual` daba `0` y el documento imprimía "Ahorro
   * estimado año 1: $0,0M CLP" al lado de una inversión de $8-12M.
   *
   * Es la misma lección que el bug de `"no-se h/semana"`: **el golden congela la
   * forma del documento, no el dominio de los valores.**
   */
  it("con horas pero sin ninguna fracción estimable, no imprime $0", () => {
    const doc = renderPreDiagnostico(
      lead(),
      salida({
        quickWins: salida().quickWins.map((qw) => ({
          ...qw,
          fraccionHorasLiberadas: null,
        })) as SalidaAssessment["quickWins"],
      }),
      "a-evaluar",
    );

    expect(doc).not.toContain("$0,0M");
    expect(doc).toContain("**Ahorro estimado año 1:** [por confirmar en discovery]");
    // El costo del problema sí se conoce: depende de las horas, no de las fracciones.
    expect(doc).toContain("**Costo estimado del problema:** $10,1M CLP al año");
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

  /**
   * Regresión de un defecto real: el sufijo "h/semana" se pegaba al valor crudo
   * del enum, así que `"no-se"` producía **`"no-se h/semana"`** en la primera
   * página del documento.
   *
   * Pasó desapercibido porque el golden congela el caso `"15-40"` —donde el
   * crudo se lee bien— y el único otro caso testeado era `undefined`, que toma
   * la otra rama del ternario. **El valor roto era justo el del cliente ideal:**
   * quien no midió cuánto le cuesta el proceso tiene falta de visibilidad, que
   * es exactamente lo que vende la consultora.
   *
   * Se testea por texto y no por snapshot a propósito: un golden nuevo por cada
   * rango congelaría cinco documentos completos para vigilar una línea.
   */
  it("traduce 'no-se' a una frase legible, sin pegarle la unidad al slug", () => {
    const doc = renderPreDiagnostico(
      lead({ horasSemanaProceso: "no-se" }),
      salida(),
      "a-evaluar",
    );
    expect(doc).toContain("**Proceso declarado:** No lo tengo medido");
    expect(doc).not.toContain("no-se h/semana");
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
