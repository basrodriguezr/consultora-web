import {
  cierreDolor,
  dolores,
  tituloDolor,
  type Dolor as DolorItem,
} from "@/content/dolor";

/**
 * Paths de los íconos, decorativos. Escritos como tabla y no dentro del `.map()`
 * para que agregar un valor al union de `content/dolor.ts` rompa el build acá:
 * mejor un error de tipos que una tarjeta sin ícono en producción.
 */
const ICONO_PATH: Record<DolorItem["icono"], string> = {
  moneda:
    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  reloj: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  grafico:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
};

/**
 * Clases completas por acento, escritas LITERALES.
 *
 * Nunca por interpolación (`bg-${acento}-500/10`): Tailwind escanea el código
 * como texto plano y una clase construida en runtime no existe en el CSS
 * compilado — el ícono saldría sin color y nada lo avisaría en el build.
 *
 * Los acentos son roles semánticos, no colores: cada tema los resuelve distinto,
 * así que esta tabla no necesita variante por modo.
 */
const ACENTO_RECUADRO: Record<DolorItem["acento"], string> = {
  marca: "bg-brand-500/10",
  calido: "bg-warmth/10",
  agua: "bg-water/10",
  alterno: "bg-alt/10",
};

const ACENTO_ICONO: Record<DolorItem["acento"], string> = {
  marca: "text-brand-500",
  calido: "text-warmth",
  agua: "text-water",
  alterno: "text-alt",
};

/**
 * Sección "¿Te suena?" — cuantifica el dolor antes de proponer nada.
 *
 * El orden de las tarjetas espeja el de los radios de `DESAFIOS` en
 * `lib/leads.ts`: quien se reconoce en la tercera tarjeta encuentra la tercera
 * opción en el formulario. No reordenar sin tocar también aquel archivo.
 */
export default function Dolor() {
  return (
    <section id="dolor" className="py-24 px-6 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-fg text-center max-w-2xl mx-auto mb-12">
          {tituloDolor}
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dolores.map((dolor) => (
            <div
              key={dolor.titulo}
              className="bg-panel border border-line rounded-xl p-6"
            >
              <div
                className={`w-10 h-10 rounded-lg ${ACENTO_RECUADRO[dolor.acento]} flex items-center justify-center mb-4`}
              >
                <svg
                  className={`w-5 h-5 ${ACENTO_ICONO[dolor.acento]}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={ICONO_PATH[dolor.icono]}
                  />
                </svg>
              </div>

              <h3 className="font-semibold text-fg mb-2">{dolor.titulo}</h3>
              <p className="text-sm text-muted leading-relaxed">
                {dolor.descripcion}
              </p>
              <p className="mt-3 font-mono text-xs text-brand-500 font-medium">
                {dolor.costo}
              </p>
            </div>
          ))}
        </div>

        {/* Cierre en tono menor: baja el volumen tras las tres tarjetas y
            entrega la sección al caso real, que es la prueba. */}
        <p className="mt-12 text-center text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          {cierreDolor}
        </p>
      </div>
    </section>
  );
}
