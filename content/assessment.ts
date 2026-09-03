/**
 * Copy de la pantalla `/assessment` — el formulario largo de la Fase 2.
 *
 * ## Qué vive acá y qué NO
 *
 * Acá viven **las preguntas** (el texto de cada etiqueta y su ayuda) y la copy
 * de la página. **Las etiquetas de las OPCIONES de cada enum NO viven acá**:
 * viven en `lib/leads.ts` (`FUENTES_DATOS`, `ETIQUETAS_EQUIPO`,
 * `ETIQUETAS_CLOUD`, `ETIQUETAS_PRESUPUESTO`, `ETIQUETAS_URGENCIA`,
 * `ETIQUETAS_HORAS`, `ETIQUETAS_EVALUANDO_CAMBIO`), pegadas al esquema que las
 * valida.
 *
 * La razón está escrita en `lib/leads.ts` y es la misma de siempre: el email
 * que le llega a Daniela muestra esos mismos textos. Si el label de una opción
 * viviera en `content/`, el email diría `"sin-presupuesto"` y nadie lo
 * arreglaría hasta que ella preguntara qué significa. **Duplicar una etiqueta
 * de opción acá es un bug, no una comodidad.**
 *
 * ## La promesa de esta página, que es fácil romper sin querer
 *
 * ⚠️ **El pre-diagnóstico NO se le envía a quien completa el formulario.** Va
 * solo a Daniela, antes de la conversación (plan de Fase 2, §18). Ninguna copy
 * de esta página puede prometer, insinuar ni dejar entender que la persona va a
 * recibir un documento, un informe o un diagnóstico por correo. Lo que recibe
 * es **una conversación mejor preparada**, y eso es lo que dice el texto.
 *
 * Tampoco se menciona en ningún lado que las respuestas pasan por un modelo de
 * IA para decidir nada sobre la persona: lo que sí se declara —porque es cierto
 * y es lo que exige la Ley 21.719— es que se procesan para preparar la reunión.
 * Ver `app/privacidad/page.tsx`, que hay que actualizar cuando el paso 7 conecte
 * la API de Claude.
 */

export const assessment = {
  titulo: "Cuéntanos qué está pasando con tus datos",
  bajada:
    "Son unos 5 minutos. Con esto llegamos a la conversación de 30 minutos con contexto real, en vez de gastarla preguntando lo básico.",

  /**
   * Nota al pie del formulario. Describe lo que el código hace, ni más ni
   * menos — misma regla que el aviso de `ContactoForm.tsx` y que la página de
   * privacidad. Cuando el paso 7 conecte Claude, este texto cambia en el mismo
   * commit.
   */
  aviso:
    "Usamos tus respuestas solo para preparar la conversación: no las vendemos ni te suscribimos a nada. El envío se procesa vía Resend, y tus respuestas —sin tu nombre ni tu correo— se analizan con un modelo de Anthropic para que lleguemos a la reunión con contexto. Más detalle en la política de privacidad.",

  /**
   * Invitación al formulario largo, que se muestra **después** de que alguien
   * envió el formulario corto de la home.
   *
   * Es la opción A que eligió Daniela el 2026-08-29: la home sigue entregando el
   * Calendly directo y sin calificar, y `/assessment` queda como un extra para
   * quien ya convirtió. Por eso el texto ofrece **una conversación mejor**, no un
   * requisito: quien llegó hasta acá ya agendó o ya dejó su correo, y pedirle
   * quince campos más como condición sería cambiarle las reglas después de que
   * cumplió.
   *
   * ⚠️ Vive acá y no en `content/contacto.ts` porque el día que la ruta cambie de
   * nombre, el enlace y su copy tienen que moverse juntos.
   */
  invitacion: {
    pregunta: "¿Quieres que la conversación rinda más?",
    enlace: "Cuéntanos un poco más",
    cierre: "Son 5 minutos y llegamos con contexto real.",
  },

  boton: "Enviar respuestas",
  botonEnviando: "Enviando…",

  /**
   * Títulos de los cinco bloques del formulario. El orden es el del §15c del
   * plan: primero lo fácil, el texto libre al medio, y el presupuesto recién
   * cuando la persona ya invirtió esfuerzo en contestar.
   */
  grupos: {
    identidad: "Quién eres",
    problema: "El problema",
    equipo: "Tu equipo y tu stack",
    decision: "Contexto de la decisión",
    /**
     * El quinto bloque se anuncia como opcional en su propio subtítulo. El §15c
     * es explícito: los cuatro opcionales **se tienen que ver opcionales**, sin
     * asterisco de obligatorio y sin bloquear el envío.
     */
    opcionales: "Opcional — si lo tienes a mano",
    opcionalesBajada:
      "Puedes saltarte todo este bloque. Si lo contestas, llegamos con más contexto.",
  },

  /**
   * Las 15 preguntas. `etiqueta` es lo que se ve; `ayuda` es el texto en gris
   * debajo del control, y va solo donde agrega algo — no todas las preguntas
   * lo necesitan y llenar los 15 huecos por simetría es ruido.
   *
   * Las claves son **exactamente** los nombres de campo de
   * `leadAssessmentSchema`. Eso no es estilo: es lo que permite que un campo
   * renombrado en el esquema rompa el build acá en vez de renderizar un
   * `undefined` en pantalla.
   */
  campos: {
    nombre: {
      etiqueta: "Nombre",
    },
    email: {
      etiqueta: "Email corporativo",
      /**
       * La sugerencia de correo corporativo NO se escribe acá: se reusa la de
       * `ContactoForm.tsx`, que aparece condicionada por `esCorreoPersonal()`.
       * Y sigue sin bloquear el envío — bloquear `@gmail` perdería clientes
       * reales en Chile.
       */
    },
    empresa: {
      etiqueta: "Empresa",
    },
    problemaPrincipal: {
      etiqueta: "¿Cuál es tu principal desafío con datos?",
      ayuda:
        "Mientras más concreto, mejor: qué proceso, con qué frecuencia, a quién le duele.",
    },
    solucionActual: {
      etiqueta: "¿Cómo lo resuelven hoy? ¿Quién lo hace?",
      ayuda:
        "Aunque la respuesta sea «a mano, en una planilla, lo hace la misma persona de siempre».",
    },
    fuentesDatos: {
      etiqueta: "¿De dónde salen los datos hoy?",
      ayuda: "Marca todas las que apliquen.",
    },
    equipoDatos: {
      etiqueta: "¿Tienen equipo de datos?",
    },
    personasConDatos: {
      etiqueta: "¿Cuántas personas trabajan con datos?",
      ayuda:
        "Contando a quien arma reportes o mantiene planillas, aunque no sea su cargo.",
    },
    cloud: {
      etiqueta: "¿Usan cloud? ¿Cuál?",
    },
    urgencia: {
      etiqueta: "¿Qué tan urgente es resolverlo?",
    },
    presupuesto: {
      etiqueta: "¿Hay presupuesto asignado?",
      ayuda:
        "Contestar «sin presupuesto todavía» no te deja fuera de nada. Nos sirve para saber en qué punto está la conversación.",
    },
    horasSemanaProceso: {
      etiqueta: "¿Cuántas horas por semana consume ese proceso?",
    },
    sponsor: {
      etiqueta: "¿Quién impulsa esto internamente?",
      ayuda: "Nombre y cargo.",
    },
    evaluandoCambio: {
      etiqueta: "¿Están evaluando cambiar de sistema o ERP?",
    },
    sistemasActuales: {
      etiqueta: "¿Qué sistemas usan hoy?",
      ayuda: "Por ejemplo: «Laudus, Excel y un SQL Server viejo».",
    },
  },

  /**
   * Mensajes de error del envío. Mismos textos que `ContactoForm.tsx`: es el
   * mismo modo de falla y la persona no tiene por qué leer dos redacciones
   * distintas del mismo problema según qué formulario usó.
   */
  errores: {
    generico: "No pudimos enviar tus respuestas. Intenta de nuevo en unos minutos.",
    red: "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
  },

  /**
   * Anuncio corto para lectores de pantalla al enviar con éxito. El bloque
   * visible es `<Confirmacion>`, que ya existe y no se reescribe.
   *
   * ⚠️ **Es el mismo texto califique o no califique la persona.** Cuando el
   * endpoint responde `calificado: false` lo único que cambia es que no aparece
   * el Calendly (§15c). La confirmación no dice ni insinúa que alguien no
   * califica: es una heurística sobre tres enums y se va a equivocar; quien
   * decide es Daniela, por correo.
   */
  exito: "Listo, recibimos tus respuestas. Te escribimos en menos de 24 horas hábiles.",
} as const;
