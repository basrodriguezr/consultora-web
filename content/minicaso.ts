/**
 * Mini-caso — prueba propia de capacidad con datos genéricos de madurez.
 *
 * Cambiado de "compliance Ley 21.719" a "madurez de datos" para que conecte
 * con TODOS los dolores de la página (reportes manuales, datos inconsistentes,
 * costos cloud) — no solo con el compliance.
 *
 * Los números son representativos de lo que ArqData encuentra en una empresa
 * mediana típica sin arquitecto de datos.
 */

export interface MetricaCaso {
  cifra: string;
  descripcion: string;
}

export const minicaso = {
  etiqueta: "Antes y después de un proceso típico",
  titulo: "¿Cuánto le cuesta a una empresa no saber el estado real de sus datos?",
  contexto:
    "Hicimos un diagnóstico en una empresa mediana de servicios en Santiago. 4 áreas, 120 personas, datos repartidos entre el ERP, planillas y un par de sistemas sin conectar.",
  metricas: [
    {
      cifra: "4",
      descripcion: "procesos manuales críticos que dependen de una sola persona",
    },
    {
      cifra: "18 hrs",
      descripcion: "por semana del equipo en tareas automatizables",
    },
    {
      cifra: "3",
      descripcion: "sistemas con datos duplicados o sin conectar",
    },
    {
      cifra: "32/100",
      descripcion: "score de madurez de datos antes del diagnóstico",
    },
  ] as MetricaCaso[],
  entregables: [
    "Mapa de procesos manuales (qué se hace, quién, cuánto toma)",
    "Score de madurez de datos con gap analysis",
    "3 quick wins priorizados por impacto inmediato",
    "Roadmap a 3 meses con estimación de ahorro",
  ],
  cierre: "Esto es lo que entregamos en la primera semana del diagnóstico. Para tu empresa, con tus datos reales.",
  /** Escalera de valor: muestra el camino post-diagnóstico sin obligar. */
  escalera: {
    titulo: "¿Y después del diagnóstico?",
    pasos: [
      {
        nombre: "Diagnóstico rápido",
        detalle: "2 semanas · precio fijo",
        activo: true,
      },
      {
        nombre: "Acciones inmediatas",
        detalle: "3-4 semanas · lo que más duele primero",
        activo: false,
      },
      {
        nombre: "Tu equipo operando solo",
        detalle: "Todo documentado, sin dependencia",
        activo: false,
      },
    ],
    nota: "Solo avanzamos si el diagnóstico encuentra valor. Sin presión, sin contratos largos.",
  },
} as const;
