import type { Metadata } from "next";

import AssessmentForm from "@/components/AssessmentForm";
import { assessment } from "@/content/assessment";

/**
 * `/assessment` — el formulario largo de la Fase 2 (15 campos, §15c del plan).
 *
 * Server Component a propósito y sin lógica: metadata, un `h1`, la bajada y el
 * formulario. Todo lo interactivo —estado, validación, envío, la confirmación
 * con o sin Calendly— vive en `components/AssessmentForm.tsx`, que es el único
 * Client Component de la ruta. Si algo de esta página necesitara `useState`,
 * está en el archivo equivocado.
 *
 * La copy sale de `content/assessment.ts`. Acá no se escribe texto de negocio:
 * la regla del proyecto es que el markup solo lee `content/`, para que cambiar
 * una pregunta no obligue a tocar JSX.
 */

/**
 * El `title` va como string plano para que le aplique el `title.template` del
 * layout raíz (`%s · ArqData`, definido en `lib/seo.ts`). Un objeto
 * `{ absolute }` acá se saltearía la marca, que es justo lo que el template
 * existe para garantizar.
 *
 * `title` y `description` se derivan de `content/assessment.ts` en vez de
 * escribirse de nuevo: son texto indexable y duplicarlo garantiza que un día
 * digan cosas distintas de lo que muestra la página.
 *
 * **`alternates.canonical` no es opcional acá.** El merge de metadata de Next
 * es *shallow* y por segmento: un campo anidado que esta página no declara se
 * hereda entero del layout. El layout declara `alternates: { canonical: "/" }`,
 * así que sin esta línea `/assessment` publicaría una canónica apuntando a la
 * home — o sea le diría a Google que esta página es un duplicado de otra, que
 * es la forma más silenciosa de no existir en el índice.
 *
 * **No se declara `openGraph` (ni `twitter`) a propósito, y el motivo es más
 * fino que "se hereda":** la imagen OG la inyecta la convención de archivo
 * `app/opengraph-image.tsx`, y Next solo la repone si el segmento **actual** no
 * declara `openGraph.images`. Declarar un `openGraph` acá —aunque sea solo para
 * corregir `og:url`— reemplaza el objeto resuelto del layout **con la imagen
 * adentro**, y esta ruta no tiene `opengraph-image` propia que la reponga: el
 * resultado sería una página que se comparte sin miniatura. Se prefiere heredar
 * el bloque de la home completo, imagen incluida.
 *
 * **Y no lleva `noindex`.** Es deliberado: mientras `app/api/assessment/route.ts`
 * (paso 7) no exista, la página simplemente **no se anuncia** —está fuera del
 * sitemap, ver el comentario en `app/sitemap.ts`— pero se sirve indexable. Un
 * `noindex` "temporal" es exactamente lo que después nadie se acuerda de sacar y
 * termina bloqueando la página cuando por fin funciona. No declarar `robots`
 * también deja intacto el bloque del layout (`index: true` + las directivas de
 * `googleBot`), que el merge shallow reemplazaría entero si acá se tocara.
 */
export const metadata: Metadata = {
  title: assessment.titulo,
  description: assessment.bajada,
  alternates: { canonical: "/assessment" },
};

export default function AssessmentPage() {
  return (
    /*
     * Mismo ancho de línea y ritmo vertical que `/privacidad`: son las dos
     * páginas de lectura/llenado del sitio y no hay razón para que se sientan
     * distintas. `max-w-2xl` mantiene la medida cómoda para leer preguntas y
     * para tipear en los campos.
     */
    <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
      {/*
       * Único `h1` de la ruta. El formulario titula sus cinco bloques con `h2`
       * y monta `<Confirmacion nivelTitulo="h2">` al enviar, así que acá no va
       * ningún otro encabezado: agregar uno partiría el esquema del documento
       * en dos secciones hermanas donde hay una sola.
       */}
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-fg">
        {assessment.titulo}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        {assessment.bajada}
      </p>

      <div className="mt-12">
        <AssessmentForm />
      </div>
    </div>
  );
}
