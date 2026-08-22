import {
  cierreSocialProof,
  datos,
  tituloSocialProof,
} from "@/content/socialProof";

/**
 * Sección Social Proof — datos de mercado entre Dolor y Diferencial.
 *
 * El propósito es validar la urgencia: después de que el visitante se reconoce
 * en un dolor, estos datos confirman que hay presión externa (regulación, IA,
 * competencia) y que no actuar tiene costo creciente.
 *
 * Diseño: strip horizontal con tres cifras grandes. Minimalista, sin tarjetas
 * pesadas — las cifras tienen que leerse en 3 segundos de scroll.
 *
 * Server Component: solo datos y markup.
 */
export default function SocialProof() {
  return (
    <section
      id="mercado"
      className="py-20 sm:py-24 px-6 border-t border-line bg-warm"
    >
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted uppercase tracking-wider mb-4">
          El contexto
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-fg mb-12 max-w-2xl tracking-tight">
          {tituloSocialProof}
        </h2>

        <div className="grid gap-8 sm:grid-cols-3">
          {datos.map((dato) => (
            <div key={dato.cifra} className="text-left">
              <p className="font-mono text-3xl sm:text-4xl font-bold text-brand-500 mb-3">
                {dato.cifra}
              </p>
              <p className="text-sm text-muted leading-relaxed mb-2">
                {dato.contexto}
              </p>
              <p className="font-mono text-xs text-subtle">
                {dato.fuente}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          {cierreSocialProof}
        </p>
      </div>
    </section>
  );
}
