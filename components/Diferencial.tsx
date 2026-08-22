import type { ReactNode } from "react";
import {
  diferenciales,
  tituloDiferencial,
  type Diferencial as DiferencialItem,
} from "@/content/diferenciales";

/**
 * Íconos decorativos, uno por valor de `diferencial.icono`.
 *
 * Se guardan como JSX y no como string de `d` porque `diana` necesita varias
 * formas (dos círculos y el centro) y forzar eso en un solo `path` daría un
 * trazo peor por ahorrar tres líneas.
 *
 * Son decorativos: el `<svg>` que los envuelve lleva `aria-hidden`, así que un
 * lector de pantalla anuncia el título de la tarjeta y nada más. El ícono no
 * transmite información que no esté ya en el texto.
 */
const ICONO: Record<DiferencialItem["icono"], ReactNode> = {
  persona: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
    />
  ),
  candado: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
    />
  ),
  diana: (
    <>
      <circle cx="12" cy="12" r="8.25" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="4" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="1" strokeWidth={1.5} />
    </>
  ),
};

/**
 * Clases completas por acento (fondo del recuadro y color del trazo).
 *
 * Escritas literalmente porque Tailwind escanea el código fuente: una clase
 * armada por interpolación (`bg-${acento}-500/10`) no existe en el CSS final y
 * el ícono sale sin color. Los acentos son **roles** semánticos, así que esta
 * tabla no cambia entre modo claro y oscuro — los tokens ya lo resuelven.
 *
 * El `Record` cubre los cuatro valores del union aunque hoy solo se usen tres:
 * agregar un acento nuevo en `content/` rompe el build acá, que es lo que
 * queremos. Mejor un error de tipos que una tarjeta sin color.
 */
const ACENTO_RECUADRO: Record<DiferencialItem["acento"], string> = {
  marca: "bg-brand-500/10 border-brand-500/25",
  calido: "bg-warmth/10 border-warmth/25",
  agua: "bg-water/10 border-water/25",
  alterno: "bg-alt/10 border-alt/25",
};

const ACENTO_ICONO: Record<DiferencialItem["acento"], string> = {
  marca: "text-brand-500",
  calido: "text-warmth",
  agua: "text-water",
  alterno: "text-alt",
};

/**
 * Sección 5 — "Diferencial": las tres garantías de `content/diferenciales.ts`.
 *
 * Server Component: no hay estado ni interacción, solo un `.map()` sobre datos.
 */
export default function Diferencial() {
  return (
    <section
      id="diferencial"
      className="py-20 sm:py-24 px-6 border-t border-line"
    >
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted uppercase tracking-wider mb-4">
          Diferencial
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-12 max-w-2xl tracking-tight">
          {tituloDiferencial}
        </h2>

        {/* Mobile first: una columna, dos en tablet, tres en desktop. */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {diferenciales.map((diferencial) => (
            <div key={diferencial.titulo}>
              <div
                className={`w-11 h-11 rounded-lg border flex items-center justify-center mb-5 ${ACENTO_RECUADRO[diferencial.acento]}`}
              >
                <svg
                  className={`w-5 h-5 ${ACENTO_ICONO[diferencial.acento]}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {ICONO[diferencial.icono]}
                </svg>
              </div>
              <p className="text-xs text-subtle italic mb-3">
                {diferencial.objecion}
              </p>
              <h3 className="font-semibold mb-2">{diferencial.titulo}</h3>
              <p className="text-sm text-muted leading-relaxed">
                {diferencial.descripcion}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
