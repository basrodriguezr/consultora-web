import { z } from "zod";

/**
 * Contrato de leads — fuente de verdad única de validación (cliente y servidor).
 *
 * Diseñado para que la Fase 2 (agente de assessment) se cuelgue sin rediseñar
 * nada: `tipo` es el discriminante. Hoy solo existe `"contacto"`; la Fase 2
 * agrega `leadAssessmentSchema` como segunda variante de `leadSchema` y una
 * segunda rama en `normalizarLead()`. El endpoint no se toca.
 *
 * El formulario de la landing es un **micro-cualificador de 4 campos**: su
 * trabajo es que alguien agende, no levantar requisitos. El formulario largo
 * (texto libre que alimenta el prompt del agente) es el de `/assessment`, y es
 * otro formulario con otro esquema — no una versión extendida de este.
 */

/**
 * Los mensajes que este esquema no define explícitamente los genera zod, y por
 * defecto salen en inglés. La UI es toda en español, así que se cambia el
 * locale global una sola vez, acá, que es el módulo que ambos lados importan.
 */
z.config(z.locales.es());

/**
 * Sin saltos de línea ni nulos. `nombre` termina en el asunto del email: un
 * `\r\n` ahí es un intento de inyección de headers SMTP. `.trim()` solo limpia
 * los bordes, así que el corte tiene que ser explícito.
 */
const SIN_CARACTERES_DE_CONTROL = /^[^\r\n\x00]*$/;

/**
 * Rol de quien consulta. Es un enum y no texto libre a propósito: cada campo
 * cerrado es una superficie menos de abuso y un dato más fácil de leer de un
 * vistazo en la bandeja.
 *
 * El `value` es el dato que viaja; el `label` es lo que se ve. Los dos viven
 * acá para que el formulario y el email muestren exactamente lo mismo — si el
 * label viviera en el componente, el email diría `gerente-ti` y nadie lo
 * arreglaría hasta que Daniela preguntara qué significa.
 */
export const ROLES = [
  { value: "cto", label: "CTO" },
  { value: "gerente-ti", label: "Gerente de TI" },
  { value: "data-lead", label: "Data Lead" },
  { value: "arquitecto", label: "Arquitecto" },
  { value: "finops", label: "FinOps" },
  { value: "otro", label: "Otro" },
] as const;

export type RolLead = (typeof ROLES)[number]["value"];

/** Los cuatro dolores de la sección "¿Te suena?", en el mismo orden. */
export const DESAFIOS = [
  {
    value: "costos-cloud",
    label: "Costos cloud creciendo sin visibilidad",
  },
  {
    value: "reportes-manuales",
    label: "Reportes manuales que toman horas",
  },
  {
    value: "dependencia-persona",
    label: "Procesos críticos que dependen de una persona",
  },
  {
    value: "modernizar-arquitectura",
    label: "Necesidad de modernizar la arquitectura de datos",
  },
] as const;

export type DesafioLead = (typeof DESAFIOS)[number]["value"];

/** Devuelve el texto visible de un valor del enum. Lo usan la UI y el email. */
export function etiquetaRol(valor: RolLead): string {
  return ROLES.find((r) => r.value === valor)?.label ?? valor;
}

export function etiquetaDesafio(valor: DesafioLead): string {
  return DESAFIOS.find((d) => d.value === valor)?.label ?? valor;
}

const valoresRoles = ROLES.map((r) => r.value) as [RolLead, ...RolLead[]];
const valoresDesafios = DESAFIOS.map((d) => d.value) as [
  DesafioLead,
  ...DesafioLead[],
];

/**
 * De dónde salen los datos de la empresa. Enum y no texto libre: cada campo
 * cerrado es una superficie menos de inyección y un token menos de contexto
 * cuando esto entre al prompt del agente.
 */
export const FUENTES_DATOS = [
  { value: "erp", label: "ERP" },
  { value: "crm", label: "CRM" },
  { value: "planillas-excel", label: "Planillas Excel" },
  { value: "bases-sql", label: "Bases SQL" },
  { value: "apis-externas", label: "APIs externas" },
  { value: "archivos-planos", label: "Archivos planos (CSV, TXT)" },
  { value: "sistemas-legacy", label: "Sistemas legacy" },
  { value: "otro", label: "Otro" },
] as const;

export type FuenteDatos = (typeof FUENTES_DATOS)[number]["value"];

/**
 * Horas semanales que consume el proceso manual que la persona eligió nombrar.
 *
 * **`"no-se"` es una respuesta de primera clase, no un hueco.** Quien no midió
 * cuánto le cuesta un proceso no tiene un problema chico: tiene falta de
 * visibilidad, que es exactamente lo que vende la consultora. Por eso el campo
 * lo admite y por eso `calificacion.ts` nunca descalifica por él.
 */
export const HORAS_SEMANA = ["<5", "5-15", "15-40", ">40", "no-se"] as const;

export type RangoHoras = (typeof HORAS_SEMANA)[number];

/**
 * Triage comercial del lead de assessment.
 *
 * El **tipo** vive acá porque es parte del contrato de lead; la **regla** que lo
 * calcula vive en `lib/assessment/calificacion.ts`. Separarlos es lo que evita
 * que `lib/email.ts` —que necesita el valor para el asunto— termine importando
 * de `lib/assessment/`, invirtiendo las capas.
 */
export type Calificacion = "calificado" | "a-evaluar" | "probablemente-no";

/** Etiquetas legibles de los enums cortos. Las usan el formulario y el email. */
export const ETIQUETAS_EQUIPO: Record<"si" | "no" | "parcial", string> = {
  si: "Sí, hay equipo de datos",
  no: "No hay equipo de datos",
  parcial: "Parcial (alguien lo hace además de su rol)",
};

export const ETIQUETAS_CLOUD: Record<
  "aws" | "azure" | "gcp" | "otro" | "ninguno",
  string
> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "Google Cloud",
  otro: "Otro proveedor",
  ninguno: "Sin cloud",
};

export const ETIQUETAS_PRESUPUESTO: Record<
  "asignado" | "en-evaluacion" | "sin-presupuesto",
  string
> = {
  asignado: "Asignado",
  "en-evaluacion": "En evaluación",
  "sin-presupuesto": "Sin presupuesto todavía",
};

export const ETIQUETAS_URGENCIA: Record<"alta" | "media" | "baja", string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const ETIQUETAS_EVALUANDO_CAMBIO: Record<
  "si" | "no" | "todavia-no",
  string
> = {
  si: "Sí, evaluando cambiar de sistema",
  no: "No, se queda con el actual",
  "todavia-no": "Todavía no lo evalúan",
};

/** Devuelve el texto visible de una fuente de datos. */
export function etiquetaFuenteDatos(valor: FuenteDatos): string {
  return FUENTES_DATOS.find((f) => f.value === valor)?.label ?? valor;
}

/** Campos comunes a cualquier lead, sea de contacto o de assessment. */
const leadBaseFields = {
  nombre: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre.")
    .max(80, "El nombre es demasiado largo.")
    .regex(SIN_CARACTERES_DE_CONTROL, "El nombre tiene caracteres no válidos."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresa un email válido.")),
};

/** Trampa anti-spam: campo oculto para humanos, visible para bots. */
export const honeypotField = "website" as const;

/**
 * El honeypot se acepta con cualquier valor **a propósito**: quien lo juzga es
 * el endpoint, no este esquema.
 *
 * Si el esquema lo rechazara, la validación del cliente cortaría el envío antes
 * de llegar al servidor. Un gestor de contraseñas o una extensión de autofill
 * puede rellenar un campo llamado `website` aunque esté oculto y tenga
 * `autocomplete="off"`; en ese caso la persona apretaría "Enviar" y no pasaría
 * nada, sin mensaje ni forma de darse cuenta. Se perdería el lead en silencio.
 */
const honeypotSchema = z.unknown().optional();

/**
 * Lead del formulario de la landing. Cuatro campos, todos obligatorios.
 *
 * `tipo` NO lleva `.default()`: un discriminante con default dentro de una
 * `z.discriminatedUnion` es terreno resbaloso, y la Fase 2 convierte esto en
 * unión. Se saca ahora, con una sola variante, para que la fase siguiente no
 * herede el problema. A cambio, **los formularios tienen que mandar `tipo`
 * explícito en sus `defaultValues`**.
 */
export const leadContactoSchema = z.object({
  tipo: z.literal("contacto"),
  ...leadBaseFields,
  rol: z.enum(valoresRoles, { message: "Selecciona tu rol." }),
  desafio: z.enum(valoresDesafios, { message: "Selecciona tu principal desafío." }),
  [honeypotField]: honeypotSchema,
});

const valoresFuentes = FUENTES_DATOS.map((f) => f.value) as [
  FuenteDatos,
  ...FuenteDatos[],
];

/**
 * Lead del formulario largo de `/assessment` — el que alimenta el prompt del
 * agente. **No es una versión extendida del de contacto**: comparten `nombre` y
 * `email` y nada más, porque hacen trabajos distintos (uno cualifica en 4
 * campos, este levanta el material del pre-diagnóstico).
 *
 * Casi todo es enum a propósito. Los tres campos de texto libre
 * —`problemaPrincipal`, `solucionActual`, `sistemasActuales`— son los únicos
 * que llegan al modelo como prosa, y por eso son los únicos que el prompt
 * delimita en tags tratándolos como datos y no como instrucciones.
 */
export const leadAssessmentSchema = z.object({
  tipo: z.literal("assessment"),
  ...leadBaseFields,

  /**
   * Obligatoria acá, a diferencia del lead de contacto. El pre-diagnóstico la
   * interpola en el encabezado del documento: sin ella sale `[Empresa]`. Es un
   * campo obligatorio del entregable, no del CRM.
   */
  empresa: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de tu empresa.")
    .max(100, "El nombre de la empresa es demasiado largo.")
    .regex(SIN_CARACTERES_DE_CONTROL, "El nombre tiene caracteres no válidos."),

  // Los tres campos de texto libre. Sin `SIN_CARACTERES_DE_CONTROL`: son
  // textareas y los saltos de línea son legítimos. Ninguno llega a un asunto
  // de email, que es donde ese control importa.
  problemaPrincipal: z
    .string()
    .trim()
    .min(20, "Cuéntanos un poco más: al menos 20 caracteres.")
    .max(1500, "Resume en menos de 1500 caracteres."),
  solucionActual: z
    .string()
    .trim()
    .min(10, "Cuéntanos cómo lo resuelven hoy.")
    .max(1500, "Resume en menos de 1500 caracteres."),

  fuentesDatos: z
    .array(z.enum(valoresFuentes))
    .min(1, "Selecciona al menos una fuente de datos."),
  equipoDatos: z.enum(["si", "no", "parcial"], {
    message: "Indica si hay equipo de datos.",
  }),
  personasConDatos: z
    .number()
    .int("Ingresa un número entero.")
    .min(0, "No puede ser negativo.")
    .max(10_000, "Ingresa un número realista."),
  cloud: z.enum(["aws", "azure", "gcp", "otro", "ninguno"], {
    message: "Selecciona el proveedor cloud.",
  }),
  presupuesto: z.enum(["asignado", "en-evaluacion", "sin-presupuesto"], {
    message: "Indica el estado del presupuesto.",
  }),
  urgencia: z.enum(["alta", "media", "baja"], {
    message: "Indica la urgencia.",
  }),

  // Las cuatro preguntas aprobadas por Daniela el 2026-08-09. Opcionales: son
  // las que más fricción agregan al formulario y ninguna es imprescindible
  // para producir el documento — su ausencia se convierte en una entrada de
  // "qué falta averiguar en discovery", que es una sección del entregable.
  horasSemanaProceso: z.enum(HORAS_SEMANA).optional(),
  sponsor: z
    .string()
    .trim()
    .max(120)
    .regex(SIN_CARACTERES_DE_CONTROL, "El sponsor tiene caracteres no válidos.")
    .optional(),
  evaluandoCambio: z.enum(["si", "no", "todavia-no"]).optional(),
  sistemasActuales: z
    .string()
    .trim()
    .max(200)
    .regex(SIN_CARACTERES_DE_CONTROL, "Los sistemas tienen caracteres no válidos.")
    .optional(),

  [honeypotField]: honeypotSchema,
});

/**
 * Unión de todos los tipos de lead, discriminada por `tipo`.
 *
 * `discriminatedUnion` y no `union`: con la primera, un payload de assessment
 * al que le falta un campo devuelve los errores de **esa** variante. Con
 * `z.union` devolvería los errores de las dos y el formulario marcaría campos
 * que no existen en su pantalla.
 */
export const leadSchema = z.discriminatedUnion("tipo", [
  leadContactoSchema,
  leadAssessmentSchema,
]);

/** Payload validado tal como llega desde el formulario. */
export type LeadContactoInput = z.input<typeof leadContactoSchema>;
export type LeadContacto = z.output<typeof leadContactoSchema>;

export type LeadAssessmentInput = z.input<typeof leadAssessmentSchema>;
export type LeadAssessment = z.output<typeof leadAssessmentSchema>;

/** Cualquier payload ya validado, sea de la variante que sea. */
export type LeadValidado = z.output<typeof leadSchema>;

/**
 * Lead ya normalizado y listo para notificar. Es lo que consumen el envío de
 * email (Fase 1) y, más adelante, el agente de assessment (Fase 2).
 *
 * Es un `type` y no una `interface` porque la Fase 2 lo vuelve una unión
 * discriminada (`LeadContactoNormalizado | LeadAssessmentNormalizado`). Con el
 * `switch` exhaustivo sobre `tipo` en `procesarLead()`, agregar una variante sin
 * manejarla rompe el build — que es exactamente lo que queremos.
 */
export interface LeadContactoNormalizado {
  tipo: "contacto";
  nombre: string;
  email: string;
  rol: RolLead;
  desafio: DesafioLead;
  /** Momento de recepción en el servidor, ISO 8601. */
  recibidoEn: string;
}

/**
 * Lead de assessment normalizado. Es lo que consumen el email #1 y el prompt
 * del agente.
 *
 * Los cuatro campos opcionales se mantienen opcionales: `undefined` significa
 * *"no lo contestó"*, y el renderer lo traduce a `[por confirmar en discovery]`.
 * Rellenarlos con un valor por defecto acá borraría esa distinción y el
 * documento afirmaría cosas que nadie dijo.
 */
export interface LeadAssessmentNormalizado {
  tipo: "assessment";
  nombre: string;
  email: string;
  empresa: string;
  problemaPrincipal: string;
  solucionActual: string;
  fuentesDatos: FuenteDatos[];
  equipoDatos: "si" | "no" | "parcial";
  personasConDatos: number;
  cloud: "aws" | "azure" | "gcp" | "otro" | "ninguno";
  presupuesto: "asignado" | "en-evaluacion" | "sin-presupuesto";
  urgencia: "alta" | "media" | "baja";
  horasSemanaProceso?: RangoHoras;
  sponsor?: string;
  evaluandoCambio?: "si" | "no" | "todavia-no";
  sistemasActuales?: string;
  /** Momento de recepción en el servidor, ISO 8601. */
  recibidoEn: string;
}

export type Lead = LeadContactoNormalizado | LeadAssessmentNormalizado;

/**
 * Descarta el honeypot y estampa la marca de tiempo del servidor.
 *
 * Despacha por `tipo` con un `switch` exhaustivo, igual que `procesarLead()`.
 * **Que haya dos `switch` sobre el mismo discriminante no es duplicación:** uno
 * traduce input validado a modelo, el otro traduce modelo a efecto. Fusionarlos
 * ataría la normalización al envío de emails.
 */
export function normalizarLead(datos: LeadValidado, recibidoEn: Date): Lead {
  const recibido = recibidoEn.toISOString();

  switch (datos.tipo) {
    case "contacto":
      return {
        tipo: "contacto",
        nombre: datos.nombre,
        email: datos.email,
        rol: datos.rol,
        desafio: datos.desafio,
        recibidoEn: recibido,
      };
    case "assessment":
      return {
        tipo: "assessment",
        nombre: datos.nombre,
        email: datos.email,
        empresa: datos.empresa,
        problemaPrincipal: datos.problemaPrincipal,
        solucionActual: datos.solucionActual,
        fuentesDatos: [...datos.fuentesDatos],
        equipoDatos: datos.equipoDatos,
        personasConDatos: datos.personasConDatos,
        cloud: datos.cloud,
        presupuesto: datos.presupuesto,
        urgencia: datos.urgencia,
        horasSemanaProceso: datos.horasSemanaProceso,
        sponsor: datos.sponsor,
        evaluandoCambio: datos.evaluandoCambio,
        sistemasActuales: datos.sistemasActuales,
        recibidoEn: recibido,
      };
    default: {
      const noManejado: never = datos;
      throw new Error(
        `Tipo de lead no manejado en normalizarLead: ${JSON.stringify(noManejado)}`,
      );
    }
  }
}

/**
 * Dominios de correo gratuito. **No se usa para validar**: bloquear un `@gmail`
 * perdería clientes reales (en Chile una PYME mediana escribe desde Gmail) y el
 * email de contacto de la propia consultora es uno. Se usa solo para mostrar una
 * sugerencia en gris en el formulario, sin marcar el campo como inválido ni
 * impedir el envío.
 *
 * Vive acá y no en el componente porque el email a la casilla también la usa,
 * para anotar "correo personal" al costado del dato.
 */
export const DOMINIOS_PERSONALES = [
  "gmail.com",
  "hotmail.com",
  "hotmail.cl",
  "outlook.com",
  "outlook.cl",
  "live.cl",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "proton.me",
  "protonmail.com",
] as const;

export function esCorreoPersonal(email: string): boolean {
  const dominio = email.trim().toLowerCase().split("@")[1];
  if (!dominio) return false;
  return (DOMINIOS_PERSONALES as readonly string[]).includes(dominio);
}

/** Respuesta que el endpoint de contacto devuelve al formulario. */
export type RespuestaContacto =
  | { ok: true }
  | { ok: false; error: string; campos?: Record<string, string[]> };

/**
 * Respuesta del endpoint de assessment.
 *
 * `calificado` es lo único que decide si la confirmación muestra el Calendly
 * (decisión de Daniela, 2026-08-09). **Es un booleano y no la `Calificacion`
 * completa a propósito:** el motivo del descarte es criterio comercial interno
 * y no tiene por qué viajar al navegador, donde cualquiera lo lee.
 *
 * `RespuestaContacto` no se toca: el formulario de la home no califica a nadie
 * y agregarle un campo opcional invitaría a leerlo donde siempre es `undefined`.
 */
export type RespuestaAssessment =
  | { ok: true; calificado: boolean }
  | { ok: false; error: string; campos?: Record<string, string[]> };
