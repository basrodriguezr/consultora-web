/**
 * Diagrama de flujo visual — 3 nodos conectados que muestran el camino de valor.
 *
 * Horizontal en desktop (md+), vertical en mobile. Cada nodo tiene un ícono SVG
 * + label. Los conectores son líneas con gradiente sutil.
 *
 * No es un diagrama de arquitectura técnica — es un flujo de valor para el
 * gerente: "tus datos como están → lo que hacemos → lo que recibes".
 *
 * Server Component: solo SVG y markup.
 */

const nodos = [
  {
    label: "Tus datos como están hoy",
    icono: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 9.75h16.5M3.75 9.75A2.25 2.25 0 016 7.5h12a2.25 2.25 0 012.25 2.25m-18 0v6a2.25 2.25 0 002.25 2.25h12a2.25 2.25 0 002.25-2.25v-6m-18 0h16.5m-16.5 3h16.5"
      />
    ),
  },
  {
    label: "Diagnóstico en 2 semanas",
    icono: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    ),
  },
  {
    label: "Roadmap + primeras mejoras",
    icono: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
] as const;

export default function DiagramaFlujo() {
  return (
    <div className="mb-12">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center justify-center gap-0">
        {nodos.map((nodo, i) => (
          <div key={nodo.label} className="flex items-center">
            {/* Nodo */}
            <div className="flex flex-col items-center gap-3 w-44">
              <div className="w-14 h-14 rounded-xl bg-panel border border-line flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-brand-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {nodo.icono}
                </svg>
              </div>
              <p className="text-sm text-fg text-center font-medium leading-tight">
                {nodo.label}
              </p>
            </div>
            {/* Conector (no después del último nodo) */}
            {i < nodos.length - 1 && (
              <div className="w-16 flex items-center justify-center" aria-hidden="true">
                <div className="w-full h-px bg-gradient-to-r from-line-strong/60 to-brand-500/40" />
                <svg
                  className="w-3 h-3 text-brand-500/60 -ml-1 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 12 12"
                >
                  <path d="M4 2l4 4-4 4" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="flex md:hidden flex-col items-center gap-0">
        {nodos.map((nodo, i) => (
          <div key={nodo.label} className="flex flex-col items-center">
            {/* Nodo */}
            <div className="flex items-center gap-4 w-full max-w-xs">
              <div className="w-12 h-12 rounded-xl bg-panel border border-line flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-brand-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {nodo.icono}
                </svg>
              </div>
              <p className="text-sm text-fg font-medium leading-tight">
                {nodo.label}
              </p>
            </div>
            {/* Conector vertical */}
            {i < nodos.length - 1 && (
              <div className="h-8 w-px bg-gradient-to-b from-line-strong/60 to-brand-500/40 ml-6 self-start" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
