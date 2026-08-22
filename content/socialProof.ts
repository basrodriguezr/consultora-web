/**
 * Social Proof — datos de mercado que validan la urgencia sin necesitar un caso
 * cliente específico.
 *
 * Cada dato tiene fuente verificable. Se muestran como "estadísticas de
 * industria" entre Dolor y Diferencial: después de que el visitante se reconoce
 * en un dolor, los datos le confirman que no es un caso aislado y que hay
 * presión externa para actuar (Ley 21.719, AI readiness).
 *
 * Fuentes:
 * - Nucleus Research: 40-80% del tiempo de equipos de datos se va en preparar datos
 * - Dun & Bradstreet 2026 (10K empresas, 32 países): 97% tiene proyectos IA, 5% datos listos
 * - Gartner: 83% cita calidad de datos como principal desafío IA
 * - BCN Chile: Ley 21.719 vigencia plena 1 dic 2026, multas hasta 20.000 UTM
 */

export interface DatoProof {
  /** Número o porcentaje impactante. */
  cifra: string;
  /** Qué significa ese número. */
  contexto: string;
  /** Fuente abreviada para credibilidad. */
  fuente: string;
}

export const tituloSocialProof = "No es solo tu empresa — es el mercado entero";

export const datos: DatoProof[] = [
  {
    cifra: "97%",
    contexto: "de las empresas tiene proyectos de IA activos, pero solo el 5% tiene datos listos para alimentarlos.",
    fuente: "Dun & Bradstreet, 2026",
  },
  {
    cifra: "40-80%",
    contexto: "del tiempo de los equipos de datos se gasta en preparar y limpiar información — no en analizarla.",
    fuente: "Nucleus Research",
  },
  {
    cifra: "Hasta $1.320M",
    contexto: "CLP en multas por la Ley 21.719 de Datos Personales (vigente diciembre 2026). La mayoría de las medianas no tiene inventario de datos personales.",
    fuente: "BCN Chile",
  },
];

export const cierreSocialProof =
  "Las empresas que resuelven su base de datos hoy van a poder usar IA mañana. Las que no, van a pagar consultoras de emergencia al triple.";
