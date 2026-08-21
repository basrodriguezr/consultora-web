/**
 * Diferenciales del home — las tres garantías.
 *
 * Se pasó de 4 tarjetas a 3 en el rediseño (2026-07-31). Voz plural y por rol,
 * sin nombres propios: es la narrativa aprobada.
 */

/**
 * Acentos disponibles. Son **roles**, no colores: cada tema les asigna un valor
 * distinto (en claro `calido` es tierra quemada, en oscuro es ámbar pálido).
 * Antes se llamaban `emerald`/`amber`/`sky` y quedaron obsoletos al cambiar la
 * paleta — un nombre que miente sobre el color es peor que ninguno.
 */
export type Acento = "marca" | "calido" | "agua" | "alterno";

export interface Diferencial {
  titulo: string;
  descripcion: string;
  /** Selecciona el ícono SVG en el componente. */
  icono: "persona" | "candado" | "diana";
  acento: Acento;
}

export const tituloDiferencial = "¿Por qué nosotros y no una consultora grande?";

export const diferenciales: Diferencial[] = [
  {
    titulo: "La persona que habla contigo es la que ejecuta",
    descripcion:
      "Sin capas de gestión, sin juniors rotando. Tú hablas con un senior y ese senior se mete al sistema.",
    icono: "persona",
    acento: "marca",
  },
  {
    titulo: "Todo queda en tu cuenta",
    descripcion:
      "Código tuyo, infraestructura tuya, documentación tuya. Si no nos necesitas más, sigues operando solo.",
    icono: "candado",
    acento: "alterno",
  },
  {
    titulo: "Empezamos con un diagnóstico acotado",
    descripcion:
      "2 semanas. Si no encontramos valor concreto, no te proponemos nada más. Así de simple.",
    icono: "diana",
    acento: "calido",
  },
];
