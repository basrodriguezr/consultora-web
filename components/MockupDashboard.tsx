/**
 * Mockup de "antes / después" — muestra el cambio en UN proceso concreto,
 * no un score abstracto de madurez.
 *
 * Decisión (ago-2026): reemplazamos el tablero de "madurez 32/100" por el
 * antes/después de un reporte semanal armado a mano. Motivo: se entiende de
 * un vistazo, conecta con el pitch ("¿alguien armando reportes a mano?
 * yo hago que eso se haga solo") y es honesto — no finge datos de una empresa
 * específica. Referencia visual: linear.app, vercel.com.
 *
 * Usa la paleta terminal del sitio (--term-*) para combinar con el tema.
 * Mantiene fondo oscuro fijo para parecer un "screenshot de producto".
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
            ArqData · Reporte semanal de ventas
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
          Automatizado
        </span>
      </div>

      {/* Contenido: antes / después de un proceso concreto */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Encabezado de las dos columnas */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p
              className="text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5"
              style={{ color: "var(--term-subtle)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--term-error)" }}
              />
              Antes
            </p>
          </div>
          <div>
            <p
              className="text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5"
              style={{ color: "var(--term-subtle)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--term-brand-500)" }}
              />
              Después
            </p>
          </div>
        </div>

        {/* Filas de comparación */}
        {[
          { antes: "8 horas cada semana", despues: "Se genera solo" },
          { antes: "Depende de 1 persona", despues: "No depende de nadie" },
          { antes: "Se cae si ella falta", despues: "Corre aunque no estés" },
        ].map((fila) => (
          <div key={fila.antes} className="grid grid-cols-2 gap-3 sm:gap-4">
            <div
              className="rounded-lg p-3 font-mono text-[13px]"
              style={{
                background: "var(--term-panel)",
                border: "1px solid rgba(255,68,68,0.12)",
                color: "var(--term-fg)",
              }}
            >
              <span style={{ color: "var(--term-error)" }} className="mr-1.5">✕</span>
              {fila.antes}
            </div>
            <div
              className="rounded-lg p-3 font-mono text-[13px]"
              style={{
                background: "var(--term-panel)",
                border: "1px solid rgba(var(--term-luz),0.18)",
                color: "var(--term-fg)",
              }}
            >
              <span style={{ color: "var(--term-brand-500)" }} className="mr-1.5">✓</span>
              {fila.despues}
            </div>
          </div>
        ))}

        {/* Remate: costo de oportunidad en tiempo (concreto y verdadero) */}
        <div
          className="rounded-lg p-4 flex items-start gap-3"
          style={{
            background: "rgba(var(--term-luz),0.06)",
            border: "1px solid rgba(var(--term-luz),0.15)",
          }}
        >
          <span
            className="font-mono text-2xl font-bold shrink-0"
            style={{ color: "var(--term-brand-500)" }}
          >
            6 hrs
          </span>
          <p className="text-[13px] leading-snug" style={{ color: "var(--term-muted)" }}>
            a la semana que tu equipo deja de perder armando planillas a mano.
          </p>
        </div>
      </div>
    </div>
  );
}
