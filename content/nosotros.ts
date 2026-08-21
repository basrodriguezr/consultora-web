/**
 * Sección "Quiénes somos".
 *
 * Voz plural y por rol, sin nombres propios — es la narrativa aprobada
 * (2026-07-23) y la que sostiene que la marca sea `ArqData` y no una persona.
 */

export const nosotros = {
  titulo: "Quiénes somos",
  parrafos: [
    "8 años en producción con datos en industria regulada. La persona que habla contigo es la misma que se mete al sistema.",
    "Consultora chica, enfocada en empresas medianas en Chile. Sin intermediarios. Sin rotación. Sin sorpresas.",
  ],
  /** Se renderizan como badges en línea, en `--font-mono`. */
  credenciales: [
    "Cloud Certified",
    "Producción en industria regulada",
    "Ingeniería Civil Informática",
  ],
} as const;
