/**
 * Sección "Quiénes somos".
 *
 * Persona visible con nombre y experiencia concreta (estilo Credence).
 * El comprador quiere saber CON QUIÉN va a trabajar.
 */

export const nosotros = {
  titulo: "Quiénes somos",
  fundadora: {
    nombre: "Daniela Chávez",
    rol: "Data Architect · Fundadora",
    experiencia:
      "8+ años diseñando plataformas de datos en producción. Industria financiera regulada (pensiones) en Chile. La persona que habla contigo es la que ejecuta.",
  },
  socio: {
    nombre: "Bastián Rodríguez",
    rol: "Full Stack + IA · Socio técnico",
    experiencia:
      "Desarrollo web, agentes de IA y automatización. Construye las herramientas que hacen el trabajo pesado.",
  },
  parrafos: [
    "Combinamos arquitectura de datos, desarrollo e inteligencia artificial. Eso nos permite resolver el problema completo: desde el dato crudo hasta el producto funcionando en tu operación.",
    "Trabajamos directo, sin intermediarios. Quien responde somos nosotros. Nos quedamos hasta que tu equipo opere solo.",
  ],
  /** Se renderizan como badges en línea, en `--font-mono`. */
  credenciales: [
    "Cloud Certified",
    "8+ años en producción",
    "Datos + Desarrollo + IA",
  ],
} as const;
