import "server-only";

import {
  FUERA_DE_ALCANCE_BASE,
  GARANTIA,
  NOTA_INFRAESTRUCTURA,
  PROXIMOS_PASOS,
  SUPUESTOS_BASE,
  VALIDEZ_DIAS,
} from "@/content/propuesta";
import { servicios } from "@/content/servicios";
import { site } from "@/content/site";
import type { EntradaPropuestaNormalizada } from "@/lib/propuesta/entrada";
import type { SalidaPropuesta } from "@/lib/propuesta/esquema";
import { calcularInversion, pesosLegibles } from "@/lib/propuesta/precios";

/**
 * Arma la propuesta comercial en Markdown a partir de la salida validada.
 *
 * `server-only` porque llega a `catalogo-interno` a través de `precios.ts`.
 *
 * **La forma es de este archivo y el golden test la congela.** Lo que aporta el
 * modelo son los contenidos; el encabezado de borrador, los rótulos, la garantía
 * y la estructura de la oferta se escriben acá, literales, porque son casi
 * contractuales y regenerarlos en cada request es invitarlos a derivar.
 */

/**
 * 🛑 **El encabezado de borrador, y la razón por la que el documento NO se firma.**
 *
 * ADR-005 decidió que los borradores del agente salen sin firma: *"la firma es
 * el acto de aprobación"*, y un documento firmado que Daniela no leyó es un
 * compromiso comercial que nadie revisó. Esa ADR se escribió para el
 * pre-diagnóstico, que es **interno**. Acá el documento va al cliente y contiene
 * precios, hitos de pago y una garantía: el mismo argumento, con más en juego.
 *
 * Daniela borra estas dos líneas y agrega su firma cuando aprueba. Es un paso de
 * 30 segundos que funciona como checkpoint de calidad.
 *
 * El test lo compara carácter por carácter: cambiarlo sin querer altera el
 * encuadre completo del documento.
 */
const ENCABEZADO_BORRADOR = "BORRADOR — pendiente de revisión y firma";

/** Lo que se imprime donde las notas no alcanzaron. Nunca se rellena. */
function falta(que: string): string {
  return `[FALTA: ${que}]`;
}

/**
 * El pendiente de infraestructura, escrito una sola vez.
 *
 * Aparece en dos lugares —inline en el §6 y en la lista interna del final— y
 * tienen que decir exactamente lo mismo: dos redacciones del mismo pendiente se
 * leen como dos pendientes distintos, y el que revisa termina buscando un dato
 * que ya tenía.
 */
const FALTA_INFRAESTRUCTURA =
  "estimar el costo mensual de infraestructura una vez cerrada la arquitectura";

/** Fecha larga en horario de Chile. */
function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeZone: "America/Santiago",
  }).format(fecha);
}

/** La fecha hasta la que la oferta se sostiene. */
function fechaVencimiento(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  fecha.setUTCDate(fecha.getUTCDate() + VALIDEZ_DIAS);
  return fechaLegible(fecha.toISOString());
}

/** Fila de tabla Markdown con los pipes de los valores escapados. */
function fila(celdas: string[]): string {
  return `| ${celdas.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
}

/** Nombre visible de un servicio del catálogo, desde su slug. */
function nombreServicio(slug: SalidaPropuesta["inversion"]["servicio"]): string {
  return servicios.find((s) => s.slug === slug)?.nombre ?? slug;
}

/** `Semana 3` o `Semanas 3-6`, según corresponda. */
function rangoSemanas(inicio: number, fin: number): string {
  return inicio === fin ? `Semana ${inicio}` : `Semanas ${inicio}-${fin}`;
}

export function renderPropuesta(
  entrada: EntradaPropuestaNormalizada,
  salida: SalidaPropuesta,
): string {
  /*
   * El timeline y la forma de pago se derivan del alcance, no se generan
   * aparte: es lo que hace imposible que la tabla de entregables diga "semana 8"
   * y el timeline "6 semanas" en el mismo documento. Ver `esquema.ts`.
   */
  const semanaEntrega = Math.max(
    ...salida.alcance.incluido.map((e) => e.semanaFin),
  );

  const inversion = calcularInversion(
    salida.inversion.servicio,
    salida.inversion.posicion,
    semanaEntrega,
  );

  const dedicacionTotal = salida.equipo.reduce(
    (total, i) => total + i.dedicacionHorasSemana,
    0,
  );

  const lineas: string[] = [
    ENCABEZADO_BORRADOR,
    "",
    "# Propuesta de Servicios Profesionales",
    "",
    `**Para**: ${entrada.empresa}`,
    `**De**: ${site.nombre} — Consultoría de Arquitectura de Datos`,
    `**Fecha**: ${fechaLegible(entrada.preparadaEn)}`,
    `**Validez**: ${VALIDEZ_DIAS} días (hasta el ${fechaVencimiento(entrada.preparadaEn)})`,
    "",
    "---",
    "",

    "## 1. Contexto",
    "",
    salida.contexto.necesidad,
    "",
    salida.contexto.situacionActual,
    "",

    "## 2. Solución Propuesta",
    "",
    salida.solucion.descripcion,
    "",
    // El diagrama lo dibuja el código a partir de las etapas (ver `esquema.ts`):
    // el modelo nunca emite ASCII art, así que el bloque sale idéntico siempre.
    "```",
    salida.solucion.flujo.map((e) => e.nombre).join("  →  "),
    "```",
    "",
    ...salida.solucion.flujo.map((e) => `- **${e.nombre}** — ${e.detalle}`),
    "",
    "### Componentes principales",
    "",
    fila(["Componente", "Tecnología", "Función"]),
    fila(["---", "---", "---"]),
    ...salida.solucion.componentes.map((c) =>
      fila([c.componente, c.tecnologia, c.funcion]),
    ),
    "",

    "## 3. Alcance",
    "",
    "### Incluido",
    "",
    fila(["#", "Entregable", "Descripción", "Semana"]),
    fila(["---", "---", "---", "---"]),
    ...salida.alcance.incluido.map((e, i) =>
      fila([
        String(i + 1),
        e.entregable,
        e.descripcion,
        e.semanaInicio === e.semanaFin
          ? String(e.semanaInicio)
          : `${e.semanaInicio}-${e.semanaFin}`,
      ]),
    ),
    "",
    "### Fuera de alcance",
    "",
    ...salida.alcance.fueraDeAlcance.map((f) => `- ${f}`),
    ...FUERA_DE_ALCANCE_BASE.map((f) => `- ${f}`),
    "",

    "## 4. Timeline",
    "",
    "```",
    ...salida.alcance.incluido.map(
      (e) => `${rangoSemanas(e.semanaInicio, e.semanaFin)}: ${e.entregable}`,
    ),
    "```",
    "",
    `**Duración total**: ${semanaEntrega} semanas`,
    `**Dedicación**: ${dedicacionTotal} horas/semana`,
    // Un plazo del cliente que no aparece en las notas es `null`, y entonces no
    // se imprime la línea. Inventar una fecha límite en una oferta es peor que
    // no tenerla: fija un compromiso que nadie acordó.
    ...(salida.plazoLimiteCliente
      ? [`**Plazo indicado por el cliente**: ${salida.plazoLimiteCliente}`]
      : []),
    "",

    "## 5. Equipo",
    "",
    fila(["Rol", "Dedicación"]),
    fila(["---", "---"]),
    ...salida.equipo.map((i) =>
      fila([i.rol, `${i.dedicacionHorasSemana}h/semana`]),
    ),
    "",

    "## 6. Inversión",
    "",
    `**Servicio**: ${nombreServicio(inversion.servicio)}`,
    "",
    fila(["Concepto", "Monto (CLP neto)"]),
    fila(["---", "---"]),
    fila(["Implementación completa", pesosLegibles(inversion.netoCLP)]),
    fila(["**Total**", `**${pesosLegibles(inversion.netoCLP)} + IVA**`]),
    "",
    `IVA (19%): ${pesosLegibles(inversion.ivaCLP)} · Total con IVA: ${pesosLegibles(
      inversion.totalConIvaCLP,
    )}`,
    "",
    "### Forma de pago",
    "",
    fila(["Hito", "%", "Monto", "Cuándo"]),
    fila(["---", "---", "---", "---"]),
    ...inversion.hitos.map((h) =>
      fila([h.concepto, `${h.porcentaje}%`, pesosLegibles(h.montoCLP), h.cuando]),
    ),
    "",
    "### Costos de infraestructura (separados)",
    "",
    NOTA_INFRAESTRUCTURA,
    `Costo mensual estimado: ${falta(FALTA_INFRAESTRUCTURA)}`,
    "",

    "## 7. Supuestos",
    "",
    ...salida.supuestos.map((s) => `- ${s}`),
    ...SUPUESTOS_BASE.map((s) => `- ${s}`),
    "",

    "## 8. Garantía",
    "",
    ...GARANTIA.map((g) => `- ${g}`),
    "",

    "## 9. Próximos pasos",
    "",
    ...PROXIMOS_PASOS.map((p, i) => `${i + 1}. ${p}`),
    "",
    "---",
    "",
    `**${site.nombre}** — Consultoría de Arquitectura de Datos`,
    `${site.email}`,
    "",
    /*
     * 🛑 Acá NO va la firma, y la línea que sigue existe para que la ausencia se
     * lea como una instrucción y no como un olvido. Sin ella, el hueco al final
     * del documento invita a mandarlo tal cual.
     */
    // ⚠️ Sin la referencia a la ADR: esta línea está en la parte del documento
    // que ve el cliente si Daniela olvida borrarla, y "(ADR-005)" es jerga
    // interna filtrada dentro de una oferta comercial. El porqué vive en el
    // comentario de `ENCABEZADO_BORRADOR`, que es donde lo busca quien mantiene
    // el código; el documento solo necesita decir qué falta hacer.
    `_Firma pendiente — agregar "Daniela Chávez — Data Architect" al aprobar._`,
    "",

    "---",
    "",
    "_Lo que sigue es interno y se borra antes de enviar._",
    "",

    "## Qué falta confirmar antes de enviar",
    "",
    /*
     * ⚠️ Sin línea en blanco entre los faltantes del modelo y el de
     * infraestructura: una lista Markdown partida por un `""` se renderiza como
     * DOS listas, y el último ítem queda visualmente suelto — justo el que hay
     * que completar sí o sí antes de enviar. El golden lo mostró; ningún assert
     * lo habría visto.
     *
     * El texto es el mismo que el marcador inline del §6, a propósito: dos
     * redacciones distintas del mismo pendiente se leen como dos pendientes.
     */
    ...(salida.faltantes.length > 0
      ? salida.faltantes.map((f) => `- ${falta(f)}`)
      : []),
    `- ${falta(FALTA_INFRAESTRUCTURA)} (§6)`,
    "",

    "## Cómo se cotizó",
    "",
    `- Servicio del catálogo: **${nombreServicio(inversion.servicio)}**`,
    `- Posición en el rango: **${inversion.posicion}** → ${pesosLegibles(inversion.netoCLP)}`,
    /*
     * 🛑 El presupuesto declarado va PEGADO a la posición y al monto, no al final
     * de la sección: el punto de la línea es que se lea la brecha de un vistazo.
     * Sin esto, la calibración del 2026-09-04 produjo una propuesta de $35M para
     * un cliente que declaró 10-20M, y el documento no lo mencionaba en ninguna
     * parte (ver `esquema.ts`, `presupuestoDeclarado`).
     *
     * No baja el precio y no es una advertencia automática: quien decide es
     * Daniela, y el ajuste lo hace por alcance. Decisión suya, 2026-09-04.
     */
    ...(salida.inversion.presupuestoDeclarado
      ? [`- **El cliente declaró: ${salida.inversion.presupuestoDeclarado}**`]
      : []),
    `- ${salida.inversion.justificacion}`,
    ...(entrada.preDiagnostico
      ? ["- Se usó el pre-diagnóstico de la Fase 2 como contexto adicional."]
      : []),
  ];

  return lineas.join("\n");
}
