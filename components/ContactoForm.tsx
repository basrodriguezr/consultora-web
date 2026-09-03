"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Confirmacion } from "@/components/CalendlyEmbed";
import { cta } from "@/content/site";
import {
  DESAFIOS,
  ROLES,
  esCorreoPersonal,
  honeypotField,
  leadContactoSchema,
  type LeadContacto,
  type LeadContactoInput,
  type RespuestaContacto,
} from "@/lib/leads";

/**
 * Micro-cualificador de 4 campos: nombre, email, rol y desafío.
 *
 * Su trabajo NO es levantar requisitos —para eso está el formulario largo de
 * `/assessment`, en la Fase 2— sino bajar la fricción hasta que alguien agende.
 * Cada campo que se le agregue le baja la conversión, así que agregar uno es una
 * decisión de negocio, no de implementación.
 *
 * Valida en el cliente contra el mismo `leadContactoSchema` que usa el endpoint
 * y postea a `/api/contacto`. El servidor revalida todo — esta validación es
 * puro feedback inmediato.
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

/**
 * Campos que el servidor puede marcar como inválidos en su respuesta.
 *
 * El endpoint filtra `website` (delataría el honeypot) y `tipo` (no es un
 * control que la persona pueda corregir), así que acá no hace falta preverlos:
 * cualquier clave fuera de esta lista se ignora igual.
 */
const CAMPOS_DEL_FORM = ["nombre", "email", "rol", "desafio"] as const;

function esCampoDelForm(clave: string): clave is (typeof CAMPOS_DEL_FORM)[number] {
  return (CAMPOS_DEL_FORM as readonly string[]).includes(clave);
}

/** Lee el JSON de la respuesta sin romperse si el servidor devolvió otra cosa. */
async function leerRespuesta(
  respuesta: Response,
): Promise<RespuestaContacto | null> {
  try {
    const datos: unknown = await respuesta.json();
    if (typeof datos === "object" && datos !== null && "ok" in datos) {
      return datos as RespuestaContacto;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Evento de conversión en GA4.
 *
 * Defensivo por diseño: `gtag` no existe si `NEXT_PUBLIC_GA_ID` no está
 * configurada (local, previews) o si un bloqueador de anuncios se comió el
 * script. La analítica no puede, bajo ninguna circunstancia, romper el estado
 * de éxito de un lead que YA llegó a la casilla — por eso el chequeo de tipo y
 * el `try`.
 *
 * No se declara `Window.gtag` con `declare global` a propósito: esa declaración
 * es global al proyecto y chocaría con cualquier otra igual (`Analytics.tsx`,
 * la Fase 2) con un error de tipos difícil de leer. El cast local es de una
 * línea y no contamina nada.
 */
function reportarEnvioAGa4(): void {
  if (typeof window === "undefined") return;

  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void })
    .gtag;
  if (typeof gtag !== "function") return;

  try {
    gtag("event", "form_submit", { form_id: "contacto" });
  } catch {
    // Silencio deliberado: ver comentario de arriba.
  }
}

const ERROR_GENERICO =
  "No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.";

export default function ContactoForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensajeError, setMensajeError] = useState<string>("");

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeadContactoInput, unknown, LeadContacto>({
    resolver: zodResolver(leadContactoSchema),
    defaultValues: {
      /*
       * `tipo` NO tiene `.default()` en el esquema: se lo sacaron al
       * discriminante para que la Fase 2, que convierte `leadSchema` en unión,
       * no lo herede. La contrapartida es esta línea. Si falta, la validación
       * falla con un error sobre un campo que no existe en pantalla y no hay
       * forma de darse cuenta mirando el formulario.
       *
       * No lleva input en el DOM: react-hook-form arrastra los `defaultValues`
       * de campos no registrados hasta el payload igual.
       */
      tipo: "contacto",
      nombre: "",
      email: "",
      [honeypotField]: "",
      // `rol` y `desafio` se omiten a propósito: sin valor inicial, el select
      // arranca en su opción vacía y ningún radio viene marcado. Preseleccionar
      // una opción falsearía la respuesta de quien no la eligió.
    },
  });

  /*
   * Sugerencia de correo corporativo. NO es validación: no bloquea el envío ni
   * marca el campo como inválido (nada de `aria-invalid`).
   *
   * Bloquear los dominios gratuitos perdería clientes reales —en Chile una PYME
   * mediana escribe desde Gmail, y el correo de la propia consultora es uno—, y
   * meterlo en el esquema zod lo haría correr también en el cliente vía
   * `zodResolver`: el botón dejaría de hacer nada, sin mensaje. Ese bug ya nos
   * pasó con el honeypot.
   *
   * `useWatch` y no `watch()`: el segundo es una función que devuelve `useForm`,
   * y el React Compiler no puede memoizarla sin arriesgar UI obsoleta — así que
   * se saltea la optimización de TODO el componente y lo avisa por lint.
   * `useWatch` es un hook que devuelve el valor, se suscribe solo a este campo y
   * no fuerza a re-renderizar por cambios en los otros tres.
   */
  const emailEscrito = useWatch({ control, name: "email" }) ?? "";
  const sugerirCorporativo = esCorreoPersonal(emailEscrito);

  async function enviar(datos: LeadContacto) {
    setMensajeError("");

    let respuesta: Response;
    try {
      respuesta = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    } catch {
      setEstado("error");
      setMensajeError(
        "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
      );
      return;
    }

    const cuerpo = await leerRespuesta(respuesta);

    if (respuesta.ok && cuerpo?.ok === true) {
      reportarEnvioAGa4();
      setEstado("exito");
      return;
    }

    if (cuerpo && cuerpo.ok === false) {
      if (cuerpo.campos) {
        for (const [clave, mensajes] of Object.entries(cuerpo.campos)) {
          if (!esCampoDelForm(clave) || !mensajes?.length) continue;
          setError(clave, {
            type: "server",
            message: mensajes[0],
          });
        }
      }
      setMensajeError(cuerpo.error || ERROR_GENERICO);
    } else {
      setMensajeError(ERROR_GENERICO);
    }

    // Ante cualquier error el formulario NO se limpia: lo escrito se conserva
    // para que reintentar sea apretar el botón, no volver a tipear todo.
    setEstado("error");
  }

  const idsAyudaEmail = [
    errors.email ? "contacto-email-error" : null,
    sugerirCorporativo ? "contacto-email-sugerencia" : null,
  ].filter((id): id is string => id !== null);

  return (
    <div className="bg-panel border border-line rounded-xl p-6 sm:p-8 text-left">
      {/*
        Región viva siempre montada: si apareciera junto con el mensaje, los
        lectores de pantalla podrían no anunciarlo.

        En éxito lo que entra acá es solo texto, no el bloque visual completo:
        meter el `<Confirmacion>` entero dentro de la región haría que el lector
        anunciara el iframe del calendario y sus links. El anuncio corto va en
        `sr-only` y el bloque visible se renderiza aparte, justo debajo.
      */}
      <div role="status" aria-live="polite">
        {estado === "exito" && (
          <p className="sr-only">
            Listo, recibimos tu solicitud. Te escribimos en menos de 24 horas
            hábiles.
          </p>
        )}
        {estado === "error" && mensajeError !== "" && (
          <p className="text-sm text-error">{mensajeError}</p>
        )}
      </div>

      {estado === "exito" ? (
        /*
          El formulario se reemplaza en el lugar (spec §8): la persona queda en
          el "thank you" con la agenda a la vista, sin cambiar de página y sin
          perder el scroll. No hay redirect condicional a `/thank-you` porque no
          se puede saber desde acá si alguien agendó dentro del iframe.
        */
        <Confirmacion nivelTitulo="h3" ofrecerDiagnostico />
      ) : (
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="contacto-nombre" className={CLASE_ETIQUETA}>
                Nombre
              </label>
              <input
                id="contacto-nombre"
                type="text"
                autoComplete="name"
                className={CLASE_INPUT}
                aria-invalid={errors.nombre ? true : undefined}
                aria-describedby={errors.nombre ? "contacto-nombre-error" : undefined}
                {...register("nombre")}
              />
              {errors.nombre && (
                <p id="contacto-nombre-error" className={CLASE_ERROR}>
                  {errors.nombre.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="contacto-email" className={CLASE_ETIQUETA}>
                Email
              </label>
              <input
                id="contacto-email"
                type="email"
                autoComplete="email"
                className={CLASE_INPUT}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={
                  idsAyudaEmail.length > 0 ? idsAyudaEmail.join(" ") : undefined
                }
                {...register("email")}
              />
              {errors.email && (
                <p id="contacto-email-error" className={CLASE_ERROR}>
                  {errors.email.message}
                </p>
              )}
              {sugerirCorporativo && (
                <p id="contacto-email-sugerencia" className={CLASE_AYUDA}>
                  Si tienes correo corporativo, ayuda a priorizar tu solicitud
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="contacto-rol" className={CLASE_ETIQUETA}>
              Tu rol
            </label>
            <select
              id="contacto-rol"
              className={CLASE_INPUT}
              defaultValue=""
              aria-invalid={errors.rol ? true : undefined}
              aria-describedby={errors.rol ? "contacto-rol-error" : undefined}
              {...register("rol")}
            >
              {/*
                Opción vacía primero: sin ella el navegador deja seleccionado el
                primer rol de la lista y el formulario mandaría "CTO" para todo
                el mundo. `value=""` no pasa el enum, así que zod pide elegir.
              */}
              <option value="" disabled>
                Selecciona tu rol
              </option>
              {ROLES.map((rol) => (
                <option key={rol.value} value={rol.value}>
                  {rol.label}
                </option>
              ))}
            </select>
            {errors.rol && (
              <p id="contacto-rol-error" className={CLASE_ERROR}>
                {errors.rol.message}
              </p>
            )}
          </div>

          {/*
            Grupo de radios en `<fieldset>` + `<legend>`: es lo que da al grupo
            un nombre accesible. Se le pone `role="radiogroup"` explícito porque
            `aria-invalid` sí está soportado ahí (en un `group` genérico no lo
            está), y `aria-labelledby` al legend para que el nombre no dependa
            de cómo cada lector resuelva el rol sobreescrito.

            El orden es el de `DESAFIOS` en `lib/leads.ts`, que a su vez espeja
            las tarjetas de la sección "¿Te suena?". No reordenar de un lado
            solo.
          */}
          <fieldset
            role="radiogroup"
            aria-labelledby="contacto-desafio-legend"
            aria-invalid={errors.desafio ? true : undefined}
            aria-describedby={errors.desafio ? "contacto-desafio-error" : undefined}
          >
            <legend id="contacto-desafio-legend" className={CLASE_ETIQUETA}>
              Tu principal desafío hoy
            </legend>

            <div className="space-y-2">
              {DESAFIOS.map((desafio) => (
                <label
                  key={desafio.value}
                  className="flex items-start gap-3 rounded-lg border border-line-strong bg-panel px-4 py-3 cursor-pointer has-[:checked]:border-brand-500 transition"
                >
                  <input
                    type="radio"
                    value={desafio.value}
                    className="mt-0.5 accent-brand-500"
                    {...register("desafio")}
                  />
                  <span className="text-sm text-fg leading-snug">
                    {desafio.label}
                  </span>
                </label>
              ))}
            </div>

            {errors.desafio && (
              <p id="contacto-desafio-error" className={CLASE_ERROR}>
                {errors.desafio.message}
              </p>
            )}
          </fieldset>

          {/*
            Honeypot anti-spam: fuera del flujo visual pero real en el DOM, para
            que los bots lo completen. No es `type="hidden"` a propósito —
            muchos bots ignoran los hidden. Invisible para lectores de pantalla
            y fuera del orden de tabulación, así ningún humano lo llena.

            El esquema lo acepta con cualquier valor: quien lo juzga es el
            endpoint. Validarlo acá haría que un gestor de contraseñas que
            rellene `website` deje el botón sin efecto y sin mensaje.
          */}
          <div
            aria-hidden="true"
            className="absolute w-px h-px overflow-hidden opacity-0 -left-[9999px] -top-[9999px]"
          >
            <label htmlFor="contacto-website">
              No completes este campo
            </label>
            <input
              id="contacto-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register(honeypotField)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-btn text-btn-fg px-8 py-3.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Enviando…" : cta.texto}
          </button>

          {/*
            Este texto tiene que describir lo que el código realmente hace: el
            envío se procesa vía Resend y llega a una casilla de correo. Decir
            "sin terceros" sería falso y reclamable.
          */}
          <p className="text-xs text-subtle">
            Usamos tus datos solo para responderte: no los vendemos ni te
            suscribimos a nada. El envío se procesa vía Resend.
          </p>
        </form>
      )}
    </div>
  );
}
