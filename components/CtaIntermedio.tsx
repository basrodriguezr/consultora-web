import { cta } from "@/content/site";

/**
 * CTA intermedio — segundo punto de conversión para quienes ya se convencieron.
 *
 * Se posiciona entre SocialProof y Diferencial. Quien ya se reconoció en el
 * dolor y vio los datos de mercado puede estar listo para actuar sin necesitar
 * leer el resto. Este strip le da la salida sin obligarlo a scrollear hasta
 * el final.
 *
 * Es un banner horizontal compacto, no una sección completa: no tiene `id`
 * propio ni compite visualmente con las secciones de contenido. Usa
 * `gradient-border` para el resplandor sutil del tema.
 *
 * Server Component: no hay estado.
 */
export default function CtaIntermedio() {
  return (
    <div className="px-6 py-12 border-t border-line">
      <div className="max-w-4xl mx-auto gradient-border rounded-xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
        <div className="flex-1 text-center sm:text-left">
          <p className="text-lg sm:text-xl font-semibold text-fg">
            ¿Ya sabes que necesitas resolver esto?
          </p>
          <p className="mt-2 text-sm text-muted">
            Agenda los 30 minutos gratis y te decimos si podemos ayudarte — o no.
          </p>
        </div>
        <a
          href={cta.destino}
          className="shrink-0 bg-btn text-btn-fg px-6 py-3 rounded-lg font-medium whitespace-nowrap hover:opacity-90 transition text-sm"
        >
          {cta.texto} <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
