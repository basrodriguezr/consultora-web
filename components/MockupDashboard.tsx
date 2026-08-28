/**
 * Mockup de dashboard — simula el output real del diagnóstico de madurez.
 *
 * Fondo siempre oscuro (independiente del tema del sitio) para que se vea como
 * un screenshot de producto flotando sobre la página.
 *
 * Narrativa genérica de "madurez de datos" — conecta con todos los dolores
 * de la landing (reportes manuales, datos inconsistentes, costos).
 *
 * Server Component: solo markup y SVG.
 */
export default function MockupDashboard() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1117] shadow-2xl shadow-black/40 overflow-hidden">
      {/* Header del "app" */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="font-mono text-xs text-[#8b8b8b]">
            ArqData · Diagnóstico de Madurez
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#ffa44f] bg-[#ffa44f]/10 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffa44f]" />
          Oportunidad de mejora
        </span>
      </div>

      {/* Contenido del dashboard */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Score + barra de progreso */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-[11px] text-[#6b6b6b] uppercase tracking-wider mb-1">
                Madurez de Datos
              </p>
              <p className="font-mono text-4xl font-bold text-[#ffa44f]">
                32<span className="text-lg text-[#6b6b6b]">/100</span>
              </p>
            </div>
            <p className="text-[11px] text-[#6b6b6b]">
              Promedio industria: 55
            </p>
          </div>
          {/* Barra de progreso con degradado */}
          <div className="h-3 rounded-full bg-[#1a1d27] overflow-hidden relative">
            <div
              className="h-full rounded-full"
              style={{
                width: "32%",
                background: "linear-gradient(90deg, #ff6b4a, #ffa44f)",
              }}
            />
            {/* Marcador del promedio */}
            <div
              className="absolute top-0 h-full w-px bg-[#6b6b6b]"
              style={{ left: "55%" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#4a4a4a]">0</span>
            <span className="text-[10px] text-[#6b6b6b]">55 — promedio</span>
            <span className="text-[10px] text-[#4a4a4a]">100</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1d27] rounded-lg p-3 border border-white/5">
            <p className="text-[10px] text-[#6b6b6b] mb-1">Procesos manuales</p>
            <p className="font-mono text-xl font-bold text-[#ff6b6b]">4</p>
          </div>
          <div className="bg-[#1a1d27] rounded-lg p-3 border border-white/5">
            <p className="text-[10px] text-[#6b6b6b] mb-1">Hrs automatizables</p>
            <p className="font-mono text-xl font-bold text-[#ffa44f]">18<span className="text-xs text-[#6b6b6b]">/sem</span></p>
          </div>
          <div className="bg-[#1a1d27] rounded-lg p-3 border border-white/5">
            <p className="text-[10px] text-[#6b6b6b] mb-1">Sin conectar</p>
            <p className="font-mono text-xl font-bold text-[#ffa44f]">3</p>
          </div>
        </div>

        {/* Tabla de hallazgos con fade */}
        <div className="relative">
          <div className="bg-[#1a1d27] rounded-lg border border-white/5 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5">
              <p className="text-[11px] text-[#8b8b8b] font-medium">Hallazgos principales</p>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[#6b6b6b] text-left">
                  <th className="px-4 py-2 font-medium">Prioridad</th>
                  <th className="px-4 py-2 font-medium">Hallazgo</th>
                  <th className="px-4 py-2 font-medium hidden sm:table-cell">Impacto</th>
                </tr>
              </thead>
              <tbody className="text-[#c8c8c8]">
                <tr className="border-t border-white/5">
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#ff4444] mr-2" />
                    <span className="text-[#ff6b6b] text-[11px] font-medium">Alta</span>
                  </td>
                  <td className="px-4 py-2.5">Reporte semanal depende de 1 persona</td>
                  <td className="px-4 py-2.5 text-[#6b6b6b] hidden sm:table-cell">8 hrs/sem</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#ff4444] mr-2" />
                    <span className="text-[#ff6b6b] text-[11px] font-medium">Alta</span>
                  </td>
                  <td className="px-4 py-2.5">Datos de ventas duplicados en 3 fuentes</td>
                  <td className="px-4 py-2.5 text-[#6b6b6b] hidden sm:table-cell">Decisiones con error</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#ffa44f] mr-2" />
                    <span className="text-[#ffa44f] text-[11px] font-medium">Media</span>
                  </td>
                  <td className="px-4 py-2.5">Costos cloud sin atribución por área</td>
                  <td className="px-4 py-2.5 text-[#6b6b6b] hidden sm:table-cell">Sin visibilidad</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Fade-out inferior */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0f1117] to-transparent rounded-b-lg pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
