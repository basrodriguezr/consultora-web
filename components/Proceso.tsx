import DiagramaFlujo from "@/components/DiagramaFlujo";
import { proceso, subtituloProceso, tituloProceso } from "@/content/proceso";

/**
 * Sección 6 — "Cómo funciona": diagrama de flujo + los tres pasos.
 *
 * El diagrama va primero: le da al visitante la foto completa en 2 segundos.
 * Los pasos detallados van debajo para quien quiere leer.
 *
 * Server Component: solo datos y markup.
 */
export default function Proceso() {
  return (
    <section id="proceso" className="py-20 sm:py-24 px-6 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted uppercase tracking-wider mb-4">
          Proceso
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-3 tracking-tight">
          {tituloProceso}
        </h2>
        <p className="text-muted mb-12 max-w-2xl">
          {subtituloProceso}
        </p>

        {/* Diagrama de flujo visual — resumen en 2 segundos */}
        <DiagramaFlujo />

        {/* Vertical en móvil, tres columnas en desktop. */}
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {proceso.map((paso) => (
            <li key={paso.numero}>
              <div className="flex items-center gap-4 mb-4">
                <span className="font-mono text-4xl sm:text-5xl leading-none tabular-nums text-fg">
                  {paso.numero}
                </span>
                <span
                  aria-hidden="true"
                  className="h-px flex-1 bg-line-strong/40"
                />
              </div>

              <h3 className="font-semibold mb-1">{paso.titulo}</h3>
              <p className="font-mono text-xs text-brand-500 font-medium mb-3">
                {paso.tiempo}
              </p>
              <p className="text-sm text-muted leading-relaxed mb-3">
                {paso.descripcion}
              </p>
              <p className="text-xs text-subtle italic">
                {paso.garantia}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
