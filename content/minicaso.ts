/**
 * Mini-caso — prueba propia de capacidad con datos genéricos de madurez.
 *
 * Cambiado de "compliance Ley 21.719" a "madurez de datos" para que conecte
 * con TODOS los dolores de la página (reportes manuales, datos inconsistentes,
 * costos cloud) — no solo con el compliance.
 *
 * ⚠️ **Los números son representativos, NO de un cliente concreto — y la copy
 * tiene que decir exactamente eso.** Es una regla, no una preferencia de estilo.
 *
 * Historia, porque se rompió dos veces en cuatro días: la etiqueta decía
 * "Ejemplo real de diagnóstico" y el contexto "Hicimos un diagnóstico… esto es
 * lo que encontramos", o sea afirmaba un caso puntual que este mismo comentario
 * admitía que no existía. Se corrigió el 2026-08-28; el 08-29 volvió como "Así
 * se ve un diagnóstico" + "Hicimos un diagnóstico en una empresa mediana de
 * servicios en Santiago, 4 áreas, 120 personas" — más específico todavía.
 * Daniela lo cerró el 2026-09-02: **"Línea de base típica en un diagnóstico de
 * entrada"**, y el contexto en presente genérico.
 *
 * **Si algún día hay un caso real con cifras propias, se puede volver a
 * afirmar.** Mientras no lo haya, no hay con qué sostenerlo — que es el mismo
 * motivo por el que se quitó la sección "Caso real" el 2026-07-27.
 */

export interface MetricaCaso {
  cifra: string;
  descripcion: string;
}

export const minicaso = {
  etiqueta: "Línea de base típica en un diagnóstico de entrada",
  titulo: "¿Cuánto le cuesta a una empresa no saber el estado real de sus datos?",
  contexto:
    "En una empresa mediana de servicios —4 áreas, unas 120 personas, datos repartidos entre el ERP, planillas y un par de sistemas sin conectar— esto es lo que solemos encontrar en la primera semana:",
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
      cifra: "$4,2M",
      descripcion: "al año en horas del equipo que se pueden recuperar",
    },
  ] as MetricaCaso[],
  entregables: [
    "Mapa de procesos manuales (qué se hace, quién, cuánto toma)",
    "Score de madurez de datos con gap analysis",
    "3 quick wins priorizados por impacto inmediato",
    "Roadmap a 3 meses con estimación de ahorro",
  ],
  cierre: "Eso es lo que entregamos en la primera semana del diagnóstico. Para tu empresa, con tus datos reales.",
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
