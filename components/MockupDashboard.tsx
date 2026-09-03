/**
 * Mockup de dashboard — simula el output real de un diagnóstico de ArqData:
 * un reporte ejecutivo que "se genera solo cada mañana".
 *
 * Decisión (ago-2026): reemplaza el "score de madurez" (jerga) por un scorecard
 * ejecutivo — KPIs de negocio + gráfico de tendencia + un insight en una línea.
 * Referencia: Runrate Advisory (gemelo de negocio) muestra exactamente esto en
 * su hero. Muestra EL SUEÑO (mis números al día, sin esfuerzo), no el problema.
 * Estilo "Flux": borde con degradado, glow suave, tarjetas con relieve.
 *
 * A diferencia del mockup anterior (fondo oscuro fijo), este usa los TOKENS del
 * tema (`--color-*`) para adaptarse al modo claro/oscuro del visitante y no
 * chocar con el resto de la página.
 *
 * Los números son ilustrativos (no de un cliente real); así lo dice el letrero
 * de la sección que lo contiene.
 *
 * Server Component: solo markup.
 */

interface BarraSemana {
  semana: string;
  monto: string;
  altura: string;
  destacada?: boolean;
}

const semanas: BarraSemana[] = [
  { semana: "S29", monto: "$186", altura: "52%" },
  { semana: "S30", monto: "$198", altura: "60%" },
  { semana: "S31", monto: "$191", altura: "56%" },
  { semana: "S32", monto: "$207", altura: "72%" },
  { semana: "S33", monto: "$213", altura: "80%" },
  { semana: "S34", monto: "$224", altura: "96%", destacada: true },
];

export default function MockupDashboard() {
  return (
    <div className="relative rounded-2xl p-px overflow-hidden">
      {/* Borde con degradado (estilo Flux) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(var(--term-luz),0.5), rgba(47,74,156,0.35), transparent 60%)",
        }}
      />
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-panel)",
          boxShadow: "0 30px 60px -25px rgba(40,35,80,0.35)",
        }}
      >
        {/* Header del "app" */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--color-line)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
              ArqData · Reporte ejecutivo
            </span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-2.5 py-1"
            style={{
              color: "var(--color-exito)",
              background: "color-mix(in srgb, var(--color-exito) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-exito) 25%, transparent)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-exito)" }} />
            Actualizado 6:00 AM
          </span>
        </div>

        {/* Contenido */}
        <div className="p-5 sm:p-6 space-y-5">
          <p
            className="text-[11px] uppercase tracking-wider"
            style={{ color: "var(--color-subtle)" }}
          >
            Se genera solo cada mañana · sin que nadie lo arme a mano
          </p>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-xl p-3.5"
              style={{ background: "var(--color-warm)", border: "1px solid var(--color-line)" }}
            >
              <p className="text-[10px]" style={{ color: "var(--color-subtle)" }}>Ventas del mes</p>
              <p className="font-mono text-xl font-bold mt-1" style={{ color: "var(--color-fg)" }}>$224M</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-exito)" }}>▲ 6,7% vs plan</p>
            </div>
            <div
              className="rounded-xl p-3.5"
              style={{ background: "var(--color-warm)", border: "1px solid var(--color-line)" }}
            >
              <p className="text-[10px]" style={{ color: "var(--color-subtle)" }}>Margen bruto</p>
              <p className="font-mono text-xl font-bold mt-1" style={{ color: "var(--color-error)" }}>29,8%</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-error)" }}>▼ 4,2 pts vs plan</p>
            </div>
            <div
              className="rounded-xl p-3.5"
              style={{ background: "var(--color-warm)", border: "1px solid var(--color-line)" }}
            >
              <p className="text-[10px]" style={{ color: "var(--color-subtle)" }}>Caja disponible</p>
              <p className="font-mono text-xl font-bold mt-1" style={{ color: "var(--color-fg)" }}>$1.520M</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-exito)" }}>▲ 8,6% vs plan</p>
            </div>
          </div>

          {/* Gráfico de barras */}
          <div
            className="rounded-xl p-4 pb-3"
            style={{ background: "var(--color-warm)", border: "1px solid var(--color-line)" }}
          >
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
                Ventas últimas 6 semanas
              </span>
              <span className="text-[10px]" style={{ color: "var(--color-subtle)" }}>millones CLP</span>
            </div>
            <div className="flex items-end gap-2 sm:gap-3" style={{ height: "110px" }}>
              {semanas.map((s) => (
                <div key={s.semana} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                  <span className="text-[10px] font-semibold" style={{ color: "var(--color-muted)" }}>
                    {s.monto}
                  </span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: s.altura,
                      background: s.destacada
                        ? "linear-gradient(180deg, var(--color-brand-400), var(--color-brand-600))"
                        : "color-mix(in srgb, var(--color-line-strong) 75%, transparent)",
                    }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--color-subtle)" }}>{s.semana}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insight en una línea */}
          <div
            className="rounded-xl p-4 flex items-start gap-2.5"
            style={{
              background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-error) 22%, transparent)",
            }}
          >
            <span className="font-bold shrink-0" style={{ color: "var(--color-error)" }} aria-hidden="true">→</span>
            <p className="text-[13px] leading-snug" style={{ color: "var(--color-fg)" }}>
              El <strong style={{ color: "var(--color-error)" }}>margen cae</strong> mientras las ventas
              suben. Esa es la conversación que vale la pena tener esta semana — y ahora la ves el lunes
              temprano, no cuando ya es tarde.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
