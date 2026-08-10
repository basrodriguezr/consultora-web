import { describe, expect, it } from "vitest";

import { califica, calificar } from "@/lib/assessment/calificacion";
import type { LeadAssessmentNormalizado } from "@/lib/leads";

/**
 * Estos tests dejaron de ser cobertura el 2026-08-09.
 *
 * Hasta esa fecha la calificación solo cambiaba el asunto de un email: un falso
 * positivo costaba 30 segundos de lectura. Desde la decisión de Daniela,
 * **suprime** — un `probablemente-no` no ve el Calendly y no genera
 * pre-diagnóstico. O sea que un falso positivo ahora significa que un lead de
 * entre $3M y $50M CLP no recibe nada y nadie se entera.
 *
 * Lo único que separa esos dos mundos es la regla de tres señales conjuntas y
 * estos tests. Si alguno se pone en amarillo, no se ajusta el test: se revisa
 * la regla.
 */

/** Lead que NO descalifica por ninguna señal. Cada test rompe lo que necesita. */
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

/** Las tres señales negativas duras, juntas. */
const LAS_TRES: Partial<LeadAssessmentNormalizado> = {
  presupuesto: "sin-presupuesto",
  personasConDatos: 1,
  urgencia: "baja",
};

describe("calificar — solo descalifica por conjunción", () => {
  it("descalifica cuando se cumplen las tres señales", () => {
    expect(calificar(lead(LAS_TRES))).toBe("probablemente-no");
  });

  it("descalifica también con cero personas trabajando con datos", () => {
    expect(calificar(lead({ ...LAS_TRES, personasConDatos: 0 }))).toBe(
      "probablemente-no",
    );
  });

  /**
   * El corazón de la regla. Cada señal suelta es ruido: "sin presupuesto" en un
   * primer contacto casi siempre significa "todavía no hay línea asignada", y
   * una sola persona tocando datos describe a media PYME mediana chilena.
   */
  it.each([
    ["solo sin presupuesto", { presupuesto: "sin-presupuesto" as const }],
    ["solo una persona", { personasConDatos: 1 }],
    ["solo urgencia baja", { urgencia: "baja" as const }],
  ])("NO descalifica con %s", (_caso, cambio) => {
    expect(calificar(lead(cambio))).toBe("a-evaluar");
  });

  it.each([
    [
      "sin presupuesto + una persona",
      { presupuesto: "sin-presupuesto" as const, personasConDatos: 1 },
    ],
    [
      "sin presupuesto + urgencia baja",
      { presupuesto: "sin-presupuesto" as const, urgencia: "baja" as const },
    ],
    [
      "una persona + urgencia baja",
      { personasConDatos: 1, urgencia: "baja" as const },
    ],
  ])("NO descalifica con dos señales: %s", (_caso, cambio) => {
    expect(calificar(lead(cambio))).toBe("a-evaluar");
  });
});

describe("calificar — horasSemanaProceso nunca descalifica", () => {
  /**
   * Daniela había sugerido `>5 h/semana` como umbral. Se rechazó porque el
   * campo admite `"no-se"`, y *"no sé cuántas horas nos consume"* no es señal
   * de problema chico: es falta de visibilidad, que es literalmente lo que
   * vende la consultora. El umbral descartaría al cliente ideal.
   */
  it.each(["<5", "5-15", "15-40", ">40", "no-se"] as const)(
    "con horasSemanaProceso=%s el resultado no cambia",
    (rango) => {
      expect(calificar(lead({ horasSemanaProceso: rango }))).toBe("a-evaluar");
    },
  );

  it("tampoco descalifica cuando no se respondió", () => {
    expect(calificar(lead({ horasSemanaProceso: undefined }))).toBe("a-evaluar");
  });

  /**
   * El caso que más importa: quien no midió sus horas, pero además tiene las
   * tres señales negativas, cae por las tres — no por no haber medido. Si
   * alguna vez alguien agrega las horas a la regla, este test no lo detecta;
   * el de arriba sí.
   */
  it("un 'no-se' con las tres señales sigue cayendo por las tres", () => {
    expect(calificar(lead({ ...LAS_TRES, horasSemanaProceso: "no-se" }))).toBe(
      "probablemente-no",
    );
  });
});

describe("califica — la puerta del §8", () => {
  it("solo cierra la puerta a 'probablemente-no'", () => {
    expect(califica("probablemente-no")).toBe(false);
    expect(califica("a-evaluar")).toBe(true);
    expect(califica("calificado")).toBe(true);
  });
});
