import ContactoForm from "@/components/ContactoForm";
import { contacto } from "@/content/contacto";

/**
 * Sección "Contacto": el destino de todos los CTA de la página y su único
 * objetivo real.
 *
 * Server Component: solo el formulario (interactivo) es cliente.
 *
 * El `id` lo usan los CTA del nav, el hero y el caso real. `scroll-margin-top`
 * ya está resuelto en `globals.css` para que el nav sticky no tape el titular.
 */
export default function Contacto() {
  return (
    <section id="contacto" className="py-24 px-6 border-t border-line">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-fg mb-4">
            {contacto.titulo}
          </h2>
          <p className="text-muted mb-6">{contacto.bajada}</p>

          {/* Trust signals: reducen fricción justo antes del formulario */}
          <div className="flex flex-wrap justify-center gap-3 mb-2">
            {contacto.trustSignals.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center gap-1.5 font-mono text-xs text-subtle border border-line rounded-md px-3 py-1.5 bg-panel"
              >
                <span className="text-exito" aria-hidden="true">✓</span>
                {signal}
              </span>
            ))}
          </div>
        </div>

        <ContactoForm />
      </div>
    </section>
  );
}
