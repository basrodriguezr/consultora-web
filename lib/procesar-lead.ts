import { califica, calificar } from "@/lib/assessment/calificacion";
import { enviarEmailLead, type ResultadoEnvio } from "@/lib/email";
import type { Lead } from "@/lib/leads";

/**
 * Orquestador de leads: qué pasa con un lead ya validado y normalizado.
 *
 * Existe para separar **transporte** de **flujo**. `app/api/contacto/route.ts`
 * hace cuatro cosas hoy —leer el body, validar, notificar, traducir a HTTP— y
 * la Fase 2 le suma una llamada a Claude con su propio manejo de errores. Sin
 * este módulo, el route pasaría a hacer cinco y sería el único lugar donde se
 * puede leer qué le ocurre a un lead.
 *
 * **La división es deliberada: acá se decide QUÉ pasa, en el route CÓMO se
 * responde.** Este módulo no conoce códigos de estado ni mensajes para el
 * usuario; devuelve qué ocurrió y el route lo traduce. Es lo que permite que
 * la Fase 2 agregue un flujo entero sin tocar la capa HTTP.
 */

/**
 * Qué pasó con el lead. Es una unión por `tipo` —y no un objeto con campos
 * opcionales— porque los dos flujos devuelven cosas distintas: solo el de
 * assessment tiene una calificación, y un `calificado?: boolean` invitaría a
 * leerlo en la rama donde siempre vale `undefined`.
 *
 * `envio` es **siempre el del email con las respuestas crudas**, el que sale
 * pase lo que pase. Cuando llegue la Fase 2, el segundo email —el del
 * pre-diagnóstico— no va a aparecer acá: ocurre dentro de `after()`, ya
 * enviada la respuesta HTTP, así que su resultado no tiene a quién informarle
 * y va al log.
 */
export type ResultadoProceso =
  | { tipo: "contacto"; envio: ResultadoEnvio }
  | { tipo: "assessment"; envio: ResultadoEnvio; calificado: boolean };

/**
 * Despacha por el discriminante del lead.
 *
 * **Agregar una variante a `Lead` sin manejarla acá rompe el build**, y ese es
 * el punto de todo el módulo: el flujo de assessment no puede entrar en
 * producción a medio conectar. Lo garantiza el tipo de retorno declarado — una
 * variante sin `case` deja un camino que cae al final de la función sin
 * devolver nada, y `Promise<ResultadoProceso>` no admite `undefined`.
 *
 * El `default` con `const noManejado: never = lead` lo hace explícito además de
 * estructural: si mañana aparece un tercer tipo de lead, el error apunta acá y
 * no a un `undefined` propagándose desde el route.
 */
export async function procesarLead(lead: Lead): Promise<ResultadoProceso> {
  switch (lead.tipo) {
    case "contacto":
      return { tipo: "contacto", envio: await enviarEmailLead(lead) };

    case "assessment": {
      /*
       * La calificación se calcula UNA vez y alimenta dos decisiones: la marca
       * del asunto del email y el flag que le dice al navegador si muestra el
       * Calendly. Calcularla dos veces serían dos oportunidades de que la
       * agenda y el diagnóstico se contradigan sobre el mismo lead.
       */
      const calificacion = calificar(lead);
      const envio = await enviarEmailLead(lead, calificacion);

      /*
       * El email con las respuestas crudas sale ANTES de cualquier puerta y
       * pase lo que pase: es lo que impide que la supresión del §8 se vuelva
       * silenciosa. Un lead que llenó un formulario largo y dejó su correo
       * tiene que aparecer en la bandeja, califique o no.
       *
       * El pre-diagnóstico (EMAIL #2) no se dispara acá: va dentro del
       * `after()` del route, ya enviada la respuesta HTTP. Llega en el paso 7.
       */
      return {
        tipo: "assessment",
        envio,
        calificado: califica(calificacion),
      };
    }

    default: {
      const noManejado: never = lead;
      throw new Error(
        `Tipo de lead no manejado en procesarLead: ${JSON.stringify(noManejado)}`,
      );
    }
  }
}
