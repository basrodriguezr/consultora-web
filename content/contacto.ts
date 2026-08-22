/**
 * Cabecera de la sección de contacto — el bloque de conversión.
 *
 * El headline de producción ("¿Qué haría tu equipo si esos reportes se armaran
 * solos?") es costo de oportunidad puro — alineado con el patrón validado de
 * no criticar el proceso actual. Se mantiene.
 *
 * Los trust signals son mejora nueva: reducen fricción justo antes del form.
 */

export const contacto = {
  titulo: "¿Qué haría tu equipo si esos reportes se armaran solos?",
  bajada:
    "30 minutos de conversación. Te damos una perspectiva honesta de si lo que hacemos aplica para tu caso — o no.",
  /** Trust signals que se renderizan como badges antes del formulario. */
  trustSignals: [
    "100% confidencial",
    "Sin compromiso de compra",
    "Respuesta en menos de 24h",
  ],
} as const;
