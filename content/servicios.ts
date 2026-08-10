/**
 * Catálogo de servicios. Alineado con Contexto/Empresa/catalogo_servicios.md.
 * Editar un servicio = editar un objeto de este array; el markup no se toca.
 */

/**
 * Nivel de inversión del servicio. Decisión comercial (2026-07-27): el sitio
 * **no publica cifras** — se comunica la magnitud relativa y el monto se
 * conversa en la llamada. Los rangos en CLP siguen en
 * `Contexto/Empresa/catalogo_servicios.md`, que es la fuente de verdad interna.
 *
 * Es un token semántico, no una clase ni una etiqueta: el texto visible se
 * mapea en `components/Servicios.tsx`. Agregar un nivel rompe el build en el
 * componente, que es exactamente lo que queremos (en vez de renderizar vacío).
 */
export type NivelInversion = "acotada" | "media" | "alta";

export interface Servicio {
  /** Identificador estable, usado como key de React. */
  slug: string;
  nombre: string;
  /**
   * ⚠️ Se emite tal cual en el JSON-LD público (`lib/seo.ts`, dentro de
   * `itemOffered` del `OfferCatalog`), aunque hoy ninguna página lo muestre.
   * O sea: **es texto indexable por Google**, y le aplica la misma regla que a
   * `inversion` — sin cifras, ni de nuestros precios ni de los ajenos.
   */
  descripcion: string;
  plazo: string;
  inversion: NivelInversion;
  /** Se renderiza en la tarjeta ancha destacada, no en la grilla. */
  destacado?: boolean;
}

/**
 * `as const satisfies` y no `: Servicio[]`, que es lo que había antes.
 *
 * La anotación normal ensancha cada `slug` a `string`, y con eso
 * `(typeof servicios)[number]["slug"]` colapsa a `string`: el enum de servicios
 * de la Fase 2 —el que restringe qué puede elegir el modelo— tendría que
 * escribirse a mano y **agregar un servicio dejaría de propagarse solo**, que
 * es la propiedad por la que este archivo existe.
 *
 * `as const` preserva los literales; `satisfies` mantiene el chequeo contra la
 * interface, así que un servicio al que le falte `plazo` o traiga un `inversion`
 * inventado sigue rompiendo el build acá y no más adelante.
 */
export const servicios = [
  {
    slug: "assessment",
    nombre: "Assessment de Datos",
    descripcion: "Diagnóstico de madurez + quick-wins + roadmap priorizado.",
    plazo: "2 semanas",
    inversion: "acotada",
  },
  {
    slug: "quick-win",
    nombre: "Quick Win",
    descripcion: "3 mejoras rápidas: seguridad, calidad o automatización.",
    plazo: "3-4 semanas",
    inversion: "acotada",
  },
  {
    slug: "pipeline-productivo",
    nombre: "Pipeline Productivo",
    descripcion: "ETL/ELT end-to-end en AWS con calidad y CI/CD.",
    plazo: "8-12 semanas",
    inversion: "alta",
  },
  {
    slug: "data-governance",
    nombre: "Data Governance",
    descripcion: "Contracts, calidad, catálogo, ownership — sin suites enterprise.",
    plazo: "6-8 semanas",
    inversion: "alta",
  },
  {
    slug: "business-intelligence",
    nombre: "Business Intelligence",
    descripcion: "Modelo dimensional + dashboards + KPIs + alertas.",
    plazo: "6-10 semanas",
    inversion: "alta",
  },
  {
    slug: "finops",
    nombre: "FinOps",
    descripcion: "Visibilidad de costos cloud por equipo + optimización.",
    plazo: "4-6 semanas",
    inversion: "media",
  },
  {
    slug: "ia-agentica",
    nombre: "IA Agéntica",
    descripcion:
      "Agentes inteligentes sobre tus datos: alertas contextuales, reportes automáticos, chatbot de datos con aprendizaje continuo.",
    plazo: "4-6 semanas",
    inversion: "media",
    destacado: true,
  },
] as const satisfies readonly Servicio[];

/**
 * Los slugs del catálogo como unión de literales, derivada del array.
 *
 * Es el tipo que ata las tres piezas de la Fase 2 a esta única fuente: el enum
 * del esquema de salida del modelo, las claves de `catalogo-interno.ts` y el
 * catálogo que se inyecta en el prompt. Agregar un servicio acá **rompe el
 * build** en el catálogo interno hasta que se le asigne un rango — que es el
 * modo de falla correcto, en vez de un `undefined` renderizado como hueco.
 */
export type SlugServicio = (typeof servicios)[number]["slug"];

/**
 * Los mismos slugs en runtime, con la forma que pide `z.enum()`: una tupla no
 * vacía. La aserción es necesaria porque `.map()` devuelve un array común y
 * zod exige al menos un elemento en el tipo; el array literal de arriba
 * garantiza que nunca está vacío.
 */
export const slugsServicios = servicios.map((s) => s.slug) as [
  SlugServicio,
  ...SlugServicio[],
];
