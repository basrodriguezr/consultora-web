import "server-only";

import type { SlugServicio } from "@/content/servicios";

/**
 * Rangos de inversión en CLP. **Material interno: no sale del servidor.**
 *
 * La decisión comercial del 2026-07-27 sacó las cifras del sitio y también del
 * JSON-LD, que es público. Acá vuelven al repo por una razón acotada: el
 * pre-diagnóstico es un email a Daniela, que lo revisa antes de que cualquier
 * cosa llegue a un cliente. El documento puede llevar los rangos; la página web
 * no.
 *
 * **`import "server-only"` es la única garantía que no depende de que nadie se
 * distraiga.** Si un Client Component importa este módulo —directo o a través
 * de tres archivos— el build falla con un error que nombra el archivo, en vez
 * de hornear los precios de la consultora en el bundle que baja el navegador.
 * Por eso vive en `lib/` y no en `content/`: a `content/` lo importan los
 * componentes, y una convención no frena un import distraído.
 *
 * Fuente de verdad de los montos: `Contexto/Empresa/catalogo_servicios.md`.
 */

export interface RangoCLP {
  min: number;
  max: number;
}

/**
 * `Record<SlugServicio, RangoCLP>` y no un objeto suelto: el tipo exige **las
 * siete claves**. Agregar un servicio a `content/servicios.ts` sin darle rango
 * rompe el build acá, que es exactamente lo que queremos — la alternativa es un
 * `undefined` que el renderer imprime como un hueco en un documento que va a
 * una gerencia.
 */
export const rangosInversion: Record<SlugServicio, RangoCLP> = {
  assessment: { min: 3_000_000, max: 6_000_000 },
  "quick-win": { min: 8_000_000, max: 12_000_000 },
  "pipeline-productivo": { min: 25_000_000, max: 50_000_000 },
  "data-governance": { min: 15_000_000, max: 30_000_000 },
  "business-intelligence": { min: 15_000_000, max: 35_000_000 },
  finops: { min: 8_000_000, max: 18_000_000 },
  "ia-agentica": { min: 10_000_000, max: 25_000_000 },
};

/**
 * `$8–12M CLP`. En millones y sin decimales porque así se conversan estos
 * montos en Chile; el separador es un guion corto tipográfico, no un menos.
 */
export function rangoLegible(slug: SlugServicio): string {
  const { min, max } = rangosInversion[slug];
  return `$${min / 1_000_000}–${max / 1_000_000}M CLP`;
}
