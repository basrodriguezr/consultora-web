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

        {/* Mini-dashboard visual — score de compliance */}
        <div className="bg-panel border border-line rounded-xl p-6 sm:p-8 mb-12">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Score circular */}
            <div className="shrink-0 w-32 h-32 rounded-full border-4 border-error/30 flex items-center justify-center relative">
              <div className="text-center">
                <p className="font-mono text-3xl font-bold text-error">32</p>
                <p className="text-xs text-subtle">de 100</p>
              </div>
            </div>
            {/* Alertas */}
            <div className="flex-1 space-y-3 w-full">
              <p className="font-semibold text-fg text-sm mb-3">Alertas detectadas</p>
              <div className="flex items-start gap-3 bg-error/5 border-l-2 border-error rounded-r-lg p-3">
                <span className="text-error text-sm shrink-0">●</span>
                <div>
                  <p className="text-sm text-fg font-medium">6 tablas con datos personales sin clasificar</p>
                  <p className="text-xs text-subtle">Sin política de retención definida</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-error/5 border-l-2 border-error rounded-r-lg p-3">
                <span className="text-error text-sm shrink-0">●</span>
                <div>
                  <p className="text-sm text-fg font-medium">1M+ registros de geolocalización expuestos</p>
                  <p className="text-xs text-subtle">Dato personal por combinación — Ley 21.719 Art. 2</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-warmth/5 border-l-2 border-warmth rounded-r-lg p-3">
                <span className="text-warmth text-sm shrink-0">●</span>
                <div>
                  <p className="text-sm text-fg font-medium">100K textos libres sin sanitizar</p>
                  <p className="text-xs text-subtle">Pueden contener nombres, emails y teléfonos</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs text-subtle text-center sm:text-left">
            Output real del scanner de ArqData sobre base de datos de e-commerce (100K clientes)
          </p>
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

        <p className="mt-10 text-sm sm:text-base text-fg max-w-2xl leading-relaxed">
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
