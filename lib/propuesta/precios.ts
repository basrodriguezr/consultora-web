import "server-only";

import type { SlugServicio } from "@/content/servicios";
import { rangosInversion } from "@/lib/assessment/catalogo-interno";

/**
 * Las cifras de la propuesta. **Ninguna la produce el modelo.**
 *
 * Es la misma regla de `lib/assessment/costos.ts` y acá pesa más: el
 * pre-diagnóstico es un email interno a Daniela, la propuesta **es una oferta
 * comercial** que se firma. Un LLM que multiplica bien "casi siempre" no es el
 * estándar para el número que va en una tabla de forma de pago.
 *
 * El modelo aporta dos cosas y las dos son cualitativas: **qué servicio** del
 * catálogo (un enum, así que no puede inventar uno) y **en qué parte del rango**
 * cae el proyecto (`bajo | medio | alto`, con justificación). El peso, el IVA y
 * los hitos salen de acá.
 *
 * `server-only` porque importa `catalogo-interno`: los rangos en CLP no pueden
 * terminar en un bundle del navegador. Es la garantía que no depende de que
 * nadie se distraiga — un Client Component que llegue hasta acá rompe el build.
 */

/**
 * Dónde cae el proyecto dentro del rango del servicio.
 *
 * Tres posiciones y no un número: pedirle al modelo un porcentaje del rango
 * sería pedirle una cifra por la puerta de atrás. `alto` contra `bajo` es un
 * juicio que se puede fundamentar leyendo las notas ("cuatro fuentes, plazo
 * apretado, sin equipo interno"); "el 68% del rango" no.
 */
export const POSICIONES_RANGO = ["bajo", "medio", "alto"] as const;

export type PosicionRango = (typeof POSICIONES_RANGO)[number];

/**
 * IVA chileno. Va como constante nombrada y no como `* 1.19` suelto: es una
 * tasa legal y el día que cambie tiene que cambiar en un solo lugar.
 */
const TASA_IVA = 0.19;

/**
 * Los montos se redondean a medio millón de pesos.
 *
 * Una oferta que dice `$4.375.000` finge una precisión que el cálculo no tiene
 * —sale de un rango de catálogo, no de un presupuesto detallado— e invita a
 * regatear sobre los dígitos. Así se conversan estos montos en Chile.
 *
 * Con el catálogo actual el redondeo es casi siempre un no-op (los rangos están
 * en millones enteros y sus puntos medios caen en múltiplos de 0,5M). Existe
 * para el día que alguien edite `catalogo-interno.ts` con un borde que no sea
 * redondo: sin esto, ese día aparece un `$4.375.000` en una propuesta y nadie
 * lo relaciona con el commit que lo causó.
 */
const PASO_REDONDEO = 500_000;

function redondear(clp: number): number {
  return Math.round(clp / PASO_REDONDEO) * PASO_REDONDEO;
}

/** Porcentaje de cada hito de pago. El §6 del template los fija en 50/50. */
const PORCENTAJE_HITO_INICIO = 0.5;

export interface HitoPago {
  concepto: string;
  porcentaje: number;
  montoCLP: number;
  cuando: string;
}

export interface Inversion {
  /** Servicio del catálogo sobre el que se cotiza. */
  servicio: SlugServicio;
  posicion: PosicionRango;
  /** Monto neto, redondeado. Es la cifra que encabeza la tabla del §6. */
  netoCLP: number;
  ivaCLP: number;
  totalConIvaCLP: number;
  /** Los dos hitos del §6. Suman exactamente `netoCLP`. */
  hitos: [HitoPago, HitoPago];
}

/**
 * Del rango del catálogo al número que va en la oferta.
 *
 * `medio` es el punto medio del rango, no un valor tabulado: si mañana el rango
 * de un servicio cambia en `catalogo-interno.ts`, las tres posiciones se mueven
 * solas. Duplicar los montos acá sería la clase de fuente de verdad paralela que
 * este proyecto ya pagó una vez.
 */
function montoNeto(servicio: SlugServicio, posicion: PosicionRango): number {
  const { min, max } = rangosInversion[servicio];

  const bruto =
    posicion === "bajo" ? min : posicion === "alto" ? max : (min + max) / 2;

  return redondear(bruto);
}

/**
 * Calcula la inversión completa: neto, IVA y los dos hitos de pago.
 *
 * `semanaEntrega` viene del alcance (la última semana de la tabla de
 * entregables), **no de un campo aparte**. Ver `render.ts`: el §4 del documento
 * se deriva del §3 justamente para que el timeline y la forma de pago no puedan
 * contradecirse.
 */
export function calcularInversion(
  servicio: SlugServicio,
  posicion: PosicionRango,
  semanaEntrega: number,
): Inversion {
  const netoCLP = montoNeto(servicio, posicion);
  const ivaCLP = Math.round(netoCLP * TASA_IVA);

  /*
   * 🛑 El segundo hito es el RESTO, no otro 50% calculado.
   *
   * Con un neto impar, `round(n * 0.5)` dos veces puede dar dos mitades que
   * suman un peso más o un peso menos que el total. En una tabla de forma de
   * pago eso es una fila que no cuadra con la de arriba, en un documento que
   * alguien firma: el lector no piensa "error de redondeo", piensa que la
   * consultora no sabe sumar. Restar garantiza el cuadre por construcción.
   */
  const montoInicio = Math.round(netoCLP * PORCENTAJE_HITO_INICIO);
  const montoEntrega = netoCLP - montoInicio;

  return {
    servicio,
    posicion,
    netoCLP,
    ivaCLP,
    totalConIvaCLP: netoCLP + ivaCLP,
    hitos: [
      {
        concepto: "Inicio del proyecto",
        porcentaje: 50,
        montoCLP: montoInicio,
        cuando: "Al firmar",
      },
      {
        concepto: "Entrega final",
        porcentaje: 50,
        montoCLP: montoEntrega,
        cuando: `Semana ${semanaEntrega}`,
      },
    ],
  };
}

/**
 * `$4.500.000`. **Pesos exactos, no millones abreviados.**
 *
 * ⚠️ Deliberadamente distinto de `montoLegible()` de `lib/assessment/costos.ts`,
 * que emite `$4,5M CLP`. No es inconsistencia: son dos documentos con dos
 * trabajos distintos. El pre-diagnóstico **estima** un dolor y la abreviatura
 * comunica bien esa imprecisión; la propuesta **cotiza**, y la cifra que se
 * imprime es la que va a ir en una factura. Nadie factura "4,5 millones".
 *
 * `es-CL` usa el punto como separador de miles, que es como se escribe en Chile.
 */
export function pesosLegibles(clp: number): string {
  return `$${clp.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}
