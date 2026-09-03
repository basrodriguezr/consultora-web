import type { RangoHoras } from "@/lib/leads";

/**
 * Las cifras en pesos del pre-diagnóstico. **Ninguna la produce el modelo.**
 *
 * Un LLM multiplicando tres cifras acierta casi siempre, y "casi siempre" no es
 * el estándar para un número que llega a una gerencia y que Daniela va a tener
 * que defender en una reunión. Acá la aritmética es TypeScript y el modelo solo
 * aporta proporciones (`fraccionHorasLiberadas`).
 */

/**
 * Costo cargado de una hora de trabajo interno, en CLP.
 *
 * 📏 **$13.000, no una tarifa de venta.** Sale de un sueldo de ~$1,5M más cargas,
 * dividido en 160 horas al mes. Estuvo en `120_000` hasta el 2026-09-02, que es
 * tarifa de consultoría: con ese valor un proceso de 15 h/semana daba **$93,6M al
 * año**, y el mismo caso da ahora **$10,2M**.
 *
 * El comentario ya decía "interno" y el número era de venta — la intención estaba
 * bien y el valor no. Decisión de Daniela, y la razón importa: *"sé que es
 * conservador (subvalora el problema real, que es el atraso del cierre y las
 * cifras en conflicto, no solo el sueldo), pero prefiero un número que defienda
 * sin dudar"*. **Un monto que la gerencia puede discutir vale menos que uno más
 * chico que nadie discute.**
 */
const COSTO_HORA_CLP = 13_000;

const SEMANAS_POR_ANIO = 52;

/**
 * Del rango declarado al número que se multiplica.
 *
 * **Siempre el borde inferior, deliberadamente.** El documento va a una
 * gerencia que puede querer discutir la cifra, y es mejor que Daniela defienda
 * un número conservador y lo suba en la discovery a que tenga que bajarlo: una
 * cifra sobreestimada en la primera página cuesta la credibilidad de todas las
 * siguientes.
 *
 * `"no-se"` mapea a `null`, no a un valor por defecto. **No saber cuántas horas
 * consume un proceso no es lo mismo que consumir pocas** — es falta de
 * visibilidad, y rellenarlo con un número inventaría el dolor del cliente.
 */
const HORAS_POR_RANGO: Record<RangoHoras, number | null> = {
  "<5": 3,
  "5-15": 5,
  "15-40": 15,
  ">40": 40,
  "no-se": null,
};

/**
 * Las tres cifras del documento. `null` en cualquiera significa
 * `[por confirmar en discovery]`, nunca cero.
 */
export interface CifrasAssessment {
  /** Horas/semana usadas en el cálculo (borde inferior del rango declarado). */
  horasSemana: number | null;
  /** Costo anual del problema declarado, en CLP. */
  costoAnual: number | null;
  /** Ahorro estimado del paquete de quick wins en el año 1, en CLP. */
  ahorroAnual: number | null;
  /** Fracción total liberada, ya saturada a 1. */
  fraccionLiberada: number | null;
}

/**
 * Calcula las cifras a partir del rango declarado y de las fracciones que
 * estimó el modelo.
 *
 * **La suma de fracciones se satura en 1 antes de multiplicar.** Tres quick
 * wins que declaren 0.5, 0.4 y 0.3 darían un ahorro del 120% del dolor
 * declarado: un ahorro mayor que el problema es aritméticamente imposible y no
 * puede llegar a un documento que alguien va a leer en una reunión. Las
 * fracciones `null` (el modelo no pudo estimarla) cuentan como 0: no restan,
 * simplemente no suman.
 */
export function calcularCifras(
  rango: RangoHoras | undefined,
  fracciones: Array<number | null>,
): CifrasAssessment {
  const horasSemana = rango ? HORAS_POR_RANGO[rango] : null;

  if (horasSemana === null) {
    return {
      horasSemana: null,
      costoAnual: null,
      ahorroAnual: null,
      fraccionLiberada: null,
    };
  }

  const costoAnual = horasSemana * COSTO_HORA_CLP * SEMANAS_POR_ANIO;

  const suma = fracciones.reduce<number>(
    (acumulado, fraccion) => acumulado + (fraccion ?? 0),
    0,
  );
  const fraccionLiberada = Math.min(suma, 1);

  return {
    horasSemana,
    costoAnual,
    ahorroAnual: Math.round(costoAnual * fraccionLiberada),
    fraccionLiberada,
  };
}

/**
 * `$18,7M CLP`. Un decimal: más precisión finge exactitud que la cifra no
 * tiene, y menos borra la diferencia entre $3,4M y $3,9M.
 *
 * `es-CL` usa la coma como separador decimal, que es como se escribe en Chile.
 */
export function montoLegible(clp: number): string {
  const millones = clp / 1_000_000;
  return `$${millones.toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}M CLP`;
}

/** Texto de una cifra que puede no existir. Nunca imprime `$0`. */
export function montoOPorConfirmar(clp: number | null): string {
  return clp === null ? "[por confirmar en discovery]" : montoLegible(clp);
}
