import { minicaso } from "@/content/minicaso";

/**
 * Mini-caso compliance — prueba propia de capacidad técnica.
 *
 * Se posiciona entre Proceso y SobreNosotros: después de que el visitante sabe
 * CÓMO funciona, le mostramos QUÉ recibe con un ejemplo concreto.
 *
 * Diseño: fondo `bg-warm` para diferenciarlo visualmente (igual que Social
 * Proof), métricas en grid, entregables como checklist.
 *
 * Server Component: solo datos y markup.
 */
export default function MiniCaso() {
  return (
    <section id="ejemplo" className="py-20 sm:py-24 px-6 border-t border-line bg-warm">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted uppercase tracking-wider mb-4">
          {minicaso.etiqueta}
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-fg mb-4 max-w-3xl tracking-tight">
          {minicaso.titulo}
        </h2>
        <p className="text-muted mb-10 max-w-2xl leading-relaxed">
          {minicaso.contexto}
        </p>

        {/* Métricas del scan — impacto visual rápido */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {minicaso.metricas.map((metrica) => (
            <div
              key={metrica.cifra}
              className="bg-panel border border-line rounded-xl p-5"
            >
              <p className="font-mono text-2xl sm:text-3xl font-bold text-brand-500 mb-2">
                {metrica.cifra}
              </p>
              <p className="text-sm text-muted leading-relaxed">
                {metrica.descripcion}
              </p>
            </div>
          ))}
        </div>

        {/* Entregables — qué recibes concretamente */}
        <div className="bg-panel border border-line rounded-xl p-6 sm:p-8 max-w-2xl">
          <h3 className="font-semibold text-fg mb-4">
            Qué recibes en el diagnóstico
          </h3>
          <ul className="space-y-3">
            {minicaso.entregables.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted">
                <span className="text-exito shrink-0 mt-0.5" aria-hidden="true">✓</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-sm sm:text-base text-muted max-w-2xl leading-relaxed italic">
          {minicaso.cierre}
        </p>

        {/* Escalera de valor — qué viene después, sin obligar */}
        <div className="mt-14 max-w-2xl">
          <h3 className="font-semibold text-fg mb-6">
            {minicaso.escalera.titulo}
          </h3>
          <ol className="space-y-4">
            {minicaso.escalera.pasos.map((paso, i) => (
              <li key={paso.nombre} className="flex items-start gap-4">
                <span
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-medium ${
                    paso.activo
                      ? "bg-brand-500/10 text-brand-500 border border-brand-500/25"
                      : "bg-panel text-subtle border border-line"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className={`font-medium ${paso.activo ? "text-fg" : "text-muted"}`}>
                    {paso.nombre}
                  </p>
                  <p className="text-xs text-subtle mt-0.5">{paso.detalle}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs text-subtle italic">
            {minicaso.escalera.nota}
          </p>
        </div>
      </div>
    </section>
  );
}
