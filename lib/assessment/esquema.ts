import { z } from "zod";

import { slugsServicios } from "@/content/servicios";

/**
 * Esquema de lo que devuelve el modelo.
 *
 * **El agente nunca escribe el documento: devuelve datos y el código arma el
 * Markdown.** Cuatro razones, y ninguna es estética:
 *
 *   1. **Los montos no pasan por el modelo.** Elige un *slug* del catálogo; el
 *      rango en CLP lo busca `catalogo-interno.ts`. Un LLM no puede inventar un
 *      precio que nunca le pedimos escribir.
 *   2. **La aritmética tampoco.** `horas × $120.000 × 52` la hace TypeScript.
 *      Los modelos son razonablemente buenos multiplicando, y "razonablemente"
 *      no es el estándar para una cifra que llega a una gerencia.
 *   3. **El texto con peso comercial se queda literal.** El encabezado y los
 *      criterios son casi contractuales; regenerarlos en cada request es
 *      invitarlos a derivar.
 *   4. **Un JSON se valida; un Markdown no.** Un output malformado se detecta
 *      acá y se reintenta. Con Markdown libre te enterás cuando Daniela lee
 *      algo raro.
 */

/**
 * Las cuatro dimensiones de calidad de datos del template v2.
 *
 * No hay porcentajes en ninguna parte: Daniela aprobó la tabla *"sin
 * porcentajes y como preliminar"*. Un `87%` derivado de un formulario tiene
 * apariencia de medición sin serlo, y el documento se lee como si alguien
 * hubiera perfilado la base.
 */
export const DIMENSIONES_CALIDAD = [
  "completitud",
  "unicidad",
  "consistencia",
  "vigencia",
] as const;

export type DimensionCalidad = (typeof DIMENSIONES_CALIDAD)[number];

/**
 * `nivel` y `evidencia` van juntos o no van.
 *
 * El par obliga al modelo a mostrar en qué frase del formulario se apoya. Un
 * *"unicidad: 1"* derivado de que alguien escribió "tenemos clientes repetidos"
 * es una hipótesis razonable; derivado de nada es un número inventado con
 * apariencia de medición. **El refinamiento rechaza `nivel` no-nulo con
 * `evidencia: null`** — la combinación inversa (sin nivel pero con una
 * observación cualitativa) sí es válida y es la que más se va a dar.
 */
const dimensionSchema = z
  .object({
    clave: z.enum(DIMENSIONES_CALIDAD),
    nivel: z.number().int().min(0).max(4).nullable(),
    evidencia: z.string().max(200).nullable(),
    impacto: z.string().max(200),
  })
  .refine((d) => d.nivel === null || d.evidencia !== null, {
    message: "Un nivel de calidad sin evidencia es un número inventado.",
    path: ["evidencia"],
  });

export const salidaAssessmentSchema = z.object({
  resumen: z.string().min(80).max(600),

  /** Hipótesis, no medición. El renderer lo rotula así explícitamente. */
  nivelMadurez: z.number().int().min(0).max(4),

  dimensiones: z.array(dimensionSchema).length(4),

  /**
   * `null` cuando el modelo no puede fundamentar una hipótesis. El renderer lo
   * traduce a `[por confirmar en discovery]`, y el encabezado de esa sección es
   * literal *"Hipótesis a verificar"* — nunca "Causa raíz", que afirma haber
   * mirado el sistema.
   */
  hipotesisCausaRaiz: z.string().max(400).nullable(),

  /** Solo nombra y ordena. Las horas no las produce el modelo (ver `costos.ts`). */
  procesosManuales: z
    .array(
      z.object({
        proceso: z.string().max(120),
        impactoOperativo: z.string().max(160),
      }),
    )
    .min(1)
    .max(4),

  riesgos: z
    .array(
      z.object({
        titulo: z.string().max(80),
        severidad: z.enum(["alta", "media", "baja"]),
        impactoNegocio: z.string().max(240),
      }),
    )
    .min(2)
    .max(4),

  quickWins: z
    .array(
      z.object({
        /** QUÉ hacer, nunca CÓMO. La regla del "cómo" se testea en el renderer. */
        accion: z.string().max(120),
        esfuerzo: z.string().max(40),
        impacto: z.string().max(200),
        /**
         * Fracción de las horas declaradas que libera esta acción. El CLP lo
         * calcula `costos.ts`: el modelo estima proporciones, no plata.
         */
        fraccionHorasLiberadas: z.number().min(0).max(1).nullable(),
      }),
    )
    .length(3),

  /**
   * Del catálogo, derivado de `content/servicios.ts`. Que sea un enum es lo que
   * impide que el modelo recomiende un servicio que la consultora no vende.
   */
  servicioRecomendado: z.enum(slugsServicios),
  justificacionServicio: z.string().max(400),

  /**
   * ★ La sección 6 del pre-diagnóstico: lo que el agente **no** pudo determinar.
   *
   * Es la válvula de escape de todas las reglas de contenido. Sin un lugar
   * donde poner lo que no sabe, el modelo termina inventando para llenar las
   * otras secciones. Acá el hueco deja de ser un defecto y pasa a ser la agenda
   * de la discovery, que es lo que Daniela va a usar en la llamada.
   */
  preguntasDiscovery: z.array(z.string().max(180)).min(3).max(8),

  /** Nota interna. Nunca sale en el documento que Daniela podría reenviar. */
  senalesDeAlerta: z.array(z.string().max(160)).max(3),
});

export type SalidaAssessment = z.output<typeof salidaAssessmentSchema>;
