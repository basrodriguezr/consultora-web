/**
 * Servicios como OUTCOMES — lo que el cliente recibe, no las herramientas que usamos.
 * Inspirado en Harpy/Datallies: card con título de resultado + subtítulo concreto.
 */

export interface Outcome {
  icono: string;
  titulo: string;
  descripcion: string;
}

export const outcomes = {
  etiqueta: "Qué resolvemos",
  titulo: "Cada uno se resuelve en semanas. Sin cambiar de sistema.",
  items: [
    {
      icono: "📊",
      titulo: "Reportes que se arman solos",
      descripcion:
        "De 8 horas manuales a un dashboard actualizado cada mañana. Tu equipo analiza en vez de copiar.",
    },
    {
      icono: "🗺️",
      titulo: "Un mapa de tus datos",
      descripcion:
        "Saber qué tienes, dónde está, quién es dueño. El primer paso para cualquier mejora.",
    },
    {
      icono: "☁️",
      titulo: "Cloud sin sorpresas",
      descripcion:
        "Costos claros por equipo y proyecto. Alertas configuradas. Sin pagar por lo que no usas.",
    },
    {
      icono: "⚖️",
      titulo: "Datos listos para la Ley 21.719",
      descripcion:
        "Inventario de datos personales, flujos documentados y procedimiento de eliminación. Antes de diciembre.",
    },
    {
      icono: "🔄",
      titulo: "Pipelines que no se rompen",
      descripcion:
        "Automatización con alertas, tests y documentación. Si alguien se va, todo sigue funcionando.",
    },
  ] as Outcome[],
} as const;
