/**
 * Sección "Quiénes somos".
 *
 * No dar número de personas. Transmitir: equipo senior, combinación rara
 * (datos + dev + IA), enfocado, comprometido. El tamaño se siente como
 * virtud (agilidad, dedicación) no como limitación.
 */

export const nosotros = {
  titulo: "Quiénes somos",
  parrafos: [
    "Un equipo técnico senior que combina arquitectura de datos, desarrollo e inteligencia artificial. Eso nos permite resolver el problema completo: desde el dato crudo hasta el producto funcionando en tu operación.",
    "Trabajamos directo, sin intermediarios. Si necesitamos más manos para un proyecto, las traemos — pero quien responde somos nosotros. Nos quedamos hasta que tu equipo opere solo.",
  ],
  /** Se renderizan como badges en línea, en `--font-mono`. */
  credenciales: [
    "Cloud Certified",
    "Datos + Desarrollo + IA",
  ],
} as const;
