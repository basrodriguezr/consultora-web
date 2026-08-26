import { Fragment } from "react";

import { hero } from "@/content/hero";
import { cta } from "@/content/site";

/**
 * Hero de la portada: titular, bajada, **un solo CTA** y la línea de
 * credenciales.
 *
 * Lo que se fue en el rediseño y por qué:
 * - El badge de "Disponible para nuevos proyectos": no aporta prueba y le roba
 *   la primera mirada al titular.
 * - El CTA secundario ("Ver proyectos"): la spec (§5) exige un único CTA y que
 *   nada compita con él. Dos botones lado a lado dividen la decisión.
 *
 * `min-h-svh` solo desde `md:`, no en móvil: con la sección forzada a la altura
 * de la pantalla y el contenido centrado, en un teléfono angosto el titular
 * ocupa seis líneas y el botón termina empujado bajo el pliegue. Sin altura
 * mínima el bloque mide lo que mide y el CTA queda visible sin scroll en un
 * iPhone SE (375×667), que es el piso que fija la spec.
 */
export default function Hero() {
  return (
    <section className="px-6 pt-28 pb-20 flex items-center md:min-h-svh">
      <div className="max-w-6xl mx-auto w-full">
        <div className="max-w-3xl">
          {/*
            El único `<h1>` de la página. `titulo` va en el color de texto
            normal y `tituloDestacado` en la segunda línea con el degradado:
            `background-clip: text` deja al texto sin color propio, así que se
            usa en un tramo corto y nunca como único medio de comunicar algo.
          */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-fg mb-6">
            {hero.titulo}{" "}
            <span className="text-gradient">{hero.tituloDestacado}</span>
          </h1>

          <p className="text-base sm:text-xl text-muted max-w-2xl mb-8 leading-relaxed">
            {hero.bajada}
          </p>

          {/*
            CTA primario y único. `bg-btn`/`text-btn-fg` es el par de mayor
            contraste del sistema (16.6:1 en claro, el ámbar sobre negro en
            oscuro). En móvil ocupa el ancho completo para ser un objetivo
            táctil grande; desde `sm:` se ajusta al texto.
          */}
          <a
            href={cta.destino}
            className="block sm:inline-block text-center bg-btn text-btn-fg px-6 py-4 rounded-lg font-medium hover:opacity-90 transition"
          >
            {cta.textoLargo} <span aria-hidden="true">→</span>
          </a>

          {/*
            Línea de credenciales: prueba, no titular. Va en `font-mono` y en el
            gris terciario para que se lea como un pie técnico y no compita con
            el botón. El check y los separadores son decorativos — el texto de
            cada credencial ya comunica todo — así que van `aria-hidden` y no se
            leen en voz alta.

            Un `<p>` normal en vez de un contenedor flex: así la línea se parte
            sola donde toca en pantallas angostas.
          */}
          <p className="mt-6 font-mono text-xs text-subtle leading-relaxed">
            <span className="text-exito" aria-hidden="true">
              ✓
            </span>{" "}
            {hero.proof.map((credencial, indice) => (
              <Fragment key={credencial}>
                {/*
                  Los espacios van FUERA del separador: al ser `aria-hidden`, el
                  punto desaparece del árbol de accesibilidad y sin estos nodos
                  de texto un lector de pantalla podría leer
                  "CertifiedProducción" de corrido.
                */}
                {indice > 0 && (
                  <>
                    {" "}
                    <span aria-hidden="true">·</span>{" "}
                  </>
                )}
                {credencial}
              </Fragment>
            ))}
          </p>

          {/* Strip de industrias — auto-segmentación del visitante */}
          <p className="mt-4 font-mono text-xs text-subtle">
            Retail · Inmobiliaria · Servicios · Logística · Manufactura
          </p>
        </div>
      </div>
    </section>
  );
}
