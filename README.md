# Sitio web — Daniela Chávez · Arquitectura de Datos

Landing page de la consultora: presenta servicios, proceso y portafolio, y captura leads con un formulario que llega por email. Es la **Fase 1** del proyecto (sitio web profesional en Vercel); las fases siguientes —agente de assessment, agente de propuestas— se apoyan sobre este mismo código.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Resend · deploy en Vercel.

---

## Requisitos

- **Node.js ≥ 20.9** (lo exige Next 16). `node -v` para verificar.
- npm (viene con Node).

## Arrancar en local

```bash
cd landingpage
npm install
cp .env.example .env.local     # en PowerShell: copy .env.example .env.local
npm run dev
```

Abrir http://localhost:3000.

El sitio **levanta sin configurar nada**: sin `RESEND_API_KEY` el formulario muestra un mensaje pidiendo escribir al email directo y sin `NEXT_PUBLIC_GA_ID` no se inyecta Analytics. Para probar el envío real de leads hay que completar las variables.

⚠️ **`NEXT_PUBLIC_CALENDLY_URL` es la excepción: no degrada.** Los CTA del hero y del nav apuntan siempre a `#contacto`; el fallback a `mailto` está dentro de `CalendlyEmbed`, que solo se monta **después** de enviar el formulario (y en `/thank-you`). Sin la variable, quien llega a la home no ve agenda ni alternativa hasta convertir — por eso es prerrequisito duro de despliegue y no degradación elegante.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con hot reload en http://localhost:3000 |
| `npm run build` | Build de producción — correrlo antes de dar por cerrada una tarea |
| `npm start` | Sirve el build de producción localmente (requiere `npm run build` antes) |
| `npm run lint` | ESLint (config de `eslint-config-next`) |
| `npm test` | Suite de tests con Vitest (74 tests, < 1 segundo) |
| `npm run test:watch` | Los mismos tests, reejecutándose al guardar |

## Variables de entorno

Se copian de `.env.example` a `.env.local`. **`.env.local` está fuera de git** (`.gitignore` ignora todo `.env*` menos `.env.example`).

| Variable | Para qué sirve | ¿Obligatoria? | ¿Secreta? |
|----------|----------------|---------------|-----------|
| `NEXT_PUBLIC_SITE_URL` | Dominio público del sitio, sin barra final. Se usa para canonical, Open Graph y structured data. Si falta, cae a un placeholder. | En producción sí | No (pública) |
| `RESEND_API_KEY` | API key de Resend para enviar el email del lead. Sin ella el formulario responde 503 con un mensaje que deriva al email. | Sí, para que el formulario funcione | **SÍ** |
| `CONTACTO_FROM` | Remitente verificado en Resend. Por defecto `onboarding@resend.dev` (sandbox, sirve para pruebas). | No | Sí (no exponer) |
| `CONTACTO_TO` | Casilla que recibe los leads. Por defecto, el email de `content/site.ts`. | No | **SÍ** |
| `NEXT_PUBLIC_CALENDLY_URL` | Link de la discovery call de 30 min. Vacío = **no hay agenda en ninguna parte del sitio**; el `mailto` de respaldo solo aparece post-envío. | **En producción sí** (prerrequisito duro) | No (pública) |
| `NEXT_PUBLIC_GA_ID` | ID de la property de Google Analytics 4. Vacío = no se carga el script. | No | No (pública) |

Convención del proyecto (`lib/env.ts`): **una variable definida pero vacía cuenta como ausente**, que es el caso típico de crearla en el panel de Vercel y dejarla en blanco. Y si `NEXT_PUBLIC_SITE_URL` no es una URL válida, se cae al valor por defecto en vez de tumbar el build.

> ⚠️ **Regla de secretos.** Solo las variables con prefijo `NEXT_PUBLIC_` llegan al navegador; el resto vive únicamente en el servidor. Nunca renombrar `RESEND_API_KEY` ni `CONTACTO_TO` con ese prefijo, nunca loguearlas y nunca commitear un `.env.local`. Si una key se filtra, se rota en Resend, no se "borra del historial".

---

## Estructura

```
landingpage/
├── app/
│   ├── layout.tsx            # nav, footer, fuente Inter, metadata global, GA4, JSON-LD
│   ├── page.tsx              # home: ordena las secciones del sitio
│   ├── globals.css           # Tailwind v4 + las DOS paletas (claro/oscuro) y el foco
│   ├── icon.svg              # favicon
│   ├── opengraph-image.tsx   # genera el PNG 1200x630 que se ve al compartir el link
│   ├── sitemap.ts            # genera /sitemap.xml
│   ├── robots.ts             # genera /robots.txt (apunta al sitemap)
│   └── api/contacto/route.ts # endpoint del formulario → Resend
├── components/               # Nav + CambiarTema, Hero, ProblemaSolucion, Servicios,
│                             # Proceso, Diferencial, Portafolio, StackTecnico,
│                             # Contacto + ContactoForm, Footer, Analytics, JsonLd
├── content/                  # ← contenido editable sin tocar markup (ver más abajo)
│   ├── site.ts               # nombre, logotipo, email, redes, links del menú
│   ├── hero.ts               # badge, titular, bajada y textos de los dos botones
│   ├── servicios.ts          # los 7 servicios con plazo y nivel de inversión
│   ├── proceso.ts            # los 5 pasos de "cómo trabajo"
│   ├── diferenciales.ts      # diferenciales + listas problema/solución
│   ├── repos.ts              # repos del portafolio
│   └── stack.ts              # tecnologías de la franja del home
├── lib/
│   ├── leads.ts              # contrato y validación del lead (Zod)
│   ├── email.ts              # armado y envío del email vía Resend
│   ├── env.ts                # lectura normalizada de variables de entorno
│   ├── rate-limit.ts         # límite de envíos por IP (anti-abuso del formulario)
│   └── seo.ts                # metadata de Next + structured data schema.org
└── public/                   # archivos estáticos — vacío a propósito: la imagen OG
                              # y el favicon se generan por código, no son archivos
```

### Modo claro y modo oscuro

El sitio tiene **dos paletas**, y las dos viven en `app/globals.css`:

| Modo | Paleta | Fondo | Acento |
|------|--------|-------|--------|
| Claro | Okavango (delta de Botswana) | papel `#FBFAF4` | pasto `#4F6B1C` |
| Oscuro | costa nocturna | navy `#101733` | menta `#8DD5CA` |

Cómo se elige el modo:

1. **Por defecto sigue al sistema operativo** (`prefers-color-scheme`). Sin JavaScript, sin parpadeo.
2. **El botón del nav** (☾ / ☀) lo fuerza a uno u otro y lo guarda en `localStorage`. Esa elección le gana al sistema.

**Regla que no hay que romper: ningún componente escribe un color literal.** Nada de `bg-white/5`, `text-black` ni `border-zinc-700` — todos asumen un fondo y se rompen al invertirlo. Todo pasa por los tokens semánticos, que cada modo redefine:

| Token | Para qué |
|-------|----------|
| `bg-base` · `bg-panel` · `bg-warm` | fondo de página · tarjetas · franjas cálidas |
| `text-fg` · `text-muted` · `text-subtle` | texto principal · secundario · pies y captions |
| `border-line` · `border-line-strong` | borde sutil · borde que identifica un control |
| `text-brand-400/500/600` | acento principal |
| `text-warmth` · `text-water` · `text-alt` | acentos secundarios (inversión · técnico · cuarto color) |
| `text-exito` · `text-error` | color semántico, independiente de la marca |
| `bg-btn` · `text-btn-fg` | botón primario (invierte el fondo en los dos modos) |

Los contrastes están medidos: **el par más ajustado es 3.35:1 en claro y 3.70:1 en oscuro**, ambos sobre el mínimo de 3:1 para bordes; todo el texto supera 4.5:1. Si cambiás un color, **volvé a medir** — el verde de la foto original (`#A9C566`) es precioso y sobre fondo claro da 1.9:1, ilegible.

> ⚠️ **Ojo con `app/opengraph-image.tsx`.** Se genera en build, fuera de Tailwind, y **no puede leer estos tokens**: tiene los colores copiados a mano. Si cambia la paleta, hay que cambiarlos ahí también. Usa siempre la nocturna, porque una imagen no puede tener dos modos.

### SEO y metadata

Está resuelto por código, sin archivos estáticos que mantener a mano:

- `lib/seo.ts` arma la metadata de Next (title, description, canonical, Open Graph, Twitter, robots) y el **structured data** de schema.org, derivándolo de `content/site.ts` y `content/servicios.ts`. Agregar un servicio lo agrega también al JSON-LD, sin tocar `lib/seo.ts`.
- `components/JsonLd.tsx` inyecta ese grafo en el HTML inicial, que es lo que lee el crawler.
- `app/opengraph-image.tsx` genera el PNG de 1200x630 en build; Next lo cablea solo como `og:image` y `twitter:image`.
- `app/sitemap.ts` (hoy con la home; el blog está comentado, listo para descomentar) y `app/robots.ts`, que apunta al sitemap con URL absoluta.

Las URLs de todo esto salen de `NEXT_PUBLIC_SITE_URL`: si la variable está mal, el sitemap y el canonical apuntan al dominio equivocado.

---

## Cómo editar el contenido del sitio (sin tocar código de diseño)

Esta sección es para cambiar **textos, servicios y proyectos** sin saber React.

La carpeta `content/` guarda lo que más se edita: el **hero** (lo primero que se ve), los **datos de contacto e identidad**, y las **listas repetibles** — servicios, proyectos del portafolio, pasos del proceso, diferenciales y tecnologías. Son archivos `.ts`, pero lo único que hay adentro son **fichas**: bloques entre llaves `{ }` con campos tipo `nombre:`, `descripcion:`, `plazo:`. El diseño (colores, tarjetas, animaciones) está en otro lado y se genera solo a partir de esas fichas. **Si editás únicamente el texto entre comillas, no podés romper el diseño.**

> **El sitio no publica cifras.** Por decisión comercial, cada servicio muestra el plazo y un nivel de inversión en palabras ("Inversión acotada / media / alta"), nunca el monto. Los rangos en CLP siguen estando en `Contexto/Empresa/catalogo_servicios.md`, que es la referencia interna para conversarlos en la llamada.

Lo que **no** está en `content/`: los **títulos de cada sección** (los grandes, tipo "Código real en GitHub." o "¿Tienes datos sin explotar?") y los **rótulos chicos en mayúsculas** de arriba de cada sección ("SERVICIOS", "PROCESO", "DIFERENCIAL"…). Esos viven dentro de los archivos de `components/`, mezclados con el markup. Se pueden cambiar, pero ahí ya conviene pedirle a Bastián que lo haga o que te muestre la línea exacta. Lo mismo con el texto de los niveles de inversión, que está en `components/Servicios.tsx`.

Tres reglas que evitan el 99% de los errores:

1. El texto siempre va **entre comillas dobles** `"así"`.
2. Cada línea termina con **coma**.
3. No borres ni agregues llaves `{ }` ni corchetes `[ ]` — copiá una ficha entera si querés una nueva.

### Ejemplo 1: cambiar el plazo y el nivel de inversión de un servicio

Archivo: `content/servicios.ts`

**Antes**

```ts
{
  slug: "finops",
  nombre: "FinOps",
  descripcion: "Visibilidad de costos cloud por equipo + optimización.",
  plazo: "4-6 semanas",
  inversion: "media",
},
```

**Después**

```ts
{
  slug: "finops",
  nombre: "FinOps",
  descripcion: "Visibilidad de costos cloud por equipo + optimización.",
  plazo: "3-5 semanas",
  inversion: "alta",
},
```

Guardás, y la tarjeta de FinOps en el sitio ya muestra los valores nuevos. El `slug` es el identificador interno: dejalo como está.

⚠️ `inversion` solo acepta **una de estas tres palabras**, escrita igual y entre comillas: `"acotada"`, `"media"` o `"alta"`. Cualquier otra cosa rompe el build (a propósito: es preferible a que la tarjeta salga con el dato en blanco).

### Ejemplo 2: agregar un proyecto al portafolio

Archivo: `content/repos.ts`. Copiá una ficha existente, pegala debajo y reemplazá los cuatro campos:

```ts
{
  nombre: "Customer 360",
  descripcion: "Vista unificada de cliente sobre Redshift",
  stack: "dbt · Redshift · Airflow",
  url: "https://github.com/Danichavez/customer-360",
},
```

La tarjeta nueva aparece sola en la grilla del portafolio, con el mismo estilo que las demás.

### Dónde está cada texto

| Quiero cambiar… | Archivo |
|-----------------|---------|
| El titular grande, la bajada, el badge "Disponible para nuevos proyectos" y el texto de los dos botones del inicio | `content/hero.ts` |
| Nombre, iniciales del logo, email, LinkedIn, GitHub, links del menú | `content/site.ts` |
| Los servicios (nombre, descripción, plazo, nivel de inversión) | `content/servicios.ts` |
| Los 5 pasos del proceso | `content/proceso.ts` |
| Los diferenciales y las listas "problema / solución" | `content/diferenciales.ts` |
| Los proyectos del portafolio | `content/repos.ts` |
| Las tecnologías de la franja | `content/stack.ts` |
| **Los títulos de cada sección** y los rótulos chicos en mayúsculas | `components/` — están dentro del markup; pedile ayuda a Bastián |

Un detalle del hero: el titular está partido en dos líneas, `titulo` y `tituloDestacado` — la segunda es la que sale con el degradado indigo→verde.

Para ver el cambio antes de publicarlo: `npm run dev` y abrir http://localhost:3000. Si algo se rompe, el error aparece en pantalla indicando el archivo y la línea — casi siempre es una comilla o una coma faltante.

---

## Formulario de contacto

Flujo completo:

```
components/Contacto.tsx      sección con el copy, Calendly/mailto y redes
   └─ ContactoForm.tsx       el formulario en sí (React Hook Form + zodResolver)
        │  POST JSON
        ▼
/api/contacto  (app/api/contacto/route.ts)
        │  1. corta si la IP ya envió demasiado (lib/rate-limit.ts)
        │  2. valida de nuevo contra lib/leads.ts (nunca se confía en el cliente)
        │  3. descarta bots con un campo trampa oculto (honeypot)
        │  4. normaliza el lead y le estampa la hora del servidor
        ▼
lib/email.ts → Resend → casilla de CONTACTO_TO
```

Detalles que importan:

- La validación está **una sola vez** en `lib/leads.ts` y la usan cliente y servidor.
- **Rate limiting: 5 envíos por IP cada 10 minutos** (`lib/rate-limit.ts`). Pasado el límite, el endpoint responde `429` con un mensaje que pide esperar unos minutos. Existe porque cada request gasta un envío de Resend y el free tier son ~100 al día: sin freno, un bot agota la cuota y **los leads legítimos se pierden en silencio**. El contador corre *antes* de leer el body, así que mandar basura tampoco sale gratis. Es un contador **en memoria**: en Vercel vive por instancia de función y se reinicia en cada deploy — frena el abuso repetitivo desde un origen, no es un límite distribuido. Si algún día hace falta, se reemplaza por un contador compartido (Upstash Redis, free tier) manteniendo la misma función `consumir()`.
- `ContactoForm` es el único Client Component del flujo; `Contacto` es Server Component. Maneja los estados de envío: botón deshabilitado con "Enviando…" mientras postea, mensaje de éxito con opción de "Enviar otro mensaje", y errores —tanto por campo como generales— anunciados a lectores de pantalla vía `aria-live`. Ante un error, lo que la persona escribió **no se pierde**.
- El email del lead va en `Reply-To`, así que se responde directo desde la bandeja.
- Si `RESEND_API_KEY` no está configurada, el endpoint devuelve 503 con un mensaje que invita a escribir al email público. No revienta ni pierde silenciosamente el lead.
- Los errores del proveedor quedan en los logs del servidor; al visitante solo le llega un mensaje genérico.

**Preparado para la Fase 2.** El contrato de `lib/leads.ts` tiene un campo `tipo` que hoy vale siempre `"contacto"`. Cuando llegue el agente de assessment, se agrega un `leadAssessmentSchema` como segunda variante de la unión discriminada y se cuelga del mismo endpoint: no hay que rediseñar el formulario ni el envío de email.

---

## Deploy

**El sitio está en producción**: `https://arqdata.cl` — dominio definitivo, registrado en NIC Chile y con DNS en Cloudflare (2026-08-01). `codebass.org` fue el dominio puente y **debe redirigir con 308 hacia el nuevo**, no seguir sirviendo el sitio.

- Hosting: **Vercel** (free tier), conectado al repo `github.com/Danichavez/consultora-web`.
- **Push a `main` = producción.** Cualquier otra rama genera un deploy de preview con su propia URL.
- **El apex `arqdata.cl` es el dominio canónico** y `www.arqdata.cl` redirige a él con un 308 permanente (Vercel → Settings → Domains; el desplegable ofrece 307 por defecto). Tiene que coincidir con `NEXT_PUBLIC_SITE_URL`: de esa variable salen el canonical, `og:url`, el sitemap y el robots, así que si apuntan al dominio que redirige, **todas las URLs que publicamos redirigen**.
- ⚠️ **`NEXT_PUBLIC_SITE_URL` se hornea en el build.** Cambiarla en el panel de Vercel no hace nada hasta que haya un deploy nuevo. Ya pasó una vez: el sitio se sirvió en `arqdata.cl` emitiendo `canonical: https://codebass.org` durante horas. Verificar siempre contra el HTML en vivo (`curl -s https://arqdata.cl | grep canonical`), nunca contra el panel.
- Las variables de entorno **no se heredan del `.env.local`**: hay que cargarlas también en Vercel (Project → Settings → Environment Variables). Después de agregarlas hay que redeployar para que tomen efecto.
- **DNS en el panel de Vercel** (`arqdata.cl` está delegado a `ns1/ns2.vercel-dns.com`). Todos los registros —los de Vercel, los de Resend y los MX del reenvío de correo— se cargan ahí. **Cloudflare NO es el proveedor de DNS de este dominio**: aparece solo como destino de los MX (Email Routing), así que la vieja precaución de la "nube gris" no aplica acá.
- Antes de pushear: `npm run build` y `npm run lint` en verde.

---

## Tests

```bash
npm test
```

74 tests con **Vitest**, corren en menos de un segundo y no necesitan navegador ni red.

**Qué se testea y por qué ese recorte.** No se testea el sitio: las 8 secciones solo hacen `.map()` sobre `content/`, y verificar eso sería comprobar que React recorre un array. Lo que sí tiene tests es la lógica donde algo puede romperse **en silencio** — y el criterio para elegirla fue mirar los bugs que este proyecto ya tuvo de verdad:

| Archivo | Qué protege |
|---------|-------------|
| `lib/leads.test.ts` | Que el esquema **acepte** el honeypot. Cuando lo rechazaba, un gestor de contraseñas rellenando el campo oculto dejaba el botón "Enviar" sin hacer nada, para siempre y sin mensaje. El build y Lighthouse 100/100 pasaban igual |
| `lib/env.test.ts` | Que una variable de entorno **definida pero vacía** cuente como ausente. Es el caso típico de Vercel y ya rompió cosas lejos del origen |
| `lib/rate-limit.test.ts` | La ventana de 5/10 min, la poda del mapa y el agrupado de IPv6 por /64 (sin eso, rotar de dirección evade el límite) |
| `lib/email.test.ts` | El escapado del HTML del email y que el asunto no admita saltos de línea (inyección de headers SMTP) |
| `app/api/contacto/route.test.ts` | El endpoint completo con el envío mockeado: JSON roto, array como body, honeypot, origen cruzado, tamaño, rate limit, 200/503/502 |

**La suite está verificada por mutación**, no solo por estar en verde: se rompió a propósito cada uno de los arreglos que dice proteger y se confirmó que la suite falla. Un test que pasa siempre no sirve de nada.

**Lo que los tests NO cubren** y sigue necesitando ojo humano: que el email llegue de verdad, la paridad visual con la maqueta, Lighthouse, el móvil real, y que Calendly agende.

---

## Pendientes que bloquean el lanzamiento

**Ya resuelto:** dominio definitivo (`arqdata.cl`), repo y deploy en Vercel, GA4 midiendo, **Resend enviando** y **el formulario entregando punta a punta**.

> 🛑 **Dos cosas que NO son pendientes y se reabrieron por error varias veces:**
> 1. **Resend está listo.** Envía y los correos llegan. No proponer verificar dominios ni tocar `CONTACTO_FROM`.
> 2. **`codebass.org` NO debe redirigir.** Sirve el sitio en paralelo **a propósito**: es una réplica que nadie visita.

Estado verificado contra producción el **2026-08-11** (contra el DNS y el HTML en vivo, no contra esta doc):

- [x] ✅ **`NEXT_PUBLIC_SITE_URL` apunta a `arqdata.cl`** — `canonical` en vivo = `https://arqdata.cl`. *(Queda alinear el fallback de `content/site.ts`.)*
- [x] ✅ **`NEXT_PUBLIC_CALENDLY_URL` seteada y funcionando** en los dos proyectos Vercel (verificado el 2026-08-09 contra `/thank-you` en vivo: el iframe se sirve con `embed_type=Inline` y sin bloque de fallback).

  ⚠️ **No se verifica grepeando la home**: `site.calendly` lo consume solo `CalendlyEmbed`, que se monta en `Confirmacion` (post-envío) y en `/thank-you`. Un `grep calendly` a la home da 0 aunque la variable esté perfecta — ese falso negativo estuvo tres documentos y ocho días. **El comando correcto es `curl https://<dominio>/thank-you | grep calendly`.**
- [x] ✅ **Resend enviando desde el dominio propio** — DNS completo y verificado: SPF `include:amazonses.com` en `send.arqdata.cl`, MX de bounces a `feedback-smtp.sa-east-1.amazonses.com`, DKIM en `resend._domainkey.arqdata.cl`, DMARC `p=none`, apex con el SPF de Cloudflare intacto.
  ℹ️ Las dos trampas que se temían **no ocurrieron**: Resend pone SPF y MX en el subdominio `send.` por su cuenta, así que el apex nunca tuvo que fusionar SPF ni recibió un MX que secuestrara el correo entrante de Cloudflare Email Routing.
- [x] ✅ **Formulario probado punta a punta en producción** — los correos llegan (2026-08-09).
- [x] ✅ **El fix `5399f46` está en producción** — entró por el PR #5; el HTML en vivo emite `theme-color` por esquema y `color-scheme: light dark`. El fix del oscurecido forzado de Samsung Internet está desplegado.

Decisiones que no dependen del código:

- [x] **Email público del sitio** — ✅ **`contacto@arqdata.cl` desde el 2026-08-09** (`content/site.ts`), en reemplazo del `@gmail` personal de Daniela. Reciben `contacto@`, `dev@`, `daniela.chavez@` y `bastian.rodriguez@` vía Cloudflare Email Routing. Una cosa sigue en pie: **son reenvíos, no casillas** — no pueden *enviar* sin relay SMTP, así que responder *como* `contacto@` requiere configurar "Send mail as" en Gmail. *(Lo de "que reciban no implica que Resend pueda enviarles" quedó obsoleto: Resend está verificado y entrega.)*

Pendientes técnicos conocidos:

- [ ] **Calendly como link, no como embed** — el plan original pedía el widget inline.
- [ ] **Blog en MDX** — planificado, **no implementado**: no existen `app/blog/` ni `content/blog/`. La base ya está preparada: `lib/seo.ts` tiene la plantilla de títulos y `app/sitemap.ts` tiene la ruta `/blog` comentada, lista para descomentar.
- [ ] **CI** — la suite existe pero nada la corre automáticamente. Falta un workflow de GitHub Actions con `tsc` + `lint` + `test` + `build` en cada push y PR; sin eso los tests se dejan de correr en dos semanas.
