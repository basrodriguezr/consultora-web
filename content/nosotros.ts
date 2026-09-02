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
      "8+ años diseñando plataformas de datos en producción. Experiencia en industria regulada, hoy enfocada en empresas medianas. La persona que habla contigo es la que ejecuta.",
  },
  socio: {
    nombre: "Bastián Rodríguez",
    rol: "Full Stack + IA · Socio técnico",
    experiencia:
      "Desarrollo web, agentes de IA y automatización. Construye las herramientas que hacen el trabajo pesado.",
  },
  parrafos: [
    "Arquitectura de datos, desarrollo y automatización con IA. Resolvemos el problema completo: desde el dato desordenado hasta el reporte funcionando solo en tu operación.",
    "Trabajamos directo, sin intermediarios. Quien responde somos nosotros. Nos quedamos hasta que tu equipo opere solo.",
  ],
  /** Se renderizan como badges en línea, en `--font-mono`. */
  credenciales: [
    "Cloud Certified",
    "8+ años en producción",
    "Datos + Desarrollo + IA",
  ],
} as const;
