import { describe, expect, it } from "vitest";

import {
  calcularCifras,
  montoLegible,
  montoOPorConfirmar,
} from "@/lib/assessment/costos";

/**
 * Estas son las cifras que llegan a una gerencia y que Daniela tiene que poder
 * defender en una reunión. Ninguna la produce el modelo — por eso se testean
 * como aritmética, que es lo que son.
 */

describe("calcularCifras — del rango declarado al costo anual", () => {
  /**
   * Siempre el borde inferior del rango. Es mejor que Daniela suba la cifra en
   * la discovery a que tenga que bajarla: una cifra sobreestimada en la primera
   * página cuesta la credibilidad de todas las siguientes.
   */
  it.each([
    ["<5", 3, 3 * 120_000 * 52],
    ["5-15", 5, 5 * 120_000 * 52],
    ["15-40", 15, 15 * 120_000 * 52],
    [">40", 40, 40 * 120_000 * 52],
  ] as const)("%s usa %i h/semana", (rango, horas, costo) => {
    const cifras = calcularCifras(rango, []);
    expect(cifras.horasSemana).toBe(horas);
    expect(cifras.costoAnual).toBe(costo);
  });

  /**
   * `"no-se"` no es "pocas horas": es falta de visibilidad. Rellenarlo con un
   * número inventaría el dolor del cliente, así que las tres cifras salen en
   * `null` y el documento imprime la marca de pendiente.
   */
  it("'no-se' deja las tres cifras en null, no en cero", () => {
    const cifras = calcularCifras("no-se", [0.5]);
    expect(cifras.horasSemana).toBeNull();
    expect(cifras.costoAnual).toBeNull();
    expect(cifras.ahorroAnual).toBeNull();
    expect(cifras.fraccionLiberada).toBeNull();
  });

  it("sin respuesta se comporta igual que 'no-se'", () => {
    expect(calcularCifras(undefined, [0.5]).costoAnual).toBeNull();
  });
});

describe("calcularCifras — ahorro y saturación", () => {
  it("suma las fracciones de los tres quick wins", () => {
    const cifras = calcularCifras("5-15", [0.2, 0.1, 0.1]);
    // 5 h × 120.000 × 52 = 31.200.000 · 40% = 12.480.000
    expect(cifras.fraccionLiberada).toBeCloseTo(0.4);
    expect(cifras.ahorroAnual).toBe(12_480_000);
  });

  /**
   * Tres quick wins que declaren 0.5, 0.4 y 0.3 darían un ahorro del 120% del
   * dolor declarado. Un ahorro mayor que el problema es aritméticamente
   * imposible y no puede llegar a un documento que alguien va a leer en una
   * reunión: se satura en 1 **antes** de multiplicar.
   */
  it("satura la suma en 1: el ahorro nunca supera al costo", () => {
    const cifras = calcularCifras("15-40", [0.5, 0.4, 0.3]);
    expect(cifras.fraccionLiberada).toBe(1);
    expect(cifras.ahorroAnual).toBe(cifras.costoAnual);
  });

  /** Una fracción que el modelo no pudo estimar no suma, pero tampoco resta. */
  it("las fracciones null cuentan como cero", () => {
    const cifras = calcularCifras("5-15", [0.2, null, null]);
    expect(cifras.fraccionLiberada).toBeCloseTo(0.2);
  });

  it("sin quick wins estimables el ahorro es cero, no null", () => {
    const cifras = calcularCifras("5-15", [null, null, null]);
    expect(cifras.ahorroAnual).toBe(0);
  });
});

describe("formato de montos", () => {
  it("escribe millones con un decimal y coma chilena", () => {
    expect(montoLegible(31_200_000)).toBe("$31,2M CLP");
    expect(montoLegible(3_000_000)).toBe("$3,0M CLP");
  });

  /** Nunca imprime `$0` donde no hay dato: son cosas distintas. */
  it("traduce null a la marca de pendiente", () => {
    expect(montoOPorConfirmar(null)).toBe("[por confirmar en discovery]");
    expect(montoOPorConfirmar(0)).toBe("$0,0M CLP");
  });
});
