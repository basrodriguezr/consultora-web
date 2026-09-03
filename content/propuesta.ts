/**
 * El texto de la propuesta comercial que **no** genera el modelo.
 *
 * Transcrito de `negocio/templates/propuesta_comercial.md`, el template de
 * Daniela. Es copy de ella; acá se copia, no se reescribe.
 *
 * ## Por qué esto vive en `content/` y no en el prompt
 *
 * La propuesta va al cliente y **es una oferta comercial**: los §7, §8 y §9 del
 * template comprometen supuestos, garantía y forma de trabajo. Un modelo que
 * los regenera en cada request los hace derivar de a poco —una palabra menos
 * acá, un plazo distinto allá— y nadie revisa un párrafo que "ya estaba" en las
 * cinco propuestas anteriores.
 *
 * **Un modelo no inventa una garantía.** Es la misma regla por la que los montos
 * los calcula `precios.ts` y no el modelo, aplicada al texto en vez de a los
 * números: lo que compromete a la consultora se escribe una vez, se versiona, y
 * cambia cuando Daniela decide cambiarlo.
 *
 * Lo que sí aporta el modelo son los supuestos **específicos del proyecto**
 * (`SalidaPropuesta.supuestos`), que se suman a los de acá.
 */

/**
 * Vigencia de la oferta. Va en el encabezado del documento.
 *
 * Es un compromiso comercial —después de ese plazo el precio puede cambiar— y
 * por eso es un dato, no un literal escondido en el renderer.
 */
export const VALIDEZ_DIAS = 30;

/**
 * Supuestos base, presentes en toda propuesta (§7 del template).
 *
 * El modelo agrega los del proyecto puntual; estos van siempre, porque son las
 * condiciones sin las cuales ArqData no puede trabajar. Si faltara uno y el
 * cliente no lo proveyera, el proyecto se atrasa y la culpa es del documento.
 */
export const SUPUESTOS_BASE: readonly string[] = [
  "El cliente provee acceso a su cuenta cloud (IAM role o equivalente).",
  "El cliente provee acceso a las fuentes de datos necesarias.",
  "Se asigna 1 persona de contacto interno para validaciones.",
  "Reuniones de seguimiento semanales (30 min).",
  "Cambios de alcance se cotizan aparte.",
] as const;

/**
 * Fuera de alcance que aplica a cualquier proyecto (§3 del template).
 *
 * 📏 **El "fuera de alcance" es la sección que evita el scope infinito**, y
 * `captura_requerimientos.md` la lista entre los errores de novato: *"No definir
 * fuera de alcance → el cliente pide más y más"*. Estos tres van siempre; los
 * específicos del proyecto los aporta el modelo y se imprimen después.
 */
export const FUERA_DE_ALCANCE_BASE: readonly string[] = [
  "Soporte 24/7 o SLA de tiempo de respuesta post-proyecto.",
  "Cambios de alcance no acordados por escrito.",
  "Licencias de software de terceros que el cliente requiera.",
] as const;

/**
 * La garantía (§8). **Literal, nunca generada.**
 *
 * ADR-005 existe por el párrafo de garantía del assessment: un documento con
 * compromiso comercial que Daniela no revisó es el riesgo que esa decisión
 * evita. Acá el compromiso es mayor —es la oferta misma— así que el texto es
 * constante y el golden test lo congela carácter por carácter.
 */
export const GARANTIA: readonly string[] = [
  "30 días de soporte post-entrega incluidos (bugs, ajustes menores).",
  "Código entregado con documentación completa.",
  "Infraestructura reproducible con Terraform (re-desplegable).",
] as const;

/** Los próximos pasos (§9). También literales: describen cómo se cierra el trato. */
export const PROXIMOS_PASOS: readonly string[] = [
  "Revisión de esta propuesta.",
  "Ajustes si corresponde.",
  "Firma y pago del 50% inicial.",
  "Kick-off (semana siguiente).",
] as const;

/**
 * Nota de los costos de infraestructura (§6 del template).
 *
 * **La cifra mensual no la pone ni el modelo ni el código, y eso es
 * deliberado.** Depende de la arquitectura definitiva y del volumen real, que
 * es justo lo que todavía no se sabe cuando se escribe la propuesta. El
 * renderer imprime un `[FALTA: …]` en su lugar: un hueco marcado lo completa
 * Daniela en dos minutos, un número inventado viaja al cliente dentro de una
 * oferta.
 */
export const NOTA_INFRAESTRUCTURA =
  "La infraestructura cloud es pagada directamente por el cliente en su propia cuenta.";
