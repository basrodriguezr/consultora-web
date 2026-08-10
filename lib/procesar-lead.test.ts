import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { procesarLead } from "@/lib/procesar-lead";
import type {
  LeadAssessmentNormalizado,
  LeadContactoNormalizado,
} from "@/lib/leads";

/**
 * El orquestador decide **qué** le pasa a un lead; el route decide cómo se
 * responde. Estos tests cubren el despacho y la garantía que sostiene toda la
 * Fase 2: el email con las respuestas crudas sale siempre.
 *
 * No hay mock de Resend y no hace falta: sin `RESEND_API_KEY` el envío corta
 * antes de tocar la red y devuelve `sin-configurar`. Lo que se verifica acá es
 * el flujo, no el proveedor.
 */

const original = process.env.RESEND_API_KEY;

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  if (original === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = original;
});

function contacto(): LeadContactoNormalizado {
  return {
    tipo: "contacto",
    nombre: "Ana Pérez",
    email: "ana@acme.cl",
    rol: "gerente-ti",
    desafio: "costos-cloud",
    recibidoEn: "2026-08-09T12:00:00.000Z",
  };
}

function assessment(
  cambios: Partial<LeadAssessmentNormalizado> = {},
): LeadAssessmentNormalizado {
  return {
    tipo: "assessment",
    nombre: "Ana Pérez",
    email: "ana@acme.cl",
    empresa: "Acme SpA",
    problemaPrincipal: "Los reportes mensuales se arman a mano y tardan días.",
    solucionActual: "Planillas Excel que consolida una persona.",
    fuentesDatos: ["erp"],
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

describe("procesarLead — despacho por tipo", () => {
  it("un lead de contacto vuelve etiquetado como contacto", async () => {
    const resultado = await procesarLead(contacto());
    expect(resultado.tipo).toBe("contacto");
  });

  it("un lead de assessment vuelve etiquetado como assessment", async () => {
    const resultado = await procesarLead(assessment());
    expect(resultado.tipo).toBe("assessment");
  });

  /**
   * El resultado de contacto **no** tiene `calificado`. Es lo que impide que
   * alguien lo lea en la rama equivocada y decida mostrar una agenda basándose
   * en un `undefined`.
   */
  it("el resultado de contacto no trae calificación", async () => {
    const resultado = await procesarLead(contacto());
    expect(resultado).not.toHaveProperty("calificado");
  });
});

describe("procesarLead — la puerta del §8", () => {
  it("un lead que califica habilita el Calendly", async () => {
    const resultado = await procesarLead(assessment());
    expect(resultado.tipo === "assessment" && resultado.calificado).toBe(true);
  });

  it("las tres señales negativas cierran la puerta", async () => {
    const resultado = await procesarLead(
      assessment({
        presupuesto: "sin-presupuesto",
        personasConDatos: 1,
        urgencia: "baja",
      }),
    );
    expect(resultado.tipo === "assessment" && resultado.calificado).toBe(false);
  });

  /**
   * La garantía que hace viable suprimir el Calendly y el pre-diagnóstico:
   * **el email #1 se intenta igual.** Un lead que llenó un formulario largo y
   * dejó su correo tiene que aparecer en la bandeja, califique o no. Si esto se
   * rompe, la supresión pasa a ser silenciosa y el lead desaparece.
   */
  it("un lead descalificado igual dispara el email con las respuestas crudas", async () => {
    const resultado = await procesarLead(
      assessment({
        presupuesto: "sin-presupuesto",
        personasConDatos: 0,
        urgencia: "baja",
      }),
    );

    // Sin API key el envío falla, pero por `sin-configurar`: o sea llegó hasta
    // el envío en vez de haberse saltado el paso.
    expect(resultado.envio.ok).toBe(false);
    if (!resultado.envio.ok) {
      expect(resultado.envio.motivo).toBe("sin-configurar");
    }
  });
});
