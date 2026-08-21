/**
 * Configuración global del sitio: identidad, contacto y CTA.
 * Fuente de verdad única — nada de datos de contacto repetidos en componentes.
 */

import { env, envUrl } from "@/lib/env";

/**
 * URL pública del sitio. Se toma de la env var que Vercel inyecta; el fallback
 * es `arqdata.cl`, el dominio definitivo de la consultora (2026-08-01).
 *
 * ⚠️ Tiene que ser **el dominio que Vercel sirve sin redirigir** (el apex;
 * `www` redirige a él con 308). De esta variable salen canonical, `og:url`,
 * `sitemap.xml` y `robots.txt`: si declara un dominio que redirige, el 100% de
 * las URLs canónicas que publicamos son un 308. Verificar contra el sitio en
 * vivo, no contra el `.env`.
 *
 * ⚠️ Es `NEXT_PUBLIC_`, o sea que se **hornea en el build**: cambiarla en el
 * panel de Vercel no surte efecto hasta que haya un deploy nuevo. Este fallback
 * solo cubre el caso de que la variable falte.
 *
 * Historia: el sitio nació en `codebass.org` (dominio puente de Bastián). Ese
 * dominio dejó de ser canónico y debe redirigir con 308 hacia `arqdata.cl`.
 */
export const siteUrl = envUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
  "https://arqdata.cl",
);

export const site = {
  /**
   * La marca del sitio es la consultora, no una persona (decisión 2026-07-31).
   * El JSON-LD acompaña: `Organization`, no `Person`.
   */
  nombre: "ArqData",
  rol: "Arquitectura de Datos en la Nube",
  /** Se renderiza como texto en el nav y en la imagen Open Graph. */
  logotipo: "ArqData",
  titulo: "ArqData — Arquitectura de Datos en la Nube · Chile",
  descripcion:
    "Eliminamos los procesos manuales de datos que le cuestan a tu empresa miles de horas al año. Diagnóstico en 2 semanas, implementación en tu propia cuenta cloud. Empresas medianas en Chile.",
  descripcionCorta:
    "Arquitectura de datos y automatización en la nube para empresas medianas en Chile.",
  /**
   * Correo público de la consultora. Pasó del `@gmail` personal de Daniela a la
   * dirección de marca el 2026-08-09, cuando ella confirmó que `contacto@`,
   * `dev@`, `daniela.chavez@` y `bastian.rodriguez@` reciben.
   *
   * ⚠️ **Es reenvío (Cloudflare Email Routing), no casilla.** Solo funcionan
   * las direcciones con una regla de routing creada, así que este valor no se
   * cambia por otra `@arqdata.cl` sin haberle enviado un correo de prueba y
   * haberlo recibido: alimenta tres `mailto:` y dos campos del JSON-LD, y un
   * `mailto:` roto es peor que ninguno.
   *
   * ⚠️ **Que reciba no implica que Resend pueda enviarle.** Mientras la cuenta
   * siga en sandbox, `CONTACTO_TO` compara contra el dueño literal de la
   * cuenta y el ruteo del receptor le es invisible — este valor y esa env var
   * son cosas distintas y pueden divergir sin que nada avise.
   */
  email: "contacto@arqdata.cl",
  ciudad: "Santiago, Chile",
  locale: "es_CL",
  lang: "es-CL",
  linkedin: "https://linkedin.com/in/daniela-chavez-data",
  github: "https://github.com/Danichavez",
  /**
   * Link de la conversación de diagnóstico de 30 min.
   *
   * ⚠️ Dejó de ser una degradación aceptable. En un sitio de 8 secciones, no
   * tener agenda era tolerable; en una página cuyo único trabajo es que alguien
   * agende, es la falla completa y silenciosa. Es prerrequisito duro de
   * despliegue: `/devops` la verifica en Vercel.
   *
   * Y **no hay red debajo**: el fallback a `mailto` está en `CalendlyEmbed`,
   * que solo se monta dentro de `Confirmacion` (post-envío) y en `/thank-you`.
   * Los CTA del hero y del nav apuntan siempre a `#contacto`, con o sin este
   * valor, así que con la variable vacía la home no ofrece **ninguna**
   * alternativa hasta después de convertir.
   */
  calendly: env(process.env.NEXT_PUBLIC_CALENDLY_URL) ?? "",
} as const;

/**
 * El texto del único CTA de la página. Se repite en el nav, el hero, debajo del
 * caso y en el formulario — vive acá para que no se desincronicen.
 */
export const cta = {
  texto: "Agendar Conversación",
  /** Variante larga, solo para el botón del hero. */
  textoLargo: "Agendar conversación — 30 min, sin compromiso",
  destino: "#contacto",
} as const;

/**
 * La landing no tiene navegación: cualquier link que saque a la persona de la
 * página compite con el CTA. Se deja el array (vacío) en vez de borrar el tipo
 * porque `Nav.tsx` y el footer lo consumen y así el cambio es de datos, no de
 * markup.
 */
export interface NavLink {
  href: string;
  label: string;
}

export const navLinks: NavLink[] = [];
