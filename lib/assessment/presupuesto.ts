/**
 * Presupuesto de tiempo de la generación del pre-diagnóstico (plan de Fase 2,
 * §11 y §15b). **Fuente de verdad única de los dos números que no pueden
 * divergir en silencio.**
 *
 * ## Por qué existe este módulo
 *
 * Hay dos relojes en juego y viven en archivos distintos: el `timeout` del
 * cliente del modelo (`cliente.ts`) y el `maxDuration` del route del paso 7.
 * Mientras el segundo fue un comentario y el primero un número escrito a mano,
 * podían separarse sin que nada fallara de forma visible.
 *
 * **El timeout del cliente tiene que ser estrictamente menor que
 * `maxDuration`.** Si lo iguala o lo supera, la plataforma mata la función antes
 * de que dispare nuestro timeout y se pierde el camino de error limpio: el
 * `motivo: "timeout"`, el `console.error` con el detalle y la certeza de que el
 * EMAIL #1 ya salió. Derivar el presupuesto de este archivo hace que esa
 * relación sea imposible de romper por descuido, y que subir de plan en Vercel
 * ajuste el timeout solo.
 *
 * 🛑 **El route NO puede importar esta constante, y eso NO es un descuido.**
 * Lo natural sería `export const maxDuration = MAX_DURATION_SEGUNDOS`, pero
 * **Next 16.2.11 lo rechaza**: analiza la config de segmento de forma estática y
 * `next build` corta con *"Invalid segment configuration export detected"*.
 * Comprobado con el build, no deducido — el mismo archivo compila apenas se
 * reemplaza por el literal.
 *
 * Por eso `app/api/assessment/route.ts` escribe `export const maxDuration = 60`
 * a mano, y **lo que impide que los dos números diverjan es un test**, no el
 * sistema de tipos: `route.test.ts` afirma que ese literal es igual a
 * `MAX_DURATION_SEGUNDOS`. Si cambiás el valor de acá, la suite se pone en rojo
 * hasta que actualices el route. Esa es la red; no la borres.
 *
 * ## Por qué NO es `server-only`
 *
 * No hay nada secreto acá —son dos constantes de tiempo— y `maxDuration` es
 * configuración de segmento de ruta, que Next lee del módulo del route. Marcarlo
 * `server-only` no protegería nada y solo agregaría una arista más.
 */

/**
 * Techo de ejecución de la función, en SEGUNDOS (la unidad de `maxDuration`).
 *
 * ⚠️ **Es el valor del free tier de Vercel y está SIN CONFIRMAR contra el panel.**
 * El doc de Next lo dice explícitamente: el default de `maxDuration` lo *"Set by
 * deployment platform"* y el propio límite es dependiente de la plataforma — el
 * framework no lo fija
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/`).
 * Declarar 60 acá pide 60; que la plataforma lo conceda es otra cosa, y es lo que
 * hay que verificar contra el panel antes de cerrar el paso 7.
 *
 * Si el plan cambia, se cambia este número y **todo lo demás se reajusta solo**.
 */
export const MAX_DURATION_SEGUNDOS = 60;

/**
 * Lo que se le resta al techo y **no** es del modelo, en milisegundos.
 *
 * Después de que la generación vuelve todavía falta: validar la salida con
 * `safeParse`, renderizar el Markdown (`render.ts`) y enviar el EMAIL #2 por
 * Resend — una llamada de red a un tercero. 8 s cubre eso con margen para un
 * arranque en frío.
 */
export const RESERVA_MS = 8_000;

/**
 * El presupuesto que le queda al modelo, **derivado y nunca escrito a mano**:
 * 60 s − 8 s = 52 s.
 *
 * Es el default del `timeout` de `cliente.ts` y el techo del reloj de pared con
 * el que se decide si cabe un reintento.
 *
 * 📏 **De dónde salen los 52 s y no otro número:** la calibración del paso 6b
 * midió **35,7 s y 29,1 s** de pared contra Claude real. El valor anterior
 * (`22_000`) se había escrito antes de que existiera ninguna medición y **las dos
 * llamadas habrían dado timeout**.
 */
export const PRESUPUESTO_MODELO_MS = MAX_DURATION_SEGUNDOS * 1_000 - RESERVA_MS;

/**
 * ¿Entra otro intento completo en lo que queda del presupuesto?
 *
 * Se pregunta antes de gastar el reintento del §15b. **Con los números de
 * producción la respuesta es siempre no, y eso es el hallazgo, no un bug:** un
 * intento consume el presupuesto entero (~35 s medidos, 52 s de techo), así que
 * un segundo intento completo pediría ~70 s y la plataforma lo cortaría a mitad
 * de camino. Un camino de recuperación que no cabe en el presupuesto es peor que
 * no tenerlo —se lee como red y no lo es—, así que la condición está en el código
 * en vez de vivir implícita en la aritmética.
 *
 * Sigue siendo alcanzable donde el reloj de la plataforma no aplica: en
 * desarrollo, con `ASSESSMENT_TIMEOUT_MS` seteada (ver `cliente.ts`), que es
 * justo el entorno donde el §15b quiere ejercitar este camino.
 */
export function cabeOtroIntento(
  transcurridoMs: number,
  porIntentoMs: number,
  techoMs: number = PRESUPUESTO_MODELO_MS,
): boolean {
  return transcurridoMs + porIntentoMs <= techoMs;
}
