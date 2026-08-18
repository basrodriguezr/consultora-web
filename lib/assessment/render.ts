import "server-only";

import { servicios } from "@/content/servicios";
import { rangoLegible } from "@/lib/assessment/catalogo-interno";
import { calcularCifras, montoOPorConfirmar } from "@/lib/assessment/costos";
import type { SalidaAssessment } from "@/lib/assessment/esquema";
import { ETIQUETAS_HORAS } from "@/lib/leads";
import type { Calificacion, LeadAssessmentNormalizado } from "@/lib/leads";

/**
 * Arma el pre-diagnóstico en Markdown a partir de la salida validada del modelo.
 *
 * Es `server-only` porque importa `catalogo-interno`: el documento lleva los
 * rangos en CLP y esos no pueden terminar en un bundle del navegador.
 *
 * **El texto con peso comercial se escribe acá, literal.** El encabezado, los
 * rótulos de hipótesis y la marca de lo que falta averiguar no se le piden al
 * modelo: son casi contractuales y regenerarlos en cada request es invitarlos a
 * derivar. Lo que aporta el modelo son los contenidos; la forma es de este
 * archivo, y por eso el golden test la congela.
 */

/**
 * Encabezado literal, acordado con Daniela. **No es decoración:** encuadra qué
 * es este documento si alguna vez sale de su bandeja. Cambiarlo sin querer
 * altera el encuadre completo, así que el test lo compara carácter por carácter.
 */
const ENCABEZADO = "Pre-diagnóstico preliminar — pendiente de validación en discovery";

/** Lo que se imprime donde el modelo no pudo fundamentar nada. */
const POR_CONFIRMAR = "[por confirmar en discovery]";

/** Fecha del documento, en horario de Chile. */
function fechaDocumento(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeZone: "America/Santiago",
  }).format(fecha);
}

/** Nombre visible de un servicio del catálogo, desde su slug. */
function nombreServicio(slug: SalidaAssessment["servicioRecomendado"]): string {
  return servicios.find((s) => s.slug === slug)?.nombre ?? slug;
}

function plazoServicio(slug: SalidaAssessment["servicioRecomendado"]): string {
  return servicios.find((s) => s.slug === slug)?.plazo ?? "";
}

/** Fila de tabla Markdown con los valores ya escapados de pipes. */
function fila(celdas: string[]): string {
  return `| ${celdas.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
}

/** Texto o la marca de pendiente, nunca vacío. */
function oPorConfirmar(valor: string | null): string {
  return valor === null || valor.trim() === "" ? POR_CONFIRMAR : valor;
}

/**
 * Nivel de una dimensión de calidad. Sin nivel no se imprime un número: se
 * imprime la marca de pendiente, porque estas cosas se miden perfilando la base
 * y el formulario no alcanza para eso.
 */
function nivelDimension(nivel: number | null): string {
  return nivel === null ? POR_CONFIRMAR : `${nivel} / 4`;
}

export function renderPreDiagnostico(
  lead: LeadAssessmentNormalizado,
  salida: SalidaAssessment,
  calificacion: Calificacion,
): string {
  const cifras = calcularCifras(
    lead.horasSemanaProceso,
    salida.quickWins.map((q) => q.fraccionHorasLiberadas),
  );

  /*
   * ⚠️ El sufijo "h/semana" NO se puede pegar al valor crudo: con `"no-se"`
   * emitía `"no-se h/semana"`, texto roto en la primera página del documento
   * que lee Daniela. Los cuatro rangos numéricos sí toleraban el crudo, así que
   * el defecto solo aparecía en la respuesta del cliente ideal — el que no midió
   * cuánto le cuesta el proceso.
   *
   * `ETIQUETAS_HORAS` ya trae la unidad adentro ("Entre 5 y 15 horas"), así que
   * el sufijo desaparece y `"no-se"` se lee como lo que es: "No lo tengo
   * medido". Es una respuesta legítima, no un hueco, y `calificacion.ts` nunca
   * descalifica por ella.
   */
  const horasDeclaradas = lead.horasSemanaProceso
    ? ETIQUETAS_HORAS[lead.horasSemanaProceso]
    : POR_CONFIRMAR;

  /*
   * El sufijo "al año" solo tiene sentido si hay una cifra. Pegado a la marca
   * de pendiente produce "[por confirmar en discovery] al año", que se lee como
   * un error de armado en la primera página del documento.
   */
  const costoAnual =
    cifras.costoAnual === null
      ? POR_CONFIRMAR
      : `${montoOPorConfirmar(cifras.costoAnual)} al año`;

  const lineas: string[] = [
    ENCABEZADO,
    "",
    `**${lead.empresa}** · ${fechaDocumento(lead.recibidoEn)}`,
    "",
    "---",
    "",

    "## 1. Resumen",
    "",
    salida.resumen,
    "",
    // "estimada" y "hipótesis" en la misma línea: el número es lo primero que
    // se mira y lo más fácil de leer como si alguien lo hubiera medido.
    `**Madurez estimada:** ${salida.nivelMadurez} / 4 — hipótesis a partir del formulario, no una medición.`,
    `**Proceso declarado:** ${horasDeclaradas}`,
    `**Costo estimado del problema:** ${costoAnual}`,
    "",

    "## 2. Lo que se puede inferir hoy",
    "",
    "**Hipótesis a verificar:**",
    "",
    oPorConfirmar(salida.hipotesisCausaRaiz),
    "",
    "**Procesos manuales mencionados:**",
    "",
    ...salida.procesosManuales.map(
      (p) => `- **${p.proceso}** — ${p.impactoOperativo}`,
    ),
    "",
    "**Calidad de datos (preliminar):**",
    "",
    fila(["Dimensión", "Nivel", "En qué se apoya", "Impacto"]),
    fila(["---", "---", "---", "---"]),
    ...salida.dimensiones.map((d) =>
      fila([
        d.clave,
        nivelDimension(d.nivel),
        oPorConfirmar(d.evidencia),
        d.impacto,
      ]),
    ),
    "",

    "## 3. Riesgos operacionales",
    "",
    fila(["Riesgo", "Severidad", "Impacto si ocurre"]),
    fila(["---", "---", "---"]),
    ...salida.riesgos.map((r) => fila([r.titulo, r.severidad, r.impactoNegocio])),
    "",

    "## 4. Tres quick wins propuestos",
    "",
    fila(["Qué hacer", "Esfuerzo", "Impacto"]),
    fila(["---", "---", "---"]),
    ...salida.quickWins.map((q) => fila([q.accion, q.esfuerzo, q.impacto])),
    "",
    // El paquete se cotiza entero. No hay desglose por quick win: el catálogo
    // cotiza los tres juntos e inventar el desglose es inventar precios.
    `**Inversión del paquete:** ${rangoLegible("quick-win")} (${plazoServicio("quick-win")})`,
    `**Ahorro estimado año 1:** ${montoOPorConfirmar(cifras.ahorroAnual)}`,
    "",

    "## 5. Siguiente paso sugerido",
    "",
    `**${nombreServicio(salida.servicioRecomendado)}** — ${rangoLegible(
      salida.servicioRecomendado,
    )}, ${plazoServicio(salida.servicioRecomendado)}`,
    "",
    salida.justificacionServicio,
    "",

    "## 6. ★ Qué falta averiguar en discovery",
    "",
    ...salida.preguntasDiscovery.map((p) => `- ${p}`),
    "",

    "---",
    "",
    "_Lo que sigue es interno y no va al cliente._",
    "",

    "## 7. Señales de alerta",
    "",
    ...(salida.senalesDeAlerta.length > 0
      ? salida.senalesDeAlerta.map((s) => `- ${s}`)
      : ["- Ninguna detectada."]),
    "",

    "## 8. Calificación del lead",
    "",
    `**${calificacion}**`,
    "",
    ...motivosCalificacion(lead),
  ];

  return lineas.join("\n");
}

/**
 * Las señales que explican la calificación, en texto.
 *
 * Se listan **siempre**, no solo cuando descalifican: leer *"presupuesto
 * asignado, urgencia alta"* debajo de un `a-evaluar` le dice a Daniela por qué
 * el sistema lo dejó pasar. Un veredicto sin sus insumos no se puede auditar,
 * y desde que la calificación suprime cosas hay que poder auditarla.
 */
function motivosCalificacion(lead: LeadAssessmentNormalizado): string[] {
  return [
    `- Presupuesto: ${lead.presupuesto}`,
    `- Urgencia: ${lead.urgencia}`,
    `- Personas trabajando con datos: ${lead.personasConDatos}`,
    `- Horas/semana declaradas: ${lead.horasSemanaProceso ?? "no respondido"} (no participa de la regla)`,
  ];
}
