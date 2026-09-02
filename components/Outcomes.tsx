import { outcomes } from "@/content/outcomes";

/**
 * Sección de servicios como OUTCOMES.
 *
 * Inspirado en Datallies (cards resumidas) + Harpy (outcomes, no herramientas).
 * Cada card responde: "¿qué resultado concreto obtengo?"
 *
 * Server Component.
 */
export default function Outcomes() {
  return (
    <section id="servicios" className="py-20 sm:py-24 px-6 border-t border-line bg-warm">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted uppercase tracking-wider mb-4">
          {outcomes.etiqueta}
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold text-fg mb-10 max-w-2xl tracking-tight">
          {outcomes.titulo}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {outcomes.items.map((item) => (
            <div
              key={item.titulo}
              className="bg-panel border border-line rounded-xl p-5 hover:border-brand-500/30 transition"
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {item.icono}
              </span>
              <h3 className="font-semibold text-fg mt-3 mb-2 text-sm">
                {item.titulo}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {item.descripcion}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
