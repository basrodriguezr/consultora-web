/**
 * Diferenciales del home — respuestas a las tres objeciones más comunes.
 *
 * Cada diferencial responde una objeción real que un CTO, Gerente TI o
 * Finanzas trae a la mesa cuando evalúa una consultora externa:
 *   1. "¿Puedes con esto sola?" → Senior directo, sin capas
 *   2. "¿Nos quedamos atrapados?" → Cero dependencia, todo tuyo
 *   3. "¿Cuánto va a costar?" → Riesgo acotado, precio fijo
 *
 * Voz plural y por rol, sin nombres propios: es la narrativa aprobada.
 */

/**
 * Acentos disponibles. Son **roles**, no colores: cada tema les asigna un valor
 * distinto (en claro `calido` es tierra quemada, en oscuro es ámbar pálido).
 */
export type Acento = "marca" | "calido" | "agua" | "alterno";

export interface Diferencial {
  titulo: string;
  /** Objeción que resuelve, en voz del prospecto. */
  objecion: string;
  descripcion: string;
  /** Selecciona el ícono SVG en el componente. */
  icono: "persona" | "candado" | "diana";
  acento: Acento;
}

export const tituloDiferencial = "¿Por qué nosotros y no una consultora grande?";

export const diferenciales: Diferencial[] = [
  {
    titulo: "La persona que habla contigo es la que ejecuta",
    objecion: "\"¿Puedes con esto? ¿No es muy chico el equipo?\"",
    descripcion:
      "Sin capas de gestión, sin juniors rotando. Tú hablas con un senior y ese senior se mete al sistema. 8+ años en producción en industria regulada.",
    icono: "persona",
    acento: "marca",
  },
  {
    titulo: "Todo queda en tu cuenta — si nos vamos, sigues operando",
    objecion: "\"¿Nos van a dejar amarrados a su plataforma?\"",
    descripcion:
      "Código tuyo, infraestructura tuya, documentación tuya. Cero licencias nuestras, cero vendor lock-in. Si no nos necesitas más, sigues operando solo.",
    icono: "candado",
    acento: "alterno",
  },
  {
    titulo: "Empezamos con un diagnóstico acotado: 2 semanas, precio fijo",
    objecion: "\"¿Cuánto va a costar? No tenemos presupuesto para un proyecto grande.\"",
    descripcion:
      "Si no encontramos valor concreto, no te proponemos nada más. Sin contratos largos, sin letra chica, sin sorpresas en la factura. Así de simple.",
    icono: "diana",
    acento: "calido",
  },
];
