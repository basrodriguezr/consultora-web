/**
 * Textos del hero — lo primero que lee un visitante y la copy que más se ajusta
 * con el tiempo. Por eso vive acá y no dentro del componente.
 *
 * `tituloDestacado` se renderiza en una segunda línea con `.text-gradient`;
 * `titulo` va arriba, en `text-fg`.
 *
 * El hero de producción (ago-2026) usa pregunta como headline — alineado con
 * patrón comercial validado: "pregunta que pinte una imagen > statement".
 * La bajada promete sin mencionar AWS (universal para los prospectos reales).
 */
export const hero = {
  titulo: "¿Tu equipo sigue armando reportes a mano",
  tituloDestacado: "todas las semanas?",
  bajada:
    "En 2 semanas te decimos qué automatizar y qué dejar como está. Sin cambiar de sistema, sin dependencia, precio cerrado.",
  /**
   * Línea de credenciales bajo el CTA. Se renderiza en `--font-mono` y en
   * `text-subtle`: es prueba, no titular.
   */
  proof: [
    "8+ años en producción · Sector financiero regulado",
    "Empresas medianas en Chile",
    "Resultados en semanas, no meses",
  ],
} as const;
