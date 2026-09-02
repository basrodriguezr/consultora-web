import type { MetadataRoute } from "next";

import { siteUrl } from "@/content/site";

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

interface RutaIndexable {
  /** Path absoluto dentro del sitio, con `/` inicial. */
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}

/**
 * Rutas **indexables**. El sitemap no es un inventario de páginas: es la lista
 * de URLs que le pedimos a Google que indexe. Una ruta que no queremos en los
 * resultados no va acá aunque exista y responda 200.
 *
 * Hoy el sitio tiene cinco páginas y tres se anuncian acá.
 */
const rutas: RutaIndexable[] = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  // Indexable y de baja prioridad: nadie la busca, pero que sea rastreable y
  // encontrable es parte de cumplir con la Ley 21.719.
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.3 },
  // Entró al sitemap el 2026-08-29, cuando `app/api/assessment/route.ts` pasó a
  // existir (paso 7): hasta entonces la página se servía pero su formulario
  // posteaba a un 404, y anunciar eso habría sido peor que no anunciarlo.
  { path: "/assessment", changeFrequency: "monthly", priority: 0.8 },
];

/**
 * `/thank-you` queda FUERA del sitemap a propósito — y las dos mitades de esa
 * decisión importan:
 *
 * 1. **No va en el sitemap.** La página se sirve con `noindex` (metadata propia
 *    en `app/thank-you/page.tsx`). Listar en el sitemap una URL marcada
 *    `noindex` son dos señales contradictorias en la misma dirección: Search
 *    Console lo reporta como el error "URL enviada marcada como noindex" y
 *    ensucia la cobertura del único sitemap que tenemos. Es una confirmación de
 *    conversión, no un resultado de búsqueda.
 *
 * 2. **Pero NO se bloquea en `robots.txt`.** Es la trampa clásica: un
 *    `Disallow: /thank-you` impide el rastreo, y sin rastrear la página el
 *    crawler nunca llega a leer la etiqueta `noindex` — con lo cual, si alguien
 *    la enlaza, puede terminar indexada igual, sin título ni descripción. Para
 *    que `noindex` funcione, la página tiene que ser rastreable. Ver `robots.ts`.
 */

/**
 * `/assessment` queda fuera del sitemap **por ahora**, y por un motivo distinto
 * al de `/thank-you`. Acá no hay ninguna decisión permanente: es una página que
 * queremos indexada, apenas sirva para algo.
 *
 * 1. **Por qué todavía no se anuncia.** El formulario postea a
 *    `/api/assessment`, que llega en el paso 7 de la Fase 2 y hoy no existe:
 *    quien complete los 15 campos se come un 404 al enviar. Meterla en el
 *    sitemap es pedirle a Google que mande gente a una página cuya única acción
 *    falla — se gasta la primera impresión y, si el crawler la indexa así, la
 *    señal de calidad que registra es la de esa versión. No anunciarla cuesta
 *    cero; anunciarla rota cuesta reputación de dominio.
 *
 * 2. **Por eso NO lleva `noindex`, y la distinción es la del bloque de arriba
 *    leída al revés.** `/thank-you` no se indexa nunca: es una decisión de
 *    diseño y `noindex` la expresa bien. `/assessment` sí se va a indexar: lo
 *    único que hacemos es no **anunciarla** mientras esté a medio construir. Un
 *    `noindex` "temporal" es una promesa que hay que acordarse de deshacer meses
 *    después, y en este proyecto ya sabemos qué pasa con esas: se olvidan y
 *    terminan bloqueando en producción algo que hace rato funciona. Estar fuera
 *    del sitemap no bloquea nada — el día del paso 7 se descomenta la línea de
 *    arriba y listo, sin tocar `robots.ts` ni la metadata de la página.
 *
 * 3. **Qué disparar cuando se descomente**: reenviar el sitemap en Search
 *    Console. Es lo que convierte "está en el archivo" en "Google lo vio".
 */

/**
 * Genera `/sitemap.xml`. Las URLs se resuelven contra `siteUrl`, que sale de
 * `NEXT_PUBLIC_SITE_URL` y tiene que ser el dominio que Vercel sirve **sin
 * redirigir** (hoy el apex): si apunta al que redirige, cada entrada de este
 * sitemap es un 308.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return rutas.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
