"use client";

import { site } from "@/content/site";

/**
 * Embed inline de Calendly, y el bloque de confirmación que lo envuelve.
 *
 * Los dos viven en el mismo archivo a propósito. El bloque de confirmación se
 * renderiza en dos lugares —dentro del formulario cuando el envío sale bien, y
 * en `/thank-you`— y tiene que decir exactamente lo mismo en ambos. Si el copy
 * viviera duplicado, el día que cambie el plazo de respuesta solo cambiaría uno.
 *
 * Este módulo importa únicamente `content/site`: `app/thank-you` puede tirar de
 * él sin arrastrar zod ni react-hook-form al bundle de esa página.
 *
 * Es Client Component porque `ContactoForm` (que es cliente) lo importa. No usa
 * estado ni efectos: se renderiza igual en el servidor.
 */

/**
 * Normaliza la URL de Calendly para usarla como `src` de un iframe.
 *
 * Devuelve `null` —y el componente degrada visiblemente— en los tres casos en
 * que un iframe sería peor que nada:
 *   1. la variable está vacía (no configurada en Vercel),
 *   2. no es una URL parseable,
 *   3. no es `https:`. Un `src` con otro esquema (`javascript:`, por ejemplo)
 *      metido por una env var mal pegada ejecutaría código en la página.
 *
 * `embed_type=Inline` le pide a Calendly la vista incrustada en vez de la
 * página completa, y `hide_gdpr_banner=1` evita el segundo banner de cookies
 * dentro del iframe. Se setean con `URL.searchParams` para no romper una URL
 * que ya venga con query propia (`?month=`, UTMs, etc.).
 */
function resolverEmbed(valor: string): string | null {
  const limpia = valor.trim();
  if (limpia === "") return null;

  try {
    const url = new URL(limpia);
    if (url.protocol !== "https:") return null;
    url.searchParams.set("embed_type", "Inline");
    url.searchParams.set("hide_gdpr_banner", "1");
    return url.toString();
  } catch {
    return null;
  }
}

const CLASE_LINK =
  "text-brand-500 underline underline-offset-4 hover:text-brand-600 transition";

export default function CalendlyEmbed() {
  const src = resolverEmbed(site.calendly);

  /*
   * Degradación visible, no silenciosa. Sin `NEXT_PUBLIC_CALENDLY_URL` la
   * página no puede cumplir su único trabajo, así que el hueco no se deja en
   * blanco: se ofrece el correo. Que se vea feo es parte del diseño — un
   * espacio vacío nadie lo reporta.
   */
  if (src === null) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6 text-center">
        <p className="text-sm text-muted">
          La agenda en línea no está disponible en este momento. Escríbenos a{" "}
          <a className={CLASE_LINK} href={`mailto:${site.email}`}>
            {site.email}
          </a>{" "}
          y coordinamos la conversación de 30 minutos.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/*
        Iframe directo en vez del `widget.js` de Calendly: no bloquea el render
        inicial (el `loading="lazy"` lo baja cuando se acerca al viewport),
        funciona sin JavaScript de terceros y no puede fallar dejando un div
        vacío, que es el modo de falla del script.

        La altura es fija porque sin el script no hay redimensionado
        automático; el contenido de Calendly scrollea dentro del iframe si no
        alcanza. En móvil se le da más alto porque el calendario se apila.

        Nota conocida: el interior del iframe lo pinta Calendly y no sigue el
        tema del sitio. Los parámetros de color de Calendly exigen hex
        literales, que es justo lo que este proyecto no escribe en componentes.
      */}
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <iframe
          src={src}
          title="Agendar la conversación de diagnóstico de 30 minutos"
          loading="lazy"
          className="block h-[820px] w-full border-0 sm:h-[720px]"
        />
      </div>

      {/*
        Salida de emergencia siempre presente: si el iframe queda bloqueado por
        una extensión, una política corporativa o una CSP, este link sigue
        llevando a la agenda.
      */}
      <p className="mt-3 text-xs text-subtle">
        ¿No se carga el calendario?{" "}
        <a
          className={CLASE_LINK}
          href={site.calendly}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* El texto visible ya anuncia la pestaña nueva: agregarle el
              `sr-only` de la convención lo diría dos veces. */}
          Ábrelo en una pestaña nueva
        </a>
        .
      </p>
    </div>
  );
}

/** Niveles de titular admitidos por el bloque de confirmación. */
type NivelTitulo = "h1" | "h2" | "h3";

interface ConfirmacionProps {
  /**
   * En `/thank-you` el bloque es el contenido de la página (`h1`); dentro del
   * formulario cuelga del `h2` de la sección Contacto, así que ahí es `h3`.
   * Saltarse un nivel rompe la jerarquía que usan los lectores de pantalla
   * para navegar.
   */
  nivelTitulo?: NivelTitulo;

  /**
   * `false` no monta el embed de Calendly. **No cambia nada más**: el título, el
   * párrafo y el link de proyectos son idénticos en los dos casos.
   *
   * Existe por la decisión de Daniela del 2026-08-09: en `/assessment`, un lead
   * que no califica no ve la agenda. El recurso escaso ahí no es la bandeja sino
   * **su hora**, y un `probablemente-no` que se auto-agenda se come una hora
   * real e irrecuperable.
   *
   * ⚠️ **Lo que este flag NO puede hacer es explicar por qué.** La confirmación
   * no dice ni insinúa que alguien no califica: la regla es una conjunción sobre
   * tres enums y se va a equivocar, y quien decide es Daniela, por correo. Si
   * algún día alguien quiere agregar acá un "te contactaremos si corresponde",
   * eso es exactamente lo prohibido.
   *
   * El default es `true` para que `/thank-you` y `ContactoForm` —donde no hay
   * calificación que valga— no tengan que enterarse de que esto existe. El
   * formulario de contacto son 4 campos y no tiene con qué calificar a nadie.
   */
  mostrarAgenda?: boolean;
}

/**
 * Estado "gracias": confirmación + agenda + prueba de trabajo.
 *
 * Se muestra en dos lugares con el mismo contenido a propósito (spec §8):
 *   - reemplazando al formulario cuando el POST responde `ok: true`,
 *   - como página `/thank-you`, que es adonde redirige Calendly después de
 *     agendar (eso se configura dentro de Calendly, no acá) y adonde llega
 *     cualquier link directo.
 *
 * Por eso el texto sirve para las dos rutas: no podemos saber desde esta página
 * si la persona ya agendó dentro del iframe, así que no se afirma ninguna de
 * las dos cosas.
 */
export function Confirmacion({
  nivelTitulo = "h3",
  mostrarAgenda = true,
}: ConfirmacionProps) {
  const Titulo = nivelTitulo;

  return (
    <div className="text-left">
      <Titulo className="text-2xl sm:text-3xl font-semibold text-fg">
        Listo — recibimos tu solicitud.
      </Titulo>
      <p className="mt-4 text-muted leading-relaxed">
        Si agendaste la conversación, nos vemos ahí. Si no, te escribimos en
        menos de 24 horas hábiles.
      </p>

      {mostrarAgenda && (
        <div className="mt-8">
          <CalendlyEmbed />
        </div>
      )}

      <p className="mt-8 text-sm text-muted">
        Mientras tanto, puedes revisar{" "}
        <a
          className={CLASE_LINK}
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          proyectos reales con código y documentación
          <span className="sr-only"> (abre en una pestaña nueva)</span>
        </a>
        .
      </p>
    </div>
  );
}
