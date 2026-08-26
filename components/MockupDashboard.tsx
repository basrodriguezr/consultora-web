/**
 * Mockup de dashboard — simula el output real del diagnóstico de madurez.
 *
 * Usa la paleta terminal del sitio (--term-*) en vez de colores hardcodeados
 * para que combine con el tema general. Mantiene fondo oscuro fijo para
 * parecer un "screenshot de producto".
 *
 * Server Component: solo markup.
 */
export default function MockupDashboard() {
  return (
    <div
      className="rounded-xl border shadow-2xl overflow-hidden"
      style={{
        background: "var(--term-base)",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header del "app" */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--term-muted)" }}
          >
            ArqData · Diagnóstico de Madurez
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-medium rounded px-2 py-0.5"
          style={{
            color: "var(--term-brand-500)",
            background: "rgba(var(--term-luz), 0.08)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--term-brand-500)" }}
          />
          Oportunidad de mejora
        </span>
      </div>

      {/* Contenido del dashboard */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Score + barra de progreso */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p
                className="text-[11px] uppercase tracking-wider mb-1"
                style={{ color: "var(--term-subtle)" }}
              >
                Madurez de Datos
              </p>
              <p className="font-mono text-4xl font-bold" style={{ color: "var(--term-brand-500)" }}>
                32<span className="text-lg" style={{ color: "var(--term-subtle)" }}>/100</span>
              </p>
            </div>
            <p className="text-[11px]" style={{ color: "var(--term-subtle)" }}>
              Promedio industria: 55
            </p>
          </div>
          {/* Barra de progreso */}
          <div
            className="h-3 rounded-full overflow-hidden relative"
            style={{ background: "var(--term-panel)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: "32%",
                background: "linear-gradient(90deg, var(--term-brand-600), var(--term-brand-500))",
              }}
            />
            <div
              className="absolute top-0 h-full w-px"
              style={{ left: "55%", background: "var(--term-subtle)" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: "var(--term-line-strong)" }}>0</span>
            <span className="text-[10px]" style={{ color: "var(--term-subtle)" }}>55 — promedio</span>
            <span className="text-[10px]" style={{ color: "var(--term-line-strong)" }}>100</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-lg p-3"
            style={{ background: "var(--term-panel)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p className="text-[10px]" style={{ color: "var(--term-subtle)" }}>Procesos manuales</p>
            <p className="font-mono text-xl font-bold" style={{ color: "var(--term-error)" }}>4</p>
          </div>
          <div
            className="rounded-lg p-3"
            style={{ background: "var(--term-panel)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p className="text-[10px]" style={{ color: "var(--term-subtle)" }}>Hrs automatizables</p>
            <p className="font-mono text-xl font-bold" style={{ color: "var(--term-brand-500)" }}>
              18<span className="text-xs" style={{ color: "var(--term-subtle)" }}>/sem</span>
            </p>
          </div>
          <div
            className="rounded-lg p-3"
            style={{ background: "var(--term-panel)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p className="text-[10px]" style={{ color: "var(--term-subtle)" }}>Sin conectar</p>
            <p className="font-mono text-xl font-bold" style={{ color: "var(--term-brand-500)" }}>3</p>
          </div>
        </div>

        {/* Tabla de hallazgos */}
        <div className="relative">
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "var(--term-panel)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 16px" }}>
              <p className="text-[11px] font-medium" style={{ color: "var(--term-muted)" }}>
                Hallazgos principales
              </p>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: "var(--term-subtle)" }} className="text-left">
                  <th className="px-4 py-2 font-medium">Prioridad</th>
                  <th className="px-4 py-2 font-medium">Hallazgo</th>
                  <th className="px-4 py-2 font-medium hidden sm:table-cell">Impacto</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--term-fg)" }}>
                <tr style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#ff4444] mr-2" />
                    <span className="text-[11px] font-medium" style={{ color: "var(--term-error)" }}>Alta</span>
                  </td>
                  <td className="px-4 py-2.5">Reporte semanal depende de 1 persona</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: "var(--term-subtle)" }}>8 hrs/sem</td>
                </tr>
                <tr style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#ff4444] mr-2" />
                    <span className="text-[11px] font-medium" style={{ color: "var(--term-error)" }}>Alta</span>
                  </td>
                  <td className="px-4 py-2.5">Datos de ventas duplicados en 3 fuentes</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: "var(--term-subtle)" }}>Decisiones con error</td>
                </tr>
                <tr style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: "var(--term-brand-500)" }} />
                    <span className="text-[11px] font-medium" style={{ color: "var(--term-brand-500)" }}>Media</span>
                  </td>
                  <td className="px-4 py-2.5">Costos cloud sin atribución por área</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: "var(--term-subtle)" }}>Sin visibilidad</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Fade-out inferior */}
          <div
            className="absolute bottom-0 left-0 right-0 h-10 rounded-b-lg pointer-events-none"
            style={{ background: `linear-gradient(to top, var(--term-base), transparent)` }}
          />
        </div>
      </div>
    </div>
  );
}
