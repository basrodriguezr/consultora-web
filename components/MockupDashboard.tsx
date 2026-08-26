/**
 * Mockup de dashboard — simula el output real de un diagnóstico de ArqData.
 *
 * Decisión (ago-2026): conservamos el diseño rico (métrica destacada + barra +
 * KPIs + tabla de hallazgos) porque da peso de "producto real" y genera
 * confianza en compradores técnicos. Lo que cambió es el CONTENIDO: en vez de
 * un "score de madurez 32/100" (jerga que nadie entiende), el número
 * protagonista es el COSTO que el visitante siente — horas que su equipo
 * pierde hoy armando reportes a mano. Conecta con el pitch:
 * "¿alguien armando reportes a mano? yo hago que eso se haga solo".
 *
 * La cifra en pesos es una estimación etiquetada como tal (no se presenta
 * como dato real de una empresa específica) para no perder honestidad.
 *
 * Usa la paleta terminal del sitio (--term-*). Fondo oscuro fijo para parecer
 * un "screenshot de producto".
 *
 * Server Component: solo markup.
 */
export default function MockupDashboard() {
  const hallazgos = [
    {
      prioridad: "Alta",
      color: "#ff4444",
      hallazgo: "El reporte semanal lo arma una sola persona a mano",
      impacto: "8 hrs/sem",
      impactoColor: "var(--term-subtle)",
    },
    {
      prioridad: "Alta",
      color: "#ff4444",
      hallazgo: "Las ventas se registran en 3 sistemas que nadie cruza",
      impacto: "Cifras que no cuadran",
      impactoColor: "var(--term-subtle)",
    },
    {
      prioridad: "Media",
      color: "var(--term-brand-500)",
      hallazgo: "Nadie sabe qué área gasta más en la nube",
      impacto: "Gasto sin control",
      impactoColor: "var(--term-subtle)",
    },
  ];

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
            ArqData · Radiografía de datos
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
          Diagnóstico rápido
        </span>
      </div>

      {/* Contenido del dashboard */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Métrica protagonista: lo que cuesta hoy (tiempo perdido) */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p
                className="text-[11px] uppercase tracking-wider mb-1"
                style={{ color: "var(--term-subtle)" }}
              >
                Tiempo perdido en tareas manuales
              </p>
              <p className="font-mono text-4xl font-bold" style={{ color: "var(--term-brand-500)" }}>
                18<span className="text-lg" style={{ color: "var(--term-subtle)" }}> hrs/semana</span>
              </p>
            </div>
            <p className="text-[11px] text-right" style={{ color: "var(--term-subtle)" }}>
              ≈ $4,2M al año*<br />
              <span className="text-[10px]">*estimado en horas del equipo</span>
            </p>
          </div>
          {/* Barra: cuánto de eso es automatizable */}
          <div
            className="h-3 rounded-full overflow-hidden relative"
            style={{ background: "var(--term-panel)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: "78%",
                background: "linear-gradient(90deg, var(--term-brand-600), var(--term-brand-500))",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: "var(--term-brand-500)" }}>78% se puede automatizar</span>
            <span className="text-[10px]" style={{ color: "var(--term-subtle)" }}>14 de 18 hrs recuperables</span>
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
            <p className="text-[10px]" style={{ color: "var(--term-subtle)" }}>Depende de 1 persona</p>
            <p className="font-mono text-xl font-bold" style={{ color: "var(--term-error)" }}>2</p>
          </div>
          <div
            className="rounded-lg p-3"
            style={{ background: "var(--term-panel)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p className="text-[10px]" style={{ color: "var(--term-subtle)" }}>Sistemas sin conectar</p>
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
                Qué encontramos
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
                {hallazgos.map((h) => (
                  <tr key={h.hallazgo} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ background: h.color }}
                      />
                      <span className="text-[11px] font-medium" style={{ color: h.color }}>
                        {h.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{h.hallazgo}</td>
                    <td
                      className="px-4 py-2.5 hidden sm:table-cell"
                      style={{ color: h.impactoColor }}
                    >
                      {h.impacto}
                    </td>
                  </tr>
                ))}
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
