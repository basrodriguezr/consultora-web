/**
 * Textos del hero — lo primero que lee un visitante y la copy que más se ajusta
 * con el tiempo. Por eso vive acá y no dentro del componente.
 *
 * `tituloDestacado` se renderiza en una segunda línea con `.text-gradient`;
 * `titulo` va arriba, en `text-fg`.
 *
 * Voz plural, sin lenguaje corporativo abstracto y sin nombres propios: son las
 * tres reglas de copy de la spec del rediseño.
 */

/**
 * ⚠️ El titular NO lleva cifras, y es deliberado.
 *
 * La versión aprobada en `fix1` decía "+1.000 horas al año". Ese número se
 * apoyaba en un único lugar de la página —las 1.100 horas del caso real— y ese
 * bloque se quitó el 2026-07-31. Un titular con una cifra que nada en la página
 * respalda es peor que uno sin cifra: es la afirmación más visible del sitio y
 * la primera que un CTO va a pedir que justifiquen.
 *
 * Si vuelve una prueba cuantificada a la página, el titular puede volver a
 * hablar en números. Mientras tanto, la promesa es concreta pero no numérica.
 */
export const hero = {
  titulo: "¿Tu equipo sigue armando reportes a mano",
  tituloDestacado: "todas las semanas?",
  bajada:
    "En 2 semanas te decimos qué se puede automatizar y qué dejar como está. Sin cambiar de sistema, sin dependencia, sin sorpresas.",
  /**
   * Línea de credenciales bajo el CTA. Se renderiza en `--font-mono` y en
   * `text-subtle`: es prueba, no titular.
   */
  proof: [
    "Cloud Certified",
    "Producción en industria regulada",
    "Resultados en semanas, no meses",
  ],
} as const;
