import { describe, expect, it } from "vitest";

import { servicios } from "@/content/servicios";
import { rangosInversion } from "@/lib/assessment/catalogo-interno";
import {
  POSICIONES_RANGO,
  calcularInversion,
  pesosLegibles,
} from "@/lib/propuesta/precios";

/**
 * Los tests de la aritmética de una oferta comercial.
 *
 * El criterio es el de siempre en este repo: se prueba lo que puede salir mal en
 * un documento que alguien firma, no se persigue cobertura.
 */

describe("calcularInversion — posición dentro del rango", () => {
  it("`bajo` cotiza el borde inferior del catálogo", () => {
    const { netoCLP } = calcularInversion("quick-win", "bajo", 4);
    expect(netoCLP).toBe(rangosInversion["quick-win"].min);
  });

  it("`alto` cotiza el borde superior", () => {
    const { netoCLP } = calcularInversion("quick-win", "alto", 4);
    expect(netoCLP).toBe(rangosInversion["quick-win"].max);
  });

  it("`medio` cotiza el punto medio", () => {
    const { min, max } = rangosInversion["quick-win"];
    const { netoCLP } = calcularInversion("quick-win", "medio", 4);
    expect(netoCLP).toBe((min + max) / 2);
  });

  it("el monto sale del catálogo, no de una tabla paralela", () => {
    // Si alguien duplicara los montos acá, este test seguiría pasando pero el
    // día que cambie `catalogo-interno.ts` la propuesta cotizaría lo viejo.
    // Recorrer los siete servicios contra la fuente es lo que lo impide.
    for (const { slug } of servicios) {
      expect(calcularInversion(slug, "bajo", 8).netoCLP).toBe(
        rangosInversion[slug].min,
      );
      expect(calcularInversion(slug, "alto", 8).netoCLP).toBe(
        rangosInversion[slug].max,
      );
    }
  });
});

describe("calcularInversion — la tabla de pago tiene que cuadrar", () => {
  /**
   * 🛑 El test que justifica que el segundo hito sea el resto y no otro 50%.
   *
   * Dos mitades redondeadas por separado pueden sumar un peso más o menos que el
   * total. En una tabla de forma de pago eso es una fila que no cuadra con la de
   * arriba, dentro de un documento que se firma.
   */
  it("los dos hitos suman exactamente el neto, en los 21 casos del catálogo", () => {
    for (const { slug } of servicios) {
      for (const posicion of POSICIONES_RANGO) {
        const { netoCLP, hitos } = calcularInversion(slug, posicion, 8);
        const suma = hitos[0].montoCLP + hitos[1].montoCLP;
        expect(suma, `${slug} · ${posicion}`).toBe(netoCLP);
      }
    }
  });

  it("el neto siempre cae dentro del rango del catálogo", () => {
    for (const { slug } of servicios) {
      for (const posicion of POSICIONES_RANGO) {
        const { netoCLP } = calcularInversion(slug, posicion, 8);
        expect(netoCLP).toBeGreaterThanOrEqual(rangosInversion[slug].min);
        expect(netoCLP).toBeLessThanOrEqual(rangosInversion[slug].max);
      }
    }
  });

  it("el IVA es el 19% y el total con IVA es la suma", () => {
    const { netoCLP, ivaCLP, totalConIvaCLP } = calcularInversion(
      "finops",
      "medio",
      6,
    );
    expect(ivaCLP).toBe(Math.round(netoCLP * 0.19));
    expect(totalConIvaCLP).toBe(netoCLP + ivaCLP);
  });

  it("el segundo hito se ancla a la semana de entrega que le pasan", () => {
    // Viene del alcance, no de un campo aparte: es lo que impide que la forma de
    // pago prometa una semana que el timeline no tiene.
    const { hitos } = calcularInversion("pipeline-productivo", "medio", 12);
    expect(hitos[1].cuando).toBe("Semana 12");
  });
});

describe("pesosLegibles", () => {
  it("imprime pesos exactos con separador de miles chileno", () => {
    expect(pesosLegibles(4_500_000)).toBe("$4.500.000");
  });

  /**
   * La diferencia deliberada con `montoLegible()` del pre-diagnóstico, que
   * emite `$4,5M CLP`. Acá la cifra es la que va a una factura: nadie factura
   * "4,5 millones".
   */
  it("no abrevia en millones", () => {
    expect(pesosLegibles(12_000_000)).not.toContain("M");
    expect(pesosLegibles(12_000_000)).toBe("$12.000.000");
  });
});
