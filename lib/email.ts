import { Resend } from "resend";

import { site } from "@/content/site";
import { envCon } from "@/lib/env";
import {
  ETIQUETAS_CLOUD,
  ETIQUETAS_EQUIPO,
  ETIQUETAS_EVALUANDO_CAMBIO,
  ETIQUETAS_HORAS,
  ETIQUETAS_PRESUPUESTO,
  ETIQUETAS_URGENCIA,
  esCorreoPersonal,
  etiquetaDesafio,
  etiquetaFuenteDatos,
  etiquetaRol,
  type Calificacion,
  type Lead,
  type LeadAssessmentNormalizado,
  type LeadContactoNormalizado,
} from "@/lib/leads";

/**
 * Notificación por email de un lead nuevo, vía Resend.
 *
 * El cliente de Resend se instancia *dentro* de `enviarEmailLead`, nunca en el
 * top-level: si `RESEND_API_KEY` no está configurada (build de preview, clone
 * recién bajado, CI sin secretos), importar este módulo no debe explotar. La
 * ausencia de la key se reporta como un resultado de error explícito y el route
 * la traduce a un mensaje útil para la persona que escribió.
 */

/** Motivo del fallo. `sin-configurar` es problema nuestro, no del usuario. */
export type MotivoFallo = "sin-configurar" | "proveedor";

export type ResultadoEnvio =
  | { ok: true; id: string | null }
  | { ok: false; motivo: MotivoFallo; detalle: string };

/** Remitente verificado en Resend. Sin dominio propio, el sandbox de Resend. */
const REMITENTE_POR_DEFECTO = "onboarding@resend.dev";

/** Escapa los caracteres que romperían (o inyectarían) HTML en el email. */
function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Fecha legible en horario de Chile; si el ISO viniera raro, cae al crudo. */
function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(fecha);
}

/**
 * Segunda barrera contra inyección de headers: el esquema ya rechaza saltos de
 * línea, pero el asunto se arma acá y esta función es exportada — no queremos
 * que dependa de que quien la llame haya validado antes.
 */
function unaSolaLinea(valor: string): string {
  return valor.replace(/[\r\n\x00]+/g, " ").trim();
}

/**
 * Email del lead, anotado si viene de un dominio de correo gratuito.
 *
 * Es **solo informativo**: sirve para priorizar la respuesta, no para descartar
 * a nadie. El formulario no bloquea estos dominios a propósito (el correo de la
 * propia consultora es uno) — la nota vive únicamente acá y en la sugerencia en
 * gris del formulario.
 */
function emailAnotado(lead: Lead): string {
  return esCorreoPersonal(lead.email)
    ? `${lead.email} (correo personal)`
    : lead.email;
}

/** Un dato del lead: etiqueta visible y valor ya legible. */
type Fila = [string, string];

/** Valor de un campo opcional, o la marca de que no se respondió. */
function opcional(valor: string | undefined): string {
  return valor && valor.trim() !== "" ? valor : "[no respondido]";
}

/**
 * Filas del lead de contacto. `rol` y `desafio` viajan como slug pero se
 * muestran con su etiqueta: nadie debería tener que traducir `gerente-ti`
 * mentalmente al leer la bandeja.
 */
function filasContacto(lead: LeadContactoNormalizado): Fila[] {
  return [
    ["Nombre", lead.nombre],
    ["Email", emailAnotado(lead)],
    ["Rol", etiquetaRol(lead.rol)],
    ["Desafío", etiquetaDesafio(lead.desafio)],
  ];
}

/**
 * Filas del lead de assessment.
 *
 * El orden no es el del formulario: primero lo que permite decidir si esta
 * conversación va a alguna parte (empresa, presupuesto, urgencia, equipo) y
 * después el material largo. Daniela lee esto en el celular antes de una
 * discovery, no como un registro de base de datos.
 */
function filasAssessment(lead: LeadAssessmentNormalizado): Fila[] {
  return [
    ["Nombre", lead.nombre],
    ["Email", emailAnotado(lead)],
    ["Empresa", lead.empresa],
    ["Presupuesto", ETIQUETAS_PRESUPUESTO[lead.presupuesto]],
    ["Urgencia", ETIQUETAS_URGENCIA[lead.urgencia]],
    ["Equipo de datos", ETIQUETAS_EQUIPO[lead.equipoDatos]],
    ["Personas con datos", String(lead.personasConDatos)],
    ["Cloud", ETIQUETAS_CLOUD[lead.cloud]],
    ["Fuentes de datos", lead.fuentesDatos.map(etiquetaFuenteDatos).join(", ")],
    // Se sacó el sufijo "(declarado)" que acompañaba al rango crudo. Estaba ahí
    // para que `"5-15"` —un token de datos— no se leyera como una medición
    // nuestra; con la etiqueta el valor ya es prosa en la voz de quien respondió
    // ("Entre 5 y 15 horas"), que se lee como respuesta y no como métrica.
    // Sobre `"no-se"` el sufijo además se contradecía: "No lo tengo medido
    // (declarado)". Y ninguna otra fila del email lleva caveat siendo todas
    // igual de declaradas. Donde el número sí se convierte en plata
    // (`lib/assessment/costos.ts` → pre-diagnóstico) el documento ya avisa por
    // su cuenta: encabezado "preliminar" y la madurez marcada como hipótesis.
    [
      "Horas/semana del proceso",
      lead.horasSemanaProceso
        ? ETIQUETAS_HORAS[lead.horasSemanaProceso]
        : "[no respondido]",
    ],
    ["Sponsor", opcional(lead.sponsor)],
    [
      "¿Evalúa cambiar de sistema?",
      lead.evaluandoCambio
        ? ETIQUETAS_EVALUANDO_CAMBIO[lead.evaluandoCambio]
        : "[no respondido]",
    ],
    ["Sistemas actuales", opcional(lead.sistemasActuales)],
    ["Problema principal", lead.problemaPrincipal],
    ["Cómo lo resuelven hoy", lead.solucionActual],
  ];
}

/** Sufijo del asunto que permite triar desde la lista, sin abrir el email. */
function marcaCalificacion(calificacion: Calificacion | undefined): string {
  return calificacion === "probablemente-no"
    ? " — ⚠️ probablemente no califica"
    : "";
}

/** Email listo para enviar: lo que cambia entre un tipo de lead y otro. */
export interface PlantillaEmail {
  asunto: string;
  texto: string;
  html: string;
}

/**
 * Arma el email del lead. **Es el único `switch` sobre `tipo` de este módulo.**
 *
 * La alternativa —un `switch` dentro de `asuntoLead`, otro dentro de
 * `cuerpoTextoLead` y otro dentro de `cuerpoHtmlLead`— serían tres lugares
 * donde olvidarse de una variante, y dos de ellos fallarían en silencio
 * (un email con menos filas no rompe nada, solo pierde datos). Acá lo que
 * cambia por tipo son **las filas y el asunto**; el armado es común.
 *
 * `calificacion` solo aplica a los leads de assessment: es lo que le pone la
 * marca al asunto (§8 del plan de Fase 2). No es un campo del lead porque no
 * viene del formulario, se calcula; y no lo calcula este módulo porque es
 * criterio comercial, no de presentación.
 */
export function plantillaLead(
  lead: Lead,
  calificacion?: Calificacion,
): PlantillaEmail {
  switch (lead.tipo) {
    case "contacto": {
      const filas = filasContacto(lead);
      return {
        asunto: unaSolaLinea(
          `Nuevo lead: ${lead.nombre} — ${etiquetaDesafio(lead.desafio)}`,
        ),
        texto: cuerpoTexto(`Nuevo lead desde el formulario de ${site.nombre}`, lead, filas),
        html: cuerpoHtml(`Nuevo lead desde el formulario de ${site.nombre}`, lead, filas),
      };
    }
    case "assessment": {
      const filas = filasAssessment(lead);
      const titulo = `Assessment: ${lead.nombre} (${lead.empresa})`;
      return {
        asunto: unaSolaLinea(`${titulo}${marcaCalificacion(calificacion)}`),
        texto: cuerpoTexto(titulo, lead, filas),
        html: cuerpoHtml(titulo, lead, filas),
      };
    }
    default: {
      const noManejado: never = lead;
      throw new Error(
        `Tipo de lead no manejado en plantillaLead: ${JSON.stringify(noManejado)}`,
      );
    }
  }
}

/** Cuerpo en texto plano: título, filas alineadas y la hora de recepción. */
function cuerpoTexto(titulo: string, lead: Lead, filas: Fila[]): string {
  const todas: Fila[] = [
    ...filas,
    ["Recibido", `${fechaLegible(lead.recibidoEn)} (${lead.recibidoEn})`],
  ];
  const ancho = Math.max(...todas.map(([etiqueta]) => etiqueta.length));

  return [
    titulo,
    "",
    ...todas.map(([etiqueta, valor]) => `${`${etiqueta}:`.padEnd(ancho + 2)}${valor}`),
    "",
    "—",
    "Responde directo a este email: el remitente del lead está en Reply-To.",
  ].join("\n");
}

/** Cuerpo HTML equivalente. Todo dato del lead va escapado. */
function cuerpoHtml(titulo: string, lead: Lead, filas: Fila[]): string {
  const todas: Fila[] = [
    ...filas,
    ["Recibido", `${fechaLegible(lead.recibidoEn)} (${lead.recibidoEn})`],
  ];

  const celdas = todas
    .map(
      ([etiqueta, valor]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#71717a;vertical-align:top;">${escaparHtml(
          etiqueta,
        )}</td><td style="padding:4px 0;white-space:pre-wrap;">${escaparHtml(
          valor,
        )}</td></tr>`,
    )
    .join("");

  return [
    `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b;">`,
    `<h2 style="font-size:16px;margin:0 0 16px;">${escaparHtml(titulo)}</h2>`,
    `<table style="border-collapse:collapse;margin-bottom:16px;">${celdas}</table>`,
    `<p style="margin:16px 0 0;color:#71717a;font-size:12px;">Responde directo a este email: el remitente del lead está en Reply-To.</p>`,
    `</div>`,
  ].join("");
}

/** Un mensaje listo para el transporte, ya sin nada que decidir. */
interface Mensaje {
  to: string;
  replyTo: string;
  asunto: string;
  texto: string;
  /** Opcional: el pre-diagnóstico viaja **solo** en texto plano (ver abajo). */
  html?: string;
}

/**
 * El único punto de este módulo que habla con Resend.
 *
 * Existe desde que hay dos emails (§11: #1 con las respuestas crudas, #2 con el
 * pre-diagnóstico). Duplicar acá la lectura de la key, la construcción del
 * cliente y los dos `catch` serían dos lugares donde el manejo de errores puede
 * derivar — y el de un envío que nadie está esperando (el #2 corre dentro de
 * `after()`) es justamente el que nadie mira hasta que falla.
 *
 * Nunca lanza: todo error vuelve como `{ ok: false }` y quien llama decide si
 * eso se traduce a HTTP o a una línea de log.
 */
async function enviar(mensaje: Mensaje): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      motivo: "sin-configurar",
      detalle: "RESEND_API_KEY no está definida en el entorno.",
    };
  }

  // `envCon` trata la variable vacía como ausente: definir `CONTACTO_FROM=""`
  // en el panel de Vercel produciría un envío inválido y un 502 sin causa
  // visible.
  const from = envCon(process.env.CONTACTO_FROM, REMITENTE_POR_DEFECTO);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: mensaje.to,
      replyTo: mensaje.replyTo,
      subject: mensaje.asunto,
      text: mensaje.texto,
      // `html` se omite del payload cuando no hay: mandar `html: undefined`
      // deja que el SDK lo serialice como clave presente y vacía.
      ...(mensaje.html === undefined ? {} : { html: mensaje.html }),
    });

    if (error) {
      return {
        ok: false,
        motivo: "proveedor",
        detalle: `${error.name}: ${error.message}`,
      };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    return {
      ok: false,
      motivo: "proveedor",
      detalle: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Casilla que recibe los leads. Vacía o ausente cae al email público. */
function destinoLead(): string {
  return envCon(process.env.CONTACTO_TO, site.email);
}

/**
 * Envía la notificación del lead (**EMAIL #1**). Nunca lanza: todo error se
 * devuelve como `{ ok: false }` para que el route decida qué contarle al
 * usuario.
 */
export async function enviarEmailLead(
  lead: Lead,
  calificacion?: Calificacion,
): Promise<ResultadoEnvio> {
  const plantilla = plantillaLead(lead, calificacion);

  return enviar({
    to: destinoLead(),
    replyTo: lead.email,
    asunto: plantilla.asunto,
    texto: plantilla.texto,
    html: plantilla.html,
  });
}

/**
 * Asunto del EMAIL #2. Exportado para poder testearlo sin tocar la red.
 *
 * `unaSolaLinea` es la segunda barrera contra inyección de headers SMTP:
 * `nombre` y `empresa` vienen del formulario y un `\r\n` en el asunto es el
 * vector clásico (Resend pasa el `subject` tal cual a la API, no sanitiza nada).
 * Que el esquema zod ya los rechace no alcanza — esta función es exportada y no
 * debe depender de que quien la llame haya validado antes.
 *
 * "Pre-diagnóstico" va adelante y no al final: en el celular el asunto se corta,
 * y lo que tiene que distinguirse del EMAIL #1 ("Assessment: …") es justamente
 * qué documento es.
 */
export function asuntoPreDiagnostico(lead: LeadAssessmentNormalizado): string {
  return unaSolaLinea(`Pre-diagnóstico: ${lead.nombre} (${lead.empresa})`);
}

/**
 * Envía el pre-diagnóstico ya renderizado (**EMAIL #2**, §11).
 *
 * **Va en texto plano, sin versión HTML, y es una decisión de uso, no una
 * simplificación.** El documento es Markdown y su destino es que Daniela lo
 * copie dentro del `assessment_template.md` v2 para completarlo: envuelto en
 * HTML habría que escaparlo, se pegaría con etiquetas y perdería la estructura
 * que lo hace utilizable. Texto plano preserva el documento tal cual y elimina
 * de raíz la clase entera de bugs de escapado — no hay nada del lead que se
 * interpole en markup.
 *
 * `Reply-To` es el correo de quien completó el formulario, igual que en el #1:
 * los dos correos quedan respondibles desde la bandeja sin copiar direcciones.
 *
 * Nunca lanza. Quien la llama es el `after()` del route, que ya respondió 200 y
 * lo único que puede hacer con el fallo es loguearlo.
 */
export async function enviarPreDiagnostico(
  lead: LeadAssessmentNormalizado,
  documento: string,
): Promise<ResultadoEnvio> {
  return enviar({
    /*
     * `ASSESSMENT_TO` vacío cae a la misma casilla del EMAIL #1 — que es lo
     * que Daniela eligió (§19 #6: `contacto@arqdata.cl`, con la variable sin
     * setear). Existe para poder derivar los pre-diagnósticos a otra bandeja
     * sin tocar código ni mover los leads crudos.
     */
    to: envCon(process.env.ASSESSMENT_TO, destinoLead()),
    replyTo: lead.email,
    asunto: asuntoPreDiagnostico(lead),
    texto: documento,
  });
}
