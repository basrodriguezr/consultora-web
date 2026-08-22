/**
 * Mini-caso compliance Ley 21.719 — prueba propia de capacidad.
 *
 * Basado en el demo funcional en `portafolio/demo-compliance-21719/`: scanner
 * de PII sobre dataset Olist (100K clientes, 9 tablas). Los números de abajo
 * son del output real del scanner.
 *
 * Este bloque responde DOS preguntas del prospecto a la vez:
 *   1. "¿Qué recibo si contrato el diagnóstico?" → estos son los entregables
 *   2. "¿De verdad saben hacer esto?" → acá está la prueba
 *
 * Narrativa: empresa ficticia "MercadoExpress" (marketplace online). No se
 * dice que es ficticia — se presenta como ejemplo del tipo de trabajo que se
 * entrega. El prospecto infiere que si pudimos hacerlo para un marketplace,
 * podemos hacerlo para su empresa.
 */

export interface MetricaCaso {
  cifra: string;
  descripcion: string;
}

export const minicaso = {
  etiqueta: "Ejemplo real de diagnóstico",
  titulo: "Marketplace con 100K clientes. ¿Dónde están sus datos personales?",
  contexto:
    "Escaneamos la base de datos de un e-commerce con 100K clientes y 3K vendedores. La Ley 21.719 entra en vigencia en 3 meses. Esto es lo que encontramos:",
  metricas: [
    {
      cifra: "6 de 9",
      descripcion: "tablas contienen datos personales sin clasificar",
    },
    {
      cifra: "1M+",
      descripcion: "registros de geolocalización sin política de retención",
    },
    {
      cifra: "100K",
      descripcion: "reviews con texto libre sin revisar (pueden contener nombres, emails, teléfonos)",
    },
    {
      cifra: "32/100",
      descripcion: "score de compliance técnico antes del diagnóstico",
    },
  ] as MetricaCaso[],
  entregables: [
    "Inventario automático de datos personales (qué tabla, qué campo, qué tipo)",
    "Score de compliance con gap analysis",
    "Reporte ARCO funcional (todos los datos de un cliente en un solo lugar)",
    "Roadmap priorizado: 3 acciones inmediatas para reducir riesgo",
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
