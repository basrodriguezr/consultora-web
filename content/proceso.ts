/**
 * Cómo funciona — tres pasos con timeline explícito.
 *
 * Cada paso ahora tiene `tiempo` para reducir la incertidumbre del comprador
 * ("¿cuánto de mi tiempo me va a costar?") y `detalle` con una frase que baja
 * la fricción percibida.
 *
 * `numero` es string (`"01"`) y no number a propósito: se renderiza en
 * `--font-mono` con el cero a la izquierda.
 */

export interface Paso {
  numero: string;
  titulo: string;
  descripcion: string;
  /** Indicador de tiempo / esfuerzo para el prospecto. */
  tiempo: string;
  /** Frase que elimina una fricción específica de ese paso. */
  garantia: string;
}

export const tituloProceso = "Cómo funciona";
export const subtituloProceso = "De la conversación al resultado en menos de un mes";

export const proceso: Paso[] = [
  {
    numero: "01",
    titulo: "Conversación de diagnóstico",
    descripcion:
      "30 minutos para entender tu operación y tus dolores. Sin presentaciones de 40 páginas, sin pitch de venta.",
    tiempo: "30 min · gratis",
    garantia: "Si no aplica lo que hacemos, te lo decimos ahí mismo.",
  },
  {
    numero: "02",
    titulo: "Propuesta con alcance y precio cerrado",
    descripcion:
      "En 48 horas recibes un documento con qué vamos a hacer, cuánto toma y cuánto cuesta. Sin ambigüedades.",
    tiempo: "48 horas",
    garantia: "Precio fijo. Sin extras, sin letra chica.",
  },
  {
    numero: "03",
    titulo: "Diagnóstico + primeras mejoras en tu infraestructura",
    descripcion:
      "Entramos a tu infraestructura, documentamos el estado real y te entregamos un roadmap priorizado con 3 acciones inmediatas.",
    tiempo: "2 semanas",
    garantia: "Todo en tu cuenta cloud. Si no encontramos valor, no seguimos.",
  },
];
