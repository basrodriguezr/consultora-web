import { describe, expect, it } from "vitest";

import { salidaAssessmentSchema } from "@/lib/assessment/esquema";

/**
 * El esquema es la barrera contra output malformado del modelo. Un JSON se
 * valida y se reintenta; un Markdown libre te avisa cuando Daniela lee algo
 * raro. Estos tests cubren los rechazos que importan, no el camino feliz.
 */

/** Salida mínima válida. Cada test rompe exactamente un campo. */
function salida(cambios: Record<string, unknown> = {}) {
  return {
    resumen:
      "La empresa consolida sus reportes a mano cada mes y eso explica los atrasos y los descuadres que describen en el formulario.",
    nivelMadurez: 2,
    dimensiones: [
      { clave: "completitud", nivel: null, evidencia: null, impacto: "Reportes incompletos." },
      { clave: "unicidad", nivel: 1, evidencia: "Mencionan clientes repetidos.", impacto: "Doble conteo." },
      { clave: "consistencia", nivel: null, evidencia: null, impacto: "Cifras que no cuadran." },
      { clave: "vigencia", nivel: null, evidencia: null, impacto: "Datos de ayer." },
    ],
    hipotesisCausaRaiz: "Sin una fuente única, cada área mantiene su propia copia.",
    procesosManuales: [
      { proceso: "Consolidación mensual", impactoOperativo: "Tres días de una persona." },
    ],
    riesgos: [
      { titulo: "Dependencia de una persona", severidad: "alta", impactoNegocio: "Si se va, nadie sabe rehacerlo." },
      { titulo: "Errores de tipeo", severidad: "media", impactoNegocio: "Decisiones sobre cifras equivocadas." },
    ],
    quickWins: [
      { accion: "Centralizar la fuente de ventas", esfuerzo: "1 semana", impacto: "Elimina la reconciliación.", fraccionHorasLiberadas: 0.3 },
      { accion: "Automatizar el reporte mensual", esfuerzo: "2 semanas", impacto: "Libera tres días al mes.", fraccionHorasLiberadas: 0.2 },
      { accion: "Validaciones de carga", esfuerzo: "3 días", impacto: "Corta los errores de tipeo.", fraccionHorasLiberadas: null },
    ],
    servicioRecomendado: "quick-win",
    justificacionServicio: "El dolor está acotado y se resuelve en semanas, no en meses.",
    preguntasDiscovery: [
      "¿El ERP expone una API o solo permite exportar archivos?",
      "¿Cuántos registros duplicados hay realmente en la base de clientes?",
      "¿Quién es hoy el dueño del dato de ventas?",
    ],
    senalesDeAlerta: [],
    ...cambios,
  };
}

describe("salidaAssessmentSchema — el camino feliz", () => {
  it("acepta una salida bien formada", () => {
    expect(salidaAssessmentSchema.safeParse(salida()).success).toBe(true);
  });
});

describe("salidaAssessmentSchema — nivel y evidencia van juntos", () => {
  /**
   * Un "unicidad: 1" derivado de que alguien escribió "tenemos clientes
   * repetidos" es una hipótesis razonable. Derivado de nada es un número
   * inventado con apariencia de medición, y el documento lo muestra como si
   * alguien hubiera perfilado la base.
   */
  it("rechaza un nivel no-nulo sin evidencia", () => {
    const roto = salida({
      dimensiones: [
        { clave: "completitud", nivel: 3, evidencia: null, impacto: "Algo." },
        { clave: "unicidad", nivel: null, evidencia: null, impacto: "Algo." },
        { clave: "consistencia", nivel: null, evidencia: null, impacto: "Algo." },
        { clave: "vigencia", nivel: null, evidencia: null, impacto: "Algo." },
      ],
    });
    expect(salidaAssessmentSchema.safeParse(roto).success).toBe(false);
  });

  /** La combinación inversa sí es válida, y es la que más se va a dar. */
  it("acepta evidencia cualitativa sin nivel", () => {
    const ok = salida({
      dimensiones: [
        { clave: "completitud", nivel: null, evidencia: "Faltan RUTs.", impacto: "Algo." },
        { clave: "unicidad", nivel: null, evidencia: null, impacto: "Algo." },
        { clave: "consistencia", nivel: null, evidencia: null, impacto: "Algo." },
        { clave: "vigencia", nivel: null, evidencia: null, impacto: "Algo." },
      ],
    });
    expect(salidaAssessmentSchema.safeParse(ok).success).toBe(true);
  });

  it("exige las cuatro dimensiones", () => {
    const tres = salida({ dimensiones: salida().dimensiones.slice(0, 3) });
    expect(salidaAssessmentSchema.safeParse(tres).success).toBe(false);
  });
});

describe("salidaAssessmentSchema — el catálogo acota al modelo", () => {
  /**
   * El enum sale de `content/servicios.ts`. Es lo que impide que el agente
   * recomiende un servicio que la consultora no vende.
   */
  it("rechaza un slug de servicio inventado", () => {
    const roto = salida({ servicioRecomendado: "migracion-a-snowflake" });
    expect(salidaAssessmentSchema.safeParse(roto).success).toBe(false);
  });

  it("acepta cualquier slug real del catálogo", () => {
    expect(
      salidaAssessmentSchema.safeParse(salida({ servicioRecomendado: "finops" }))
        .success,
    ).toBe(true);
  });
});

describe("salidaAssessmentSchema — rangos y cantidades", () => {
  it.each([-1, 5, 2.5])("rechaza nivelMadurez=%s", (nivel) => {
    expect(salidaAssessmentSchema.safeParse(salida({ nivelMadurez: nivel })).success).toBe(
      false,
    );
  });

  it("exige exactamente tres quick wins", () => {
    const dos = salida({ quickWins: salida().quickWins.slice(0, 2) });
    expect(salidaAssessmentSchema.safeParse(dos).success).toBe(false);
  });

  it("rechaza una fracción de horas fuera de 0..1", () => {
    const roto = salida({
      quickWins: salida().quickWins.map((q) => ({ ...q, fraccionHorasLiberadas: 1.5 })),
    });
    expect(salidaAssessmentSchema.safeParse(roto).success).toBe(false);
  });

  /**
   * La válvula de escape del §6: sin un lugar donde poner lo que no sabe, el
   * modelo inventa para llenar las otras secciones. Menos de tres preguntas es
   * señal de que no la usó.
   */
  it("exige al menos tres preguntas de discovery", () => {
    const dos = salida({ preguntasDiscovery: ["¿Una?", "¿Dos?"] });
    expect(salidaAssessmentSchema.safeParse(dos).success).toBe(false);
  });
});
