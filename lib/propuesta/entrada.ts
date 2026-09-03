import { z } from "zod";

/**
 * El contrato de entrada del agente de propuestas: **las notas de discovery**.
 *
 * ## Por qué esto no es un formulario
 *
 * La Fase 2 entra por 15 campos tipados porque del otro lado hay un desconocido
 * llenando un formulario en el sitio. Acá del otro lado está Daniela con las
 * notas de una reunión de una a dos horas, y `captura_requerimientos.md` ya
 * define el bloque que ella llena (`CLIENTE / CONTACTO / PROBLEMA / SITUACIÓN
 * ACTUAL / FUENTES / EQUIPO / URGENCIA / PRESUPUESTO / DECISOR`), con un ejemplo
 * completo al final de ese documento.
 *
 * **Ese bloque es el contrato; este esquema no lo re-implementa.** Pedirle que
 * pegue sus notas en 15 inputs sería empeorar el trabajo que la fase existe para
 * ahorrarle, y las notas reales llegan desordenadas: media pregunta sin
 * responder, una cita textual larga, tres fuentes anotadas al margen.
 *
 * 🛑 **Por eso se valida presencia y tamaño, no estructura.** Un esquema que
 * exigiera las nueve secciones rechazaría la captura real —la que tiene el
 * `PRESUPUESTO` en blanco porque el cliente no lo dijo— y esa es exactamente la
 * información que el documento tiene que marcar como faltante, no rechazar.
 * Lo que falta se resuelve en el borrador con `[FALTA: …]` (ver `render.ts`),
 * que es un problema del renderer, no del validador.
 */

/**
 * Piso de texto para generar una propuesta, en caracteres.
 *
 * No es una medida de calidad —600 caracteres de relleno pasan igual— sino el
 * corte contra el modo de falla concreto: **generar una oferta comercial desde
 * tres líneas.** Con notas así de escuetas el modelo no tiene de dónde sacar
 * contexto, alcance ni supuestos, y lo que produce es plausible en vez de
 * cierto. La captura de ejemplo del template ronda los 900 caracteres, y es una
 * captura corta.
 *
 * Falla temprano y con un mensaje que dice qué hacer, en vez de entregar un
 * borrador inventado que hay que detectar leyéndolo.
 */
export const MINIMO_NOTAS = 600;

/**
 * Techo de las notas, en caracteres.
 *
 * Dos motivos, y el segundo es el que manda: acota el gasto de tokens por
 * llamada, y **mantiene la generación dentro del presupuesto de tiempo**. La
 * propuesta ya es un documento de nueve secciones (3-4× la salida del
 * pre-diagnóstico); dejar además que la entrada crezca sin límite es la forma
 * de descubrir el techo de `maxDuration` en producción y no acá.
 *
 * 40.000 caracteres son del orden de 25 páginas de notas: más que cualquier
 * discovery de dos horas.
 */
export const MAXIMO_NOTAS = 40_000;

/** Techo del pre-diagnóstico cuando se encadena (ver `preDiagnostico`). */
export const MAXIMO_PRE_DIAGNOSTICO = 20_000;

export const entradaPropuestaSchema = z.object({
  /**
   * Nombre de la empresa. **Obligatorio y aparte de las notas**, porque encabeza
   * el documento (`**Para**: [Nombre Empresa]`).
   *
   * Extraerlo del texto libre sería pedirle al modelo que adivine el
   * destinatario de una oferta comercial a partir de prosa. Si se equivoca, el
   * error va en la primera línea, en negrita, en el documento que se manda a
   * firmar. Es un dato que Daniela ya tiene escrito; se pide.
   */
  empresa: z.string().trim().min(2).max(120),

  /**
   * Las notas de discovery, tal como Daniela las escribió. Texto libre.
   *
   * `.trim()` antes de medir: 600 espacios no son notas.
   */
  notas: z.string().trim().min(MINIMO_NOTAS).max(MAXIMO_NOTAS),

  /**
   * El pre-diagnóstico de la Fase 2, si este prospecto pasó por `/assessment`.
   *
   * ⚠️ **Opcional a propósito, y es una decisión de arquitectura, no una
   * comodidad.** Está abierta con Daniela la pregunta de si la propuesta arranca
   * del assessment o solo del discovery (§3 del plan de Fase 3). Dejando el
   * campo opcional **las dos respuestas funcionan sin rediseñar el contrato**:
   * si dice que sí, se pasa el Markdown que ya generó la Fase 2 y el borrador
   * arranca mucho más cerca; si dice que no, se omite y nada cambia.
   *
   * Es el mismo movimiento que hizo `tipo` en `lib/leads.ts`: preparar el punto
   * de extensión antes de necesitarlo, sin construir la extensión.
   */
  preDiagnostico: z.string().trim().max(MAXIMO_PRE_DIAGNOSTICO).optional(),
});

export type EntradaPropuestaValidada = z.output<typeof entradaPropuestaSchema>;

/**
 * La entrada ya normalizada, con el instante de preparación resuelto.
 *
 * Mismo patrón que `LeadAssessmentNormalizado`: el esquema valida lo que llega,
 * el tipo normalizado es lo que circula por el resto del módulo. La fecha se
 * inyecta en vez de leerse con `new Date()` adentro del renderer, que es lo que
 * hace que el golden test pueda congelar un documento con fecha fija.
 */
export interface EntradaPropuestaNormalizada {
  empresa: string;
  notas: string;
  preDiagnostico?: string;
  /** ISO 8601. Fecha del documento y punto de partida de la validez. */
  preparadaEn: string;
}

export function normalizarEntrada(
  datos: EntradaPropuestaValidada,
  preparadaEn: Date,
): EntradaPropuestaNormalizada {
  return {
    empresa: datos.empresa,
    notas: datos.notas,
    ...(datos.preDiagnostico ? { preDiagnostico: datos.preDiagnostico } : {}),
    preparadaEn: preparadaEn.toISOString(),
  };
}
