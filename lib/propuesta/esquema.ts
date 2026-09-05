import { z } from "zod";

import { slugsServicios } from "@/content/servicios";
import { POSICIONES_RANGO } from "@/lib/propuesta/precios";

/**
 * Esquema de lo que devuelve el modelo para la propuesta comercial.
 *
 * Mismo principio que la Fase 2 —**el agente devuelve datos, el código arma el
 * Markdown**— con una diferencia que invierte casi todas las reglas de
 * contenido y conviene tener presente antes de tocar nada:
 *
 * 🛑 **Acá el "cómo" es obligatorio.** La regla de oro del pre-diagnóstico es
 * *dice qué arreglar, nunca cómo* — prohibido nombrar servicios de AWS o
 * describir el diseño, **porque eso se cobra en la propuesta**. Este documento
 * **es** ese cobro: el §2 del template exige el diagrama y la tabla
 * `Componente | Tecnología | Función` con Glue, dbt y QuickSight escritos con
 * nombre y apellido. Un esquema derivado del de assessment heredaría las
 * prohibiciones y produciría una propuesta sin solución técnica, que es el 60%
 * de su valor.
 *
 * Lo que **no** se invierte, y es lo que sigue igual de duro:
 *
 *   1. **Cero cifras en pesos.** El modelo elige servicio y posición en el
 *      rango; `precios.ts` hace la plata. Ver `inversion`.
 *   2. **El texto con peso comercial no se genera** (garantía, próximos pasos,
 *      supuestos base): vive en `content/propuesta.ts`.
 *   3. **Lo que no se sabe se marca, no se rellena.** Ver `faltantes`.
 */

/**
 * Una etapa del flujo de datos propuesto.
 *
 * ⚠️ **El diagrama del §2 se pide como datos, no como dibujo.** El template
 * muestra un bloque de código con "[Diagrama simplificado de la arquitectura
 * propuesta]", y la tentación es pedirle ASCII art al modelo. Es mala idea por
 * dos razones: el ASCII sale distinto en cada generación (imposible de congelar
 * en un golden test) y se rompe en cualquier visor con fuente proporcional,
 * dentro de un documento que se manda a una gerencia.
 *
 * Pidiendo las etapas ordenadas, **el renderer dibuja** y el resultado es
 * idéntico propuesta tras propuesta. Es la misma decisión que los montos: la
 * forma es del código, el contenido es del modelo.
 */
const etapaFlujoSchema = z.object({
  nombre: z.string().max(40),
  detalle: z.string().max(120),
});

/**
 * Fila de la tabla de componentes del §2. **Acá sí van tecnologías por nombre.**
 */
const componenteSchema = z.object({
  componente: z.string().max(60),
  /** `AWS Glue`, `dbt`, `QuickSight`. Lo que la Fase 2 tiene prohibido decir. */
  tecnologia: z.string().max(60),
  funcion: z.string().max(160),
});

/**
 * Un entregable del alcance (§3), con sus semanas.
 *
 * 📏 **Las semanas son números y no texto ("semana 3-6") a propósito: de acá se
 * deriva el §4 Timeline.** Si el modelo escribiera las dos secciones por
 * separado, tarde o temprano la tabla de alcance diría "semana 8" y el timeline
 * "6 semanas" en el mismo documento — el defecto clásico de las propuestas
 * armadas a mano, y el que esta fase existe para eliminar. Con una sola fuente
 * es imposible por construcción, no por revisión.
 */
const entregableSchema = z
  .object({
    entregable: z.string().max(80),
    descripcion: z.string().max(160),
    semanaInicio: z.number().int().min(1).max(52),
    semanaFin: z.number().int().min(1).max(52),
  })
  .refine((e) => e.semanaFin >= e.semanaInicio, {
    message: "Un entregable no puede terminar antes de empezar.",
    path: ["semanaFin"],
  });

/**
 * Integrante del equipo (§5).
 *
 * La dedicación es un número de horas, no un monto: no cae bajo la regla de las
 * cifras, que es sobre pesos. Sí es un compromiso, así que el borrador lo lleva
 * para que Daniela lo ajuste antes de firmar — que es exactamente lo que ADR-005
 * pide que exista: un checkpoint humano, no un documento cerrado.
 */
const integranteSchema = z.object({
  rol: z.string().max(60),
  dedicacionHorasSemana: z.number().int().min(1).max(45),
});

export const salidaPropuestaSchema = z.object({
  /** §1 Contexto: la necesidad, en el lenguaje del cliente. */
  contexto: z.object({
    necesidad: z.string().min(60).max(600),
    /** Cómo lo resuelven hoy. Sale de "SITUACIÓN ACTUAL" de la captura. */
    situacionActual: z.string().min(40).max(600),
  }),

  /** §2 Solución propuesta. Es la sección donde el "cómo" es el entregable. */
  solucion: z.object({
    descripcion: z.string().min(80).max(700),
    flujo: z.array(etapaFlujoSchema).min(3).max(6),
    componentes: z.array(componenteSchema).min(2).max(6),
  }),

  /**
   * §3 Alcance. `incluido` alimenta también el §4 (ver `entregableSchema`).
   *
   * `fueraDeAlcance` son los específicos del proyecto; los de siempre están en
   * `content/propuesta.ts` y el renderer los concatena.
   */
  alcance: z.object({
    incluido: z.array(entregableSchema).min(3).max(8),
    fueraDeAlcance: z.array(z.string().max(160)).min(1).max(6),
  }),

  /** §5 Equipo. */
  equipo: z.array(integranteSchema).min(1).max(3),

  /**
   * §6 Inversión — **sin un solo peso**.
   *
   * El enum es lo que impide cotizar un servicio que la consultora no vende, y
   * `posicion` es todo lo que el modelo puede decir sobre el monto.
   * `justificacion` es lo que Daniela lee para decidir si está de acuerdo con la
   * posición antes de mandar el documento: una posición sin argumento no se
   * puede auditar.
   */
  inversion: z.object({
    servicio: z.enum(slugsServicios),
    posicion: z.enum(POSICIONES_RANGO),
    justificacion: z.string().min(40).max(400),

    /**
     * ★ El presupuesto que el cliente declaró, **literal**, o `null` si no dijo
     * ninguno. Campo interno: el renderer lo imprime en «Cómo se cotizó», que
     * Daniela borra antes de enviar.
     *
     * 🛑 **Existe porque la calibración del 2026-09-04 encontró una brecha que
     * ninguna de las dos mitades del sistema podía ver.** Las notas decían
     * *"tenemos entre 10 y 20 millones"* y el borrador cotizó $35.000.000 —75%
     * arriba— sin mencionarlo en ninguna parte. No fue un error del modelo: por
     * diseño **el modelo no ve los montos** (los rangos son `server-only` y no
     * entran al prompt), así que no puede saber que `alto` son $35M; y
     * `precios.ts`, que sí calcula el monto, no ve el presupuesto porque es
     * texto libre dentro de las notas. **Nadie comparaba.**
     *
     * Daniela lo resolvió el 2026-09-04: *"mostrar presupuesto declarado del
     * cliente al lado del precio, en la parte interna. No bajes el precio solo —
     * el ajuste lo hago yo por alcance"*. O sea el campo no cambia la cotización:
     * pone la brecha delante de quien decide.
     *
     * ⚠️ **Es un campo propio y no una frase dentro de `justificacion` a
     * propósito.** Ahí el techo son 400 caracteres y las justificaciones reales
     * ya rondan los 330: meterle una cita textual haría que el modelo elija entre
     * argumentar y citar, y cuando no entre, la salida no valida y se pierde el
     * documento. Un dato discreto va en su propio campo.
     */
    presupuestoDeclarado: z.string().max(200).nullable(),
  }),

  /** §7 Supuestos específicos del proyecto. Los base van siempre, desde `content/`. */
  supuestos: z.array(z.string().max(200)).max(5),

  /**
   * ★ Lo que las notas no alcanzaron a responder.
   *
   * Es la válvula de escape de todas las reglas, y cumple el mismo papel que
   * `preguntasDiscovery` en la Fase 2: **sin un lugar donde poner lo que no
   * sabe, el modelo rellena las otras secciones para no dejar huecos.** Acá el
   * hueco deja de ser un defecto y pasa a ser la lista de lo que Daniela
   * completa antes de enviar.
   *
   * El renderer los imprime como `[FALTA: …]` en una sección interna que se
   * borra al aprobar. Una propuesta con tres huecos marcados se termina en cinco
   * minutos; una con tres datos inventados que nadie detectó se manda al cliente.
   */
  faltantes: z.array(z.string().max(200)).max(8),

  /**
   * Plazo límite que el cliente mencionó, si lo mencionó. `null` es lo normal.
   *
   * Nullable y no opcional: `null` es una respuesta explícita del modelo ("no
   * aparece en las notas") y un campo ausente es un output incompleto. La
   * distinción importó en la Fase 2 y vale igual acá.
   */
  plazoLimiteCliente: z.string().max(160).nullable(),
});

export type SalidaPropuesta = z.output<typeof salidaPropuestaSchema>;
