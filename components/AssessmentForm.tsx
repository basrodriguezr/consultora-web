"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";

import { Confirmacion } from "@/components/CalendlyEmbed";
import { assessment } from "@/content/assessment";
import {
  ETIQUETAS_CLOUD,
  ETIQUETAS_EQUIPO,
  ETIQUETAS_EVALUANDO_CAMBIO,
  ETIQUETAS_HORAS,
  ETIQUETAS_PRESUPUESTO,
  ETIQUETAS_URGENCIA,
  FUENTES_DATOS,
  HORAS_SEMANA,
  esCorreoPersonal,
  honeypotField,
  leadAssessmentSchema,
  type LeadAssessment,
  type LeadAssessmentInput,
  type RespuestaAssessment,
} from "@/lib/leads";

/**
 * Formulario largo de `/assessment` — los 15 campos que alimentan el
 * pre-diagnóstico de la Fase 2.
 *
 * **No es una versión extendida del formulario de contacto de la home.** Aquel
 * es un micro-cualificador de 4 campos cuyo trabajo es bajar la fricción hasta
 * que alguien agende; este levanta el material del entregable y por eso puede
 * darse el lujo de ser largo. Comparten el patrón (`useForm` + `zodResolver`,
 * `aria-invalid`/`aria-describedby` por campo, honeypot fuera del esquema, el
 * formulario que no se limpia ante error) y nada más.
 *
 * ## De dónde sale cada texto — la división NO es estilística
 *
 * El texto de la **pregunta** vive en `content/assessment.ts`; el texto de cada
 * **opción de enum** vive en `lib/leads.ts`, pegado al esquema que la valida.
 * El email que recibe Daniela usa esos mismos mapas: escribir a mano el label de
 * una opción acá desalinearía la pantalla de la bandeja y nadie se enteraría
 * hasta que ella preguntara qué significa `"sin-presupuesto"`.
 *
 * Por eso las opciones se derivan de los `Record` de `lib/leads.ts` con
 * `clavesDe()` en vez de listarlas: una opción nueva en el esquema aparece sola
 * en pantalla, en el orden en que está escrita.
 */

type Estado = "idle" | "exito" | "error";

const CLASE_ETIQUETA = "block text-sm font-medium text-fg mb-2";

/*
 * ⚠️ **`border-line-strong`, no `border-line`, y esto es accesibilidad, no
 * estética.** Corregido el 2026-09-03.
 *
 * Medido: `line` sobre `panel` da **1,29:1 en claro y 1,22:1 en oscuro**, contra
 * el mínimo de 3:1 que pide WCAG 1.4.11 para el borde que identifica un control.
 * Y el relleno tampoco se distingue de la página (1,06:1), así que con `line`
 * **nada indicaba dónde termina el campo**. `line-strong` da 3,64 y 3,23.
 *
 * El único estado que cumplía era `hover:`, **que en móvil no existe**, y este
 * sitio es mobile first.
 *
 * 🛑 **Ni Lighthouse ni axe lo detectan** — el criterio 1.4.11 sobre bordes no
 * está automatizado, así que el 100/100 de julio convivía con esto. Si alguien
 * "simplifica" esto de vuelta a `border-line`, no va a haber ninguna métrica en
 * rojo que lo delate.
 *
 * `border-line` sigue siendo correcto para separadores y bordes de tarjeta: son
 * decorativos y no tienen requisito de contraste.
 */
const CLASE_INPUT =
  "w-full rounded-lg bg-panel border border-line-strong px-4 py-3 text-sm text-fg " +
  "placeholder:text-subtle hover:border-line-strong transition disabled:opacity-60";

const CLASE_ERROR = "mt-2 text-xs text-error";

const CLASE_AYUDA = "mt-2 text-xs text-subtle";

/** Caja de una opción de radio o checkbox. Mismo tratamiento que `ContactoForm`. */
const CLASE_OPCION =
  "flex items-start gap-3 rounded-lg border border-line-strong bg-panel px-4 py-3 " +
  "cursor-pointer hover:border-line-strong has-[:checked]:border-brand-500 transition";

const CLASE_TITULO_GRUPO = "text-lg font-semibold text-fg";

/**
 * Copy de las 15 preguntas, con `ayuda` declarada como opcional.
 *
 * Dos cosas hace esta línea, y las dos importan:
 *
 * 1. `assessment.campos` es `as const`, así que los campos sin `ayuda` **no
 *    tienen la propiedad** y leerla directo no compila. El tipo la vuelve
 *    opcional para poder pasarla siempre.
 * 2. Las claves son `keyof LeadAssessmentInput` menos el discriminante y el
 *    honeypot. Si el esquema gana un campo y nadie le escribe la pregunta, esta
 *    asignación **deja de compilar** — que es exactamente la garantía que
 *    promete el comentario de cabecera de `content/assessment.ts`.
 */
const COPY: Record<
  Exclude<keyof LeadAssessmentInput, "tipo" | typeof honeypotField>,
  { readonly etiqueta: string; readonly ayuda?: string }
> = assessment.campos;

/**
 * Claves de un mapa de etiquetas, tipadas.
 *
 * `Object.keys` devuelve `string[]` por una razón de solidez del sistema de
 * tipos (un objeto puede tener más propiedades que su tipo declarado), pero acá
 * el mapa es un `Record` literal de `lib/leads.ts` y sus claves son exactamente
 * los valores del enum. El orden es el de escritura, que es el orden en que se
 * quieren ver en pantalla.
 */
function clavesDe<K extends string>(mapa: Record<K, string>): K[] {
  return Object.keys(mapa) as K[];
}

const OPCIONES_EQUIPO = clavesDe(ETIQUETAS_EQUIPO);
const OPCIONES_CLOUD = clavesDe(ETIQUETAS_CLOUD);
const OPCIONES_URGENCIA = clavesDe(ETIQUETAS_URGENCIA);
const OPCIONES_PRESUPUESTO = clavesDe(ETIQUETAS_PRESUPUESTO);
const OPCIONES_EVALUANDO_CAMBIO = clavesDe(ETIQUETAS_EVALUANDO_CAMBIO);

/**
 * Campos que el servidor puede marcar como inválidos en su respuesta.
 *
 * El `satisfies` es lo que hace que renombrar un campo en `leadAssessmentSchema`
 * rompa el build acá, en vez de dejar un `setError` que nunca encuentra su
 * destino y un error de servidor que no se ve en ninguna parte.
 */
const CAMPOS_DEL_FORM = [
  "nombre",
  "email",
  "empresa",
  "problemaPrincipal",
  "solucionActual",
  "fuentesDatos",
  "equipoDatos",
  "personasConDatos",
  "cloud",
  "urgencia",
  "presupuesto",
  "horasSemanaProceso",
  "sponsor",
  "evaluandoCambio",
  "sistemasActuales",
] as const satisfies readonly (keyof LeadAssessmentInput)[];

type CampoDelForm = (typeof CAMPOS_DEL_FORM)[number];

function esCampoDelForm(clave: string): clave is CampoDelForm {
  return (CAMPOS_DEL_FORM as readonly string[]).includes(clave);
}

/**
 * Los cuatro campos opcionales del ADR-009.
 *
 * ⚠️ **Un control vacío no manda `undefined`.** Medido contra react-hook-form
 * 7.82: un grupo de radios sin marcar deja `null` en los valores del formulario
 * (`getRadioValue` devuelve `{ value: null }` cuando ninguna opción está
 * marcada) y un input de texto vacío deja `""`. Ninguno de los dos es
 * `undefined`, y en zod eso no es un detalle:
 *
 *   - `z.enum([...]).optional()` **rechaza** `null` y `""` con el mensaje
 *     genérico «Opción inválida: se esperaba una de …», o sea el envío se
 *     bloquea por un campo que la propia pantalla anuncia como opcional;
 *   - `z.string().max(120).optional()` **acepta** `""` sin chistar, y entonces
 *     `sponsor: ""` viaja al servidor como si alguien lo hubiera contestado —
 *     el renderer del entregable perdería la distinción entre "no contestó"
 *     (que va a "qué falta averiguar en discovery") y "contestó vacío".
 *
 * Por eso se limpian **antes** de validar, en el resolver, y no después: si se
 * limpiaran en el `onSubmit` ya sería tarde, porque con `null` la validación
 * nunca pasa y el handler no llega a correr.
 */
const CAMPOS_OPCIONALES = [
  "horasSemanaProceso",
  "sponsor",
  "evaluandoCambio",
  "sistemasActuales",
] as const satisfies readonly (keyof LeadAssessmentInput)[];

function sanearOpcionales(valores: LeadAssessmentInput): LeadAssessmentInput {
  const copia = { ...valores };

  for (const campo of CAMPOS_OPCIONALES) {
    // Se lee como `unknown` a propósito: el tipo declarado del campo no incluye
    // `null`, pero el DOM sí lo produce, y comparar contra un tipo que "no puede
    // serlo" es justo el chequeo que TypeScript rechazaría.
    const valor: unknown = copia[campo];
    if (valor === null || valor === "") {
      delete copia[campo];
    }
  }

  return copia;
}

const resolverBase = zodResolver(leadAssessmentSchema);

/** Lee el JSON de la respuesta sin romperse si el servidor devolvió otra cosa. */
async function leerRespuesta(
  respuesta: Response,
): Promise<RespuestaAssessment | null> {
  try {
    const datos: unknown = await respuesta.json();
    if (typeof datos === "object" && datos !== null && "ok" in datos) {
      return datos as RespuestaAssessment;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Evento de conversión en GA4.
 *
 * Copiada de `ContactoForm` con otro `form_id` en vez de importada: aquel
 * archivo no es de este componente y exportar un helper desde ahí lo convertiría
 * en una dependencia que nadie declaró.
 *
 * Defensiva por diseño: `gtag` no existe si `NEXT_PUBLIC_GA_ID` no está
 * configurada (local, previews) o si un bloqueador se comió el script. La
 * analítica no puede romper el estado de éxito de un lead que YA llegó.
 */
function reportarEnvioAGa4(): void {
  if (typeof window === "undefined") return;

  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void })
    .gtag;
  if (typeof gtag !== "function") return;

  try {
    gtag("event", "form_submit", { form_id: "assessment" });
  } catch {
    // Silencio deliberado: ver comentario de arriba.
  }
}

/* ---------------------------------------------------------------------------
 * Piezas de presentación
 *
 * Son locales y no exportadas: aplican quince veces el mismo patrón de
 * `ContactoForm` (etiqueta + control + ayuda + error, con los ids de
 * `aria-describedby` derivados del nombre del campo). Registrar el control sigue
 * siendo trabajo del punto de uso — el `register(...)` nunca se esconde acá
 * adentro, porque es lo único que hay que poder leer de un vistazo.
 * ------------------------------------------------------------------------- */

const idDe = (campo: string) => `assessment-${campo}`;
const idError = (campo: string) => `assessment-${campo}-error`;
const idAyuda = (campo: string) => `assessment-${campo}-ayuda`;
const idLegend = (campo: string) => `assessment-${campo}-legend`;

/**
 * Ids que describen a un control, en el orden en que se quieren oír: primero el
 * error, después la ayuda.
 *
 * `extra` es para la única descripción que no viene de `content/`: la sugerencia
 * de correo corporativo, que aparece y desaparece según lo que se escriba.
 */
function descripcionDe(
  campo: string,
  hayError: boolean,
  hayAyuda: boolean,
  extra?: string,
): string | undefined {
  const ids = [
    hayError ? idError(campo) : null,
    hayAyuda ? idAyuda(campo) : null,
    extra ?? null,
  ].filter((id): id is string => id !== null);

  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** `id` + `aria-invalid` + `aria-describedby` de un control con etiqueta propia. */
function atributosControl(
  campo: string,
  hayError: boolean,
  hayAyuda: boolean,
  extra?: string,
) {
  return {
    id: idDe(campo),
    "aria-invalid": hayError ? true : undefined,
    "aria-describedby": descripcionDe(campo, hayError, hayAyuda, extra),
  };
}

interface CampoProps {
  campo: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** El control, ya registrado y ya con los atributos de `atributosControl`. */
  children: ReactNode;
}

/** Envoltorio de un campo con un solo control (input, textarea, select). */
function Campo({ campo, etiqueta, ayuda, error, children }: CampoProps) {
  return (
    <div>
      <label htmlFor={idDe(campo)} className={CLASE_ETIQUETA}>
        {etiqueta}
      </label>
      {children}
      {error !== undefined && (
        <p id={idError(campo)} className={CLASE_ERROR}>
          {error}
        </p>
      )}
      {ayuda !== undefined && (
        <p id={idAyuda(campo)} className={CLASE_AYUDA}>
          {ayuda}
        </p>
      )}
    </div>
  );
}

interface GrupoOpcionesProps<T extends string> {
  campo: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  opciones: readonly T[];
  etiquetas: Record<T, string>;
  /** El resultado de `register(...)`, compartido por todas las opciones. */
  registro: UseFormRegisterReturn;
}

/**
 * Grupo de radios.
 *
 * `<fieldset>` + `<legend>` es lo que le da al grupo un nombre accesible.
 * `role="radiogroup"` va explícito porque `aria-invalid` sí está soportado ahí
 * (en un `group` genérico no lo está), y `aria-labelledby` apunta al legend para
 * que el nombre no dependa de cómo cada lector resuelva el rol sobreescrito.
 */
function GrupoRadios<T extends string>({
  campo,
  etiqueta,
  ayuda,
  error,
  opciones,
  etiquetas,
  registro,
}: GrupoOpcionesProps<T>) {
  return (
    <fieldset
      role="radiogroup"
      aria-labelledby={idLegend(campo)}
      aria-invalid={error !== undefined ? true : undefined}
      aria-describedby={descripcionDe(
        campo,
        error !== undefined,
        ayuda !== undefined,
      )}
    >
      <legend id={idLegend(campo)} className={CLASE_ETIQUETA}>
        {etiqueta}
      </legend>

      <div className="space-y-2">
        {opciones.map((opcion) => (
          <label key={opcion} className={CLASE_OPCION}>
            <input
              type="radio"
              value={opcion}
              className="mt-0.5 accent-brand-500"
              {...registro}
            />
            <span className="text-sm text-fg leading-snug">
              {etiquetas[opcion]}
            </span>
          </label>
        ))}
      </div>

      {error !== undefined && (
        <p id={idError(campo)} className={CLASE_ERROR}>
          {error}
        </p>
      )}
      {ayuda !== undefined && (
        <p id={idAyuda(campo)} className={CLASE_AYUDA}>
          {ayuda}
        </p>
      )}
    </fieldset>
  );
}

/* ---------------------------------------------------------------------------
 * El formulario
 * ------------------------------------------------------------------------- */

export default function AssessmentForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensajeError, setMensajeError] = useState<string>("");
  const [calificado, setCalificado] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeadAssessmentInput, unknown, LeadAssessment>({
    /*
     * El resolver limpia los opcionales antes de delegar en zod. Ver el
     * comentario de `CAMPOS_OPCIONALES`: es la diferencia entre "se puede dejar
     * en blanco" y "se puede dejar en blanco y además el envío pasa".
     */
    resolver: (valores, contexto, opciones) =>
      resolverBase(sanearOpcionales(valores), contexto, opciones),
    defaultValues: {
      /*
       * `tipo` NO tiene `.default()` en el esquema: se lo sacaron al
       * discriminante para que la unión de la Fase 2 no lo heredara. La
       * contrapartida es esta línea. Si falta, la validación falla hablando de
       * un campo que no existe en pantalla y no hay forma de darse cuenta
       * mirando el formulario.
       */
      tipo: "assessment",
      nombre: "",
      email: "",
      empresa: "",
      problemaPrincipal: "",
      solucionActual: "",
      /*
       * ⚠️ Este `[]` no es cosmético, es la diferencia entre un mensaje de error
       * legible y uno incomprensible. Medido en react-hook-form 7.82: con el
       * primer checkbox del grupo montado, `_f.refs` tiene largo 1 y
       * `getCheckboxValue` devuelve `false` (su `defaultResult`), no `[]`. Ese
       * `false` queda cacheado y los checkboxes siguientes ya no lo corrigen, así
       * que un envío sin ninguna marca llega a zod como booleano y el error sale
       * «Entrada inválida: se esperaba arreglo, recibido booleano» en vez de
       * «Selecciona al menos una fuente de datos.».
       *
       * Declarar el default como array activa la otra rama de `register`: RHF
       * agrega un ref centinela al grupo, `refs` pasa a tener largo > 1 desde el
       * primer montaje y `getCheckboxValue` devuelve `[]`, que es lo que hace
       * hablar al `.min(1)` del esquema.
       */
      fuentesDatos: [],
      sponsor: "",
      sistemasActuales: "",
      [honeypotField]: "",
      /*
       * `personasConDatos`, `equipoDatos`, `cloud`, `urgencia`, `presupuesto`,
       * `horasSemanaProceso` y `evaluandoCambio` se omiten a propósito:
       * preseleccionar una opción falsearía la respuesta de quien no la eligió,
       * y un `0` precargado en "cuántas personas" es una respuesta inventada.
       */
    },
  });

  /*
   * Sugerencia de correo corporativo. NO es validación: no bloquea el envío ni
   * marca el campo como inválido. Bloquear los dominios gratuitos perdería
   * clientes reales —en Chile una PYME mediana escribe desde Gmail— y meterlo en
   * el esquema lo haría correr también en el cliente vía `zodResolver`, dejando
   * el botón sin hacer nada. Ese bug ya nos pasó con el honeypot.
   *
   * `useWatch` y no `watch()`: el segundo hace que el React Compiler se saltee la
   * memoización del componente entero, y acá hay quince campos que re-renderizar.
   */
  const emailEscrito = useWatch({ control, name: "email" }) ?? "";
  const sugerirCorporativo = esCorreoPersonal(emailEscrito);
  const idSugerencia = "assessment-email-sugerencia";

  /*
   * `personasConDatos` es el único campo numérico, y un `<input type="number">`
   * vacío no da `undefined`: con `valueAsNumber` da `NaN`. zod lo rechaza con
   * «Entrada inválida: se esperaba número, recibido NaN», que es un artefacto de
   * la librería, no un mensaje para una persona.
   *
   * El `type` del error viene del `code` de la issue de zod (lo mapea
   * `@hookform/resolvers`), así que `invalid_type` distingue exactamente "no es
   * un número" —vacío, NaN, null— de los rangos, cuyos mensajes el esquema ya
   * escribe en español ("No puede ser negativo.", "Ingresa un número entero.").
   * Discriminar por el código y no por el texto del mensaje es lo que hace que
   * esto no se rompa si zod cambia una traducción.
   */
  const errorPersonas = errors.personasConDatos;
  const mensajePersonas =
    errorPersonas === undefined
      ? undefined
      : errorPersonas.type === "invalid_type"
        ? "Ingresa un número. Si nadie trabaja con datos todavía, escribe 0."
        : errorPersonas.message;

  async function enviar(datos: LeadAssessment) {
    setMensajeError("");

    let respuesta: Response;
    try {
      /*
       * `/api/assessment` llega en el paso 7 del plan. Mientras tanto esto
       * responde 404 en dev, y está bien: apuntar a `/api/contacto` daría un 400
       * de esquema equivocado, que confunde más de lo que ayuda.
       */
      respuesta = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    } catch {
      setEstado("error");
      setMensajeError(assessment.errores.red);
      return;
    }

    const cuerpo = await leerRespuesta(respuesta);

    if (respuesta.ok && cuerpo?.ok === true) {
      reportarEnvioAGa4();
      setCalificado(cuerpo.calificado);
      setEstado("exito");
      return;
    }

    if (cuerpo && cuerpo.ok === false) {
      if (cuerpo.campos) {
        for (const [clave, mensajes] of Object.entries(cuerpo.campos)) {
          if (!esCampoDelForm(clave) || !mensajes?.length) continue;
          setError(clave, { type: "server", message: mensajes[0] });
        }
      }
      setMensajeError(cuerpo.error || assessment.errores.generico);
    } else {
      setMensajeError(assessment.errores.generico);
    }

    // Ante cualquier error el formulario NO se limpia: quince campos escritos a
    // mano no se vuelven a tipear, y reintentar tiene que ser apretar el botón.
    setEstado("error");
  }

  return (
    <div className="bg-panel border border-line rounded-xl p-6 sm:p-8 text-left">
      {/*
        Región viva siempre montada: si apareciera junto con el mensaje, los
        lectores de pantalla podrían no anunciarlo.

        En éxito acá entra solo texto, no el bloque visual completo — meter la
        `<Confirmacion>` entera dentro de la región haría que el lector anunciara
        el iframe del calendario y sus links.

        ⚠️ El anuncio es el mismo califique o no califique la persona.
      */}
      <div role="status" aria-live="polite">
        {estado === "exito" && <p className="sr-only">{assessment.exito}</p>}
        {estado === "error" && mensajeError !== "" && (
          <p className="text-sm text-error">{mensajeError}</p>
        )}
      </div>

      {estado === "exito" ? (
        /*
          `mostrarAgenda={calificado}` es la puerta del §8: un lead que no
          califica no ve la agenda. Lo único que cambia es el embed — el título
          y el párrafo son los mismos, a propósito.
        */
        <Confirmacion nivelTitulo="h2" mostrarAgenda={calificado} />
      ) : (
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-10">
          {/* ---------------- 1. Quién eres ---------------- */}
          <section className="space-y-6">
            <h2 className={CLASE_TITULO_GRUPO}>{assessment.grupos.identidad}</h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <Campo
                campo="nombre"
                etiqueta={COPY.nombre.etiqueta}
                ayuda={COPY.nombre.ayuda}
                error={errors.nombre?.message}
              >
                <input
                  type="text"
                  autoComplete="name"
                  className={CLASE_INPUT}
                  {...atributosControl(
                    "nombre",
                    errors.nombre !== undefined,
                    COPY.nombre.ayuda !== undefined,
                  )}
                  {...register("nombre")}
                />
              </Campo>

              <Campo
                campo="email"
                etiqueta={COPY.email.etiqueta}
                ayuda={COPY.email.ayuda}
                error={errors.email?.message}
              >
                <input
                  type="email"
                  autoComplete="email"
                  className={CLASE_INPUT}
                  {...atributosControl(
                    "email",
                    errors.email !== undefined,
                    COPY.email.ayuda !== undefined,
                    sugerirCorporativo ? idSugerencia : undefined,
                  )}
                  {...register("email")}
                />
                {sugerirCorporativo && (
                  <p id={idSugerencia} className={CLASE_AYUDA}>
                    Si tienes correo corporativo, ayuda a priorizar tu solicitud
                  </p>
                )}
              </Campo>
            </div>

            <Campo
              campo="empresa"
              etiqueta={COPY.empresa.etiqueta}
              ayuda={COPY.empresa.ayuda}
              error={errors.empresa?.message}
            >
              <input
                type="text"
                autoComplete="organization"
                className={CLASE_INPUT}
                {...atributosControl(
                  "empresa",
                  errors.empresa !== undefined,
                  COPY.empresa.ayuda !== undefined,
                )}
                {...register("empresa")}
              />
            </Campo>
          </section>

          {/* ---------------- 2. El problema ---------------- */}
          <section className="space-y-6">
            <h2 className={CLASE_TITULO_GRUPO}>{assessment.grupos.problema}</h2>

            <Campo
              campo="problemaPrincipal"
              etiqueta={COPY.problemaPrincipal.etiqueta}
              ayuda={COPY.problemaPrincipal.ayuda}
              error={errors.problemaPrincipal?.message}
            >
              <textarea
                rows={5}
                className={`${CLASE_INPUT} resize-y`}
                {...atributosControl(
                  "problemaPrincipal",
                  errors.problemaPrincipal !== undefined,
                  COPY.problemaPrincipal.ayuda !== undefined,
                )}
                {...register("problemaPrincipal")}
              />
            </Campo>

            <Campo
              campo="solucionActual"
              etiqueta={COPY.solucionActual.etiqueta}
              ayuda={COPY.solucionActual.ayuda}
              error={errors.solucionActual?.message}
            >
              <textarea
                rows={4}
                className={`${CLASE_INPUT} resize-y`}
                {...atributosControl(
                  "solucionActual",
                  errors.solucionActual !== undefined,
                  COPY.solucionActual.ayuda !== undefined,
                )}
                {...register("solucionActual")}
              />
            </Campo>
          </section>

          {/* ---------------- 3. Tu equipo y tu stack ---------------- */}
          <section className="space-y-6">
            <h2 className={CLASE_TITULO_GRUPO}>{assessment.grupos.equipo}</h2>

            {/*
              Checkboxes que comparten `name`: react-hook-form los junta en un
              array. El orden y las etiquetas salen de `FUENTES_DATOS`, que es el
              mismo array del que sale el enum del esquema y el que usa el email.
            */}
            <fieldset
              aria-labelledby={idLegend("fuentesDatos")}
              aria-invalid={errors.fuentesDatos !== undefined ? true : undefined}
              aria-describedby={descripcionDe(
                "fuentesDatos",
                errors.fuentesDatos !== undefined,
                COPY.fuentesDatos.ayuda !== undefined,
              )}
            >
              <legend id={idLegend("fuentesDatos")} className={CLASE_ETIQUETA}>
                {COPY.fuentesDatos.etiqueta}
              </legend>

              <div className="grid sm:grid-cols-2 gap-2">
                {FUENTES_DATOS.map((fuente) => (
                  <label key={fuente.value} className={CLASE_OPCION}>
                    <input
                      type="checkbox"
                      value={fuente.value}
                      className="mt-0.5 accent-brand-500"
                      {...register("fuentesDatos")}
                    />
                    <span className="text-sm text-fg leading-snug">
                      {fuente.label}
                    </span>
                  </label>
                ))}
              </div>

              {errors.fuentesDatos && (
                <p id={idError("fuentesDatos")} className={CLASE_ERROR}>
                  {errors.fuentesDatos.message}
                </p>
              )}
              {COPY.fuentesDatos.ayuda !== undefined && (
                <p id={idAyuda("fuentesDatos")} className={CLASE_AYUDA}>
                  {COPY.fuentesDatos.ayuda}
                </p>
              )}
            </fieldset>

            <GrupoRadios
              campo="equipoDatos"
              etiqueta={COPY.equipoDatos.etiqueta}
              ayuda={COPY.equipoDatos.ayuda}
              error={errors.equipoDatos?.message}
              opciones={OPCIONES_EQUIPO}
              etiquetas={ETIQUETAS_EQUIPO}
              registro={register("equipoDatos")}
            />

            <Campo
              campo="personasConDatos"
              etiqueta={COPY.personasConDatos.etiqueta}
              ayuda={COPY.personasConDatos.ayuda}
              error={mensajePersonas}
            >
              {/*
                `valueAsNumber` es obligatorio: un `<input type="number">`
                devuelve string, y `z.number()` rechaza `"5"` igual que rechaza
                `"cinco"`. Sin esto el campo falla en silencio con un número
                perfectamente válido escrito en pantalla.

                `min`/`max`/`step` son atributos HTML, no reglas de validación:
                con `noValidate` el navegador no los hace cumplir, pero ordenan
                el teclado numérico del móvil y los steppers.
              */}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                step={1}
                className={CLASE_INPUT}
                {...atributosControl(
                  "personasConDatos",
                  mensajePersonas !== undefined,
                  COPY.personasConDatos.ayuda !== undefined,
                )}
                {...register("personasConDatos", { valueAsNumber: true })}
              />
            </Campo>

            <Campo
              campo="cloud"
              etiqueta={COPY.cloud.etiqueta}
              ayuda={COPY.cloud.ayuda}
              error={errors.cloud?.message}
            >
              <select
                className={CLASE_INPUT}
                defaultValue=""
                {...atributosControl(
                  "cloud",
                  errors.cloud !== undefined,
                  COPY.cloud.ayuda !== undefined,
                )}
                {...register("cloud")}
              >
                {/*
                  Opción vacía primero: sin ella el navegador deja seleccionada
                  la primera de la lista y el formulario mandaría "AWS" para todo
                  el mundo. `value=""` no pasa el enum, así que zod pide elegir.
                */}
                <option value="" disabled>
                  Selecciona una opción
                </option>
                {OPCIONES_CLOUD.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {ETIQUETAS_CLOUD[opcion]}
                  </option>
                ))}
              </select>
            </Campo>
          </section>

          {/* ---------------- 4. Contexto de la decisión ---------------- */}
          <section className="space-y-6">
            <h2 className={CLASE_TITULO_GRUPO}>{assessment.grupos.decision}</h2>

            <GrupoRadios
              campo="urgencia"
              etiqueta={COPY.urgencia.etiqueta}
              ayuda={COPY.urgencia.ayuda}
              error={errors.urgencia?.message}
              opciones={OPCIONES_URGENCIA}
              etiquetas={ETIQUETAS_URGENCIA}
              registro={register("urgencia")}
            />

            {/*
              El presupuesto va último de los obligatorios a propósito: es la
              pregunta más incómoda y se hace cuando la persona ya invirtió
              esfuerzo en contestar el resto (§15c).
            */}
            <GrupoRadios
              campo="presupuesto"
              etiqueta={COPY.presupuesto.etiqueta}
              ayuda={COPY.presupuesto.ayuda}
              error={errors.presupuesto?.message}
              opciones={OPCIONES_PRESUPUESTO}
              etiquetas={ETIQUETAS_PRESUPUESTO}
              registro={register("presupuesto")}
            />
          </section>

          {/* ---------------- 5. Opcionales ---------------- */}
          <section className="space-y-6 rounded-xl border border-line border-dashed p-5 sm:p-6">
            {/*
              Los cuatro opcionales viven en su propio bloque, con el subtítulo
              que lo dice, y ninguno lleva marca de obligatorio. Su ausencia no
              es un hueco: alimenta la sección "qué falta averiguar en discovery"
              del entregable.
            */}
            <div>
              <h2 className={CLASE_TITULO_GRUPO}>
                {assessment.grupos.opcionales}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {assessment.grupos.opcionalesBajada}
              </p>
            </div>

            <GrupoRadios
              campo="horasSemanaProceso"
              etiqueta={COPY.horasSemanaProceso.etiqueta}
              ayuda={COPY.horasSemanaProceso.ayuda}
              error={errors.horasSemanaProceso?.message}
              /*
                El orden sale de `HORAS_SEMANA`, la tupla con la que se construye
                el enum. `"no-se"` va incluida como una opción más y su etiqueta
                ("No lo tengo medido") la escribe `lib/leads.ts`: es la respuesta
                del cliente ideal, no un descarte, y nunca descalifica.
              */
              opciones={HORAS_SEMANA}
              etiquetas={ETIQUETAS_HORAS}
              registro={register("horasSemanaProceso")}
            />

            <Campo
              campo="sponsor"
              etiqueta={COPY.sponsor.etiqueta}
              ayuda={COPY.sponsor.ayuda}
              error={errors.sponsor?.message}
            >
              <input
                type="text"
                className={CLASE_INPUT}
                {...atributosControl(
                  "sponsor",
                  errors.sponsor !== undefined,
                  COPY.sponsor.ayuda !== undefined,
                )}
                {...register("sponsor")}
              />
            </Campo>

            <GrupoRadios
              campo="evaluandoCambio"
              etiqueta={COPY.evaluandoCambio.etiqueta}
              ayuda={COPY.evaluandoCambio.ayuda}
              error={errors.evaluandoCambio?.message}
              opciones={OPCIONES_EVALUANDO_CAMBIO}
              etiquetas={ETIQUETAS_EVALUANDO_CAMBIO}
              registro={register("evaluandoCambio")}
            />

            <Campo
              campo="sistemasActuales"
              etiqueta={COPY.sistemasActuales.etiqueta}
              ayuda={COPY.sistemasActuales.ayuda}
              error={errors.sistemasActuales?.message}
            >
              <input
                type="text"
                className={CLASE_INPUT}
                {...atributosControl(
                  "sistemasActuales",
                  errors.sistemasActuales !== undefined,
                  COPY.sistemasActuales.ayuda !== undefined,
                )}
                {...register("sistemasActuales")}
              />
            </Campo>
          </section>

          {/*
            Honeypot anti-spam: fuera del flujo visual pero real en el DOM, para
            que los bots lo completen. No es `type="hidden"` a propósito — muchos
            bots ignoran los hidden. Invisible para lectores de pantalla y fuera
            del orden de tabulación, así ningún humano lo llena.

            El esquema lo acepta con cualquier valor: quien lo juzga es el
            endpoint. Validarlo acá haría que un gestor de contraseñas que
            rellene `website` deje el botón sin efecto y sin mensaje.
          */}
          <div
            aria-hidden="true"
            className="absolute w-px h-px overflow-hidden opacity-0 -left-[9999px] -top-[9999px]"
          >
            <label htmlFor="assessment-website">No completes este campo</label>
            <input
              id="assessment-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register(honeypotField)}
            />
          </div>

          <div className="space-y-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-btn text-btn-fg px-8 py-3.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? assessment.botonEnviando : assessment.boton}
            </button>

            {/*
              Este texto tiene que describir lo que el código realmente hace.
              Cuando el paso 7 conecte Claude, cambia en `content/assessment.ts`
              y en `app/privacidad/page.tsx` en el mismo commit.
            */}
            <p className="text-xs text-subtle">{assessment.aviso}</p>
          </div>
        </form>
      )}
    </div>
  );
}
