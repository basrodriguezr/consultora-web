import { nosotros } from "@/content/nosotros";
import { site } from "@/content/site";

/**
 * Sección 7 — "Quiénes somos".
 *
 * Estilo Credence: personas visibles con nombre y experiencia concreta.
 * Sin foto de momento — nombre + rol + línea de experiencia es suficiente.
 *
 * Server Component.
 */
export default function SobreNosotros() {
  return (
    <section id="nosotros" className="py-20 sm:py-24 px-6 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted uppercase tracking-wider mb-4">
          Nosotros
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-8 tracking-tight">
          {nosotros.titulo}
        </h2>

        {/* Personas del equipo */}
        <div className="grid sm:grid-cols-2 gap-6 mb-10 max-w-3xl">
          {/* Fundadora */}
          <div className="bg-panel border border-line rounded-xl p-5">
            <p className="font-semibold text-fg">{nosotros.fundadora.nombre}</p>
            <p className="text-xs text-brand-500 font-mono mt-0.5">
              {nosotros.fundadora.rol}
            </p>
            <p className="text-sm text-muted leading-relaxed mt-3">
              {nosotros.fundadora.experiencia}
            </p>
          </div>
          {/* Socio técnico */}
          <div className="bg-panel border border-line rounded-xl p-5">
            <p className="font-semibold text-fg">{nosotros.socio.nombre}</p>
            <p className="text-xs text-brand-500 font-mono mt-0.5">
              {nosotros.socio.rol}
            </p>
            <p className="text-sm text-muted leading-relaxed mt-3">
              {nosotros.socio.experiencia}
            </p>
          </div>
        </div>

        {/* Párrafos descriptivos */}
        <div className="max-w-2xl space-y-4">
          {nosotros.parrafos.map((parrafo) => (
            <p key={parrafo} className="text-muted leading-relaxed">
              {parrafo}
            </p>
          ))}
        </div>

        {/* Credenciales */}
        <ul className="flex flex-wrap gap-2 mt-8">
          {nosotros.credenciales.map((credencial) => (
            <li
              key={credencial}
              className="font-mono text-xs text-subtle border border-line rounded-md px-3 py-1.5 bg-panel"
            >
              {credencial}
            </li>
          ))}
        </ul>

        {/* Links */}
        <div className="flex flex-wrap gap-6 mt-8">
          <a
            href={site.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-fg transition"
          >
            LinkedIn
            <span className="sr-only"> (abre en una pestaña nueva)</span>
          </a>
          <a
            href={site.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-fg transition"
          >
            GitHub
            <span className="sr-only"> (abre en una pestaña nueva)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
