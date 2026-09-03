import type { Metadata } from "next";

import { site } from "@/content/site";

/**
 * Política de privacidad.
 *
 * ⚠️ Regla que este proyecto ya aprendió a los golpes: **este texto tiene que
 * describir lo que el código realmente hace.** La versión anterior del
 * formulario prometía "sin terceros" mientras mandaba los datos a Resend y
 * cargaba GA4 en la misma página — una afirmación falsa y reclamable.
 *
 * Si cambia el flujo de datos (se agrega una base de datos, se suma un
 * proveedor, se cambia de proveedor de email), **hay que actualizar esta página
 * en el mismo commit.** Cada afirmación de abajo es verificable contra el
 * código:
 *
 *   - campos del formulario corto → `lib/leads.ts` (leadContactoSchema, 4)
 *   - campos del formulario largo → `lib/leads.ts` (leadAssessmentSchema, 15)
 *   - envío por email        → `lib/email.ts` (Resend)
 *   - modelo de lenguaje     → `lib/assessment/cliente.ts` (Anthropic) y
 *                              `lib/assessment/prompt.ts` (QUÉ se le manda)
 *   - ausencia de base de datos → no hay cliente de DB en el proyecto
 *   - analítica              → `components/Analytics.tsx` (GA4, condicional)
 *   - agenda                 → `components/CalendlyEmbed.tsx` (condicional)
 *   - dirección IP           → `lib/rate-limit.ts` (en memoria, agrupada /64)
 *
 * 🛑 **Esta advertencia ya falló una vez, y saberlo importa más que la
 * advertencia.** Estaba escrita acá y en otros dos archivos, las tres diciendo
 * "en el mismo commit"; el paso 7 conectó la API de Claude el 2026-08-29 y
 * ninguno de los tres se leyó. La página estuvo cuatro días diciendo
 * "recolectamos exactamente cuatro datos" mientras `/assessment` recolectaba
 * quince y mandaba parte de eso a un tercero no declarado. **Un recordatorio en
 * un comentario no es un control: solo funciona si alguien lo lee en el momento
 * exacto.** Si volvés a sumar un proveedor, lo que hay que dejar no es otro
 * comentario — es algo que falle solo.
 */

export const metadata: Metadata = {
  title: `Política de privacidad — ${site.nombre}`,
  description:
    "Qué datos recolectamos en este sitio, con qué finalidad, quiénes los procesan y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

/** Última revisión del texto. Estático a propósito: es un dato editorial. */
const ULTIMA_ACTUALIZACION = "2 de septiembre de 2026";

export default function Privacidad() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-fg">
        Política de privacidad
      </h1>
      <p className="mt-3 font-mono text-xs text-subtle">
        Última actualización: {ULTIMA_ACTUALIZACION}
      </p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-lg font-medium text-fg">Quiénes somos</h2>
          <p className="mt-3">
            {site.nombre} es una consultora de arquitectura de datos y
            automatización en AWS, con domicilio en {site.ciudad}. Somos
            responsables del tratamiento de los datos que se describen acá.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-fg">Qué datos recolectamos</h2>
          <p className="mt-3">
            Depende de cuál de los dos formularios completes.
          </p>
          <p className="mt-4">
            <strong className="text-fg">
              El formulario de contacto de la portada
            </strong>{" "}
            pide exactamente cuatro datos, y ninguno más:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Tu nombre</li>
            <li>Tu correo electrónico</li>
            <li>Tu rol en la empresa</li>
            <li>El principal desafío que seleccionaste</li>
          </ul>
          <p className="mt-4">
            <strong className="text-fg">
              El formulario de diagnóstico
            </strong>{" "}
            es más largo: son quince campos, cuatro de ellos opcionales. Además
            de tu nombre y tu correo, pide{" "}
            <strong className="text-fg">el nombre de tu empresa</strong> y
            respuestas sobre su situación con datos: qué problema querés
            resolver, cómo lo resuelven hoy y quién lo hace, de dónde salen los
            datos, si hay equipo dedicado y de qué tamaño, qué nube usan, qué
            tan urgente es, si hay presupuesto, cuántas horas consume el
            proceso, quién impulsa el proyecto, si están evaluando cambiar de
            sistema y qué sistemas usan hoy.
          </p>
          <p className="mt-3">
            Ninguno de los dos pide teléfono, dirección ni RUT. No usamos
            cookies de publicidad ni de perfilamiento, y no compramos ni
            enriquecemos estos datos con fuentes externas.
          </p>
          <p className="mt-3">
            Además, para evitar el abuso automatizado del formulario, nuestro
            servidor cuenta temporalmente las solicitudes por dirección IP. Ese
            conteo vive en la memoria del proceso, se agrupa por rango en lugar
            de guardar la dirección exacta, y se borra solo a los pocos minutos.
            No queda registrado junto a tu mensaje ni se usa para identificarte.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-fg">Para qué los usamos</h2>
          <p className="mt-3">
            Únicamente para responderte y coordinar una conversación. No te
            suscribimos a ninguna lista, no te enviamos newsletter y no
            vendemos, cedemos ni compartimos tus datos con terceros para fines
            comerciales.
          </p>
          <p className="mt-3">
            Si completaste el formulario de diagnóstico, además usamos tus
            respuestas para preparar un análisis preliminar de tu situación, que
            leemos antes de la conversación para no gastarla preguntándote lo
            básico. Ese análisis lo genera un modelo de lenguaje a partir de lo
            que escribiste (ver más abajo), es de uso interno y no se publica ni
            se envía automáticamente a nadie.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-fg">
            Quiénes más los procesan
          </h2>
          <p className="mt-3">
            No tenemos base de datos: tu mensaje se convierte en un correo y
            queda en nuestra casilla. Para que eso funcione intervienen estos
            proveedores, todos fuera de Chile:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-fg">Resend</strong> — entrega el correo
              con tus respuestas a nuestra casilla.
            </li>
            <li>
              <strong className="text-fg">Vercel</strong> — aloja el sitio y
              procesa la solicitud del formulario.
            </li>
            <li>
              <strong className="text-fg">Google Analytics 4</strong> — mide el
              uso del sitio de forma agregada. Recolecta datos de navegación,
              no el contenido del formulario.
            </li>
            <li>
              <strong className="text-fg">Calendly</strong> — si agendás una
              conversación, los datos de esa reserva los procesa Calendly bajo
              su propia política.
            </li>
            <li>
              <strong className="text-fg">Anthropic</strong> — solo si
              completaste el formulario de diagnóstico. Sus modelos procesan tus
              respuestas para generar el análisis preliminar que leemos antes de
              la reunión.{" "}
              <strong className="text-fg">
                No le enviamos tu nombre ni tu correo electrónico
              </strong>
              : viajan el nombre de tu empresa y lo que contaste sobre su
              situación con datos, no tus datos de contacto.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-fg">Cuánto los conservamos</h2>
          <p className="mt-3">
            Conservamos los correos de contacto mientras exista una conversación
            comercial en curso o razonablemente previsible. Podés pedirnos que
            los borremos en cualquier momento y lo hacemos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-fg">Tus derechos</h2>
          <p className="mt-3">
            Conforme a la Ley 19.628 y a la Ley 21.719 de protección de datos
            personales, podés pedirnos acceder a tus datos, corregirlos,
            eliminarlos u oponerte a su tratamiento. Escribinos a{" "}
            <a
              href={`mailto:${site.email}`}
              className="text-brand-500 underline underline-offset-4 hover:text-brand-600"
            >
              {site.email}
            </a>{" "}
            y respondemos dentro de los plazos legales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-fg">Cambios</h2>
          <p className="mt-3">
            Si cambiamos cómo tratamos los datos, actualizamos esta página y la
            fecha de arriba.
          </p>
        </section>
      </div>
    </div>
  );
}
