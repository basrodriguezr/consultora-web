import type { Calificacion, LeadAssessmentNormalizado } from "@/lib/leads";

/**
 * Triage comercial del lead de assessment.
 *
 * **Lo calcula código, no el modelo.** Es una regla determinista sobre tres
 * enums; darle criterio comercial a un LLM agregaría no-determinismo y costo
 * para decidir algo que se escribe en una línea.
 *
 * Desde la decisión del 2026-08-09 esto **suprime**, no etiqueta: un
 * `probablemente-no` no ve el Calendly y no genera pre-diagnóstico. Lo único
 * que sigue saliendo es el email con las respuestas crudas. Eso sube el costo
 * de un falso positivo de "30 segundos de lectura de más" a "un lead de entre
 * $3M y $50M CLP no recibe nada", y de ahí salen las dos reglas de abajo.
 */

/**
 * Descalifica **solo por conjunción de las tres señales negativas duras.**
 *
 * Cada una suelta es ruido: *"sin presupuesto"* en un primer contacto casi
 * siempre significa "todavía no hay línea asignada", no "no hay plata"; una
 * sola persona tocando datos describe a media PYME mediana chilena; y urgencia
 * baja es lo normal en enero. Las tres juntas ya no son ruido.
 *
 * **`horasSemanaProceso` no participa, y es deliberado.** Daniela había
 * sugerido `>5 h/semana` como umbral. No se implementó porque el campo admite
 * `"no-se"`, y *"no sé cuántas horas nos consume"* no es señal de problema
 * chico: es falta de visibilidad, que es literalmente lo que vende la
 * consultora. El umbral descartaría al cliente ideal.
 *
 * **Esta conjunción no se amplía.** Con supresión real, cada señal que se le
 * agregue multiplica el costo de equivocarse. Los tests que verifican que una
 * o dos señales NO descalifican son la única red que queda.
 */
export function calificar(lead: LeadAssessmentNormalizado): Calificacion {
  const sinPresupuesto = lead.presupuesto === "sin-presupuesto";
  const equipoMinimo = lead.personasConDatos <= 1;
  const sinUrgencia = lead.urgencia === "baja";

  if (sinPresupuesto && equipoMinimo && sinUrgencia) return "probablemente-no";

  /*
   * Todo lo demás entra. **No hay regla que promueva a `"calificado"`** y no se
   * inventa una acá: qué separa un lead "calificado" de uno "a evaluar" es
   * criterio comercial de Daniela, no una decisión de implementación, y hoy
   * nada del sistema se comporta distinto entre los dos valores (la puerta solo
   * mira si es `"probablemente-no"`). Cuando ella lo defina, el cambio es este
   * único `return` y el tipo ya lo admite.
   */
  return "a-evaluar";
}

/**
 * La puerta del §8, en una función con nombre.
 *
 * Existe para que la condición no se escriba a mano en cada lugar que la
 * necesita —el flag que viaja al navegador y el `if` que decide si se llama a
 * Claude— y esos dos se puedan contradecir. Un lead que ve el Calendly pero no
 * genera diagnóstico, o al revés, es un bug caro y silencioso.
 */
export function califica(calificacion: Calificacion): boolean {
  return calificacion !== "probablemente-no";
}
