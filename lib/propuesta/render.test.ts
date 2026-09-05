import { describe, expect, it } from "vitest";

import { GARANTIA, SUPUESTOS_BASE } from "@/content/propuesta";
import type { EntradaPropuestaNormalizada } from "@/lib/propuesta/entrada";
import type { SalidaPropuesta } from "@/lib/propuesta/esquema";
import { renderPropuesta } from "@/lib/propuesta/render";

/**
 * El golden test del entregable de la Fase 3.
 *
 * Congela la propuesta completa, así que cualquier cambio en el renderer
 * aparece como diff en la revisión en vez de descubrirse cuando Daniela manda
 * algo raro a un cliente. Si el diff es intencional se actualiza el snapshot;
 * si no, es el bug.
 *
 * ⚠️ **El valor está en LEER el `.snap`, no en que pase en verde.** En la Fase 2
 * este mismo test encontró dos defectos de copy que ningún assert habría
 * encontrado (`"[por confirmar en discovery] al año"` colgando, y `"declarado"`
 * dos veces). Acá el documento va al cliente: el snapshot se lee entero, como lo
 * leería un gerente que está por firmar.
 */

function entrada(
  cambios: Partial<EntradaPropuestaNormalizada> = {},
): EntradaPropuestaNormalizada {
  return {
    empresa: "RetailCo SpA",
    notas: "Notas de discovery del 3 de septiembre.",
    preparadaEn: "2026-09-03T12:00:00.000Z",
    ...cambios,
  };
}

function salida(cambios: Partial<SalidaPropuesta> = {}): SalidaPropuesta {
  return {
    contexto: {
      necesidad:
        "RetailCo necesita una visión única de sus ventas para decidir sobre campañas y stock antes de Black Friday.",
      situacionActual:
        "Hoy Shopify se exporta a mano cada lunes, cada analista saca su propio reporte de Google Ads y el Excel del gerente comercial es la referencia que nadie valida.",
    },
    solucion: {
      descripcion:
        "Construimos una plataforma de datos en la cuenta AWS de RetailCo que consolida Shopify, Google Ads y el CRM en un modelo dimensional único, con dashboards de gestión sobre esa fuente.",
      flujo: [
        { nombre: "Extracción", detalle: "Shopify, Google Ads y PostgreSQL." },
        { nombre: "Transformación", detalle: "Modelo dimensional con tests de calidad." },
        { nombre: "Almacenamiento", detalle: "Redshift en la cuenta del cliente." },
        { nombre: "Consumo", detalle: "Dashboards ejecutivos y alertas." },
      ],
      componentes: [
        {
          componente: "Ingesta",
          tecnologia: "AWS Glue",
          funcion: "Carga incremental desde las APIs de Shopify y Google Ads.",
        },
        {
          componente: "Transformación",
          tecnologia: "dbt",
          funcion: "Modelo dimensional, tests de calidad y documentación.",
        },
        {
          componente: "Consumo",
          tecnologia: "QuickSight",
          funcion: "Dashboards de venta y campañas para gerencia.",
        },
      ],
    },
    alcance: {
      incluido: [
        {
          entregable: "Diseño de arquitectura",
          descripcion: "Diagrama, ADRs y modelo de datos validado con el equipo.",
          semanaInicio: 1,
          semanaFin: 2,
        },
        {
          entregable: "Implementación del pipeline",
          descripcion: "Código productivo en la cuenta AWS de RetailCo.",
          semanaInicio: 3,
          semanaFin: 6,
        },
        {
          entregable: "Tests y validaciones",
          descripcion: "Calidad de datos y CI/CD.",
          semanaInicio: 7,
          semanaFin: 7,
        },
        {
          entregable: "Documentación y capacitación",
          descripcion: "Runbook, reglas de negocio y dos sesiones con el equipo.",
          semanaInicio: 8,
          semanaFin: 8,
        },
      ],
      fueraDeAlcance: [
        "Migración de datos históricos anteriores a 2024.",
        "Desarrollo de dashboards fuera de los tres acordados.",
      ],
    },
    equipo: [
      { rol: "Data Architect (líder)", dedicacionHorasSemana: 20 },
      { rol: "Ingeniero de plataforma", dedicacionHorasSemana: 10 },
    ],
    inversion: {
      servicio: "business-intelligence",
      posicion: "medio",
      justificacion:
        "Tres fuentes con APIs estables y un consumidor claro, pero sin equipo interno que opere lo entregado después de la puesta en marcha.",
      presupuestoDeclarado: '"Tenemos entre 10 y 20 millones para esto"',
    },
    supuestos: [
      "Las APIs de Shopify y Google Ads se mantienen disponibles con los permisos actuales.",
    ],
    faltantes: [
      "Confirmar el volumen diario de la tabla de ventas.",
      "Confirmar quién es el dueño del dato de clientes.",
    ],
    plazoLimiteCliente: "Black Friday, noviembre 2026",
    ...cambios,
  };
}

describe("renderPropuesta — golden", () => {
  it("congela el documento completo", () => {
    expect(renderPropuesta(entrada(), salida())).toMatchSnapshot();
  });
});

describe("renderPropuesta — las reglas que no pueden romperse", () => {
  const doc = renderPropuesta(entrada(), salida());

  /**
   * ADR-005: la firma es el acto de aprobación. Un documento firmado que Daniela
   * no leyó es un compromiso comercial que nadie revisó — y acá el compromiso es
   * la oferta misma.
   */
  it("sale como borrador y sin firma", () => {
    expect(doc.startsWith("BORRADOR — pendiente de revisión y firma")).toBe(true);
    expect(doc).not.toContain("Daniela Chávez — Data Architect\n");
    expect(doc).toContain("Firma pendiente");
  });

  it("marca lo que falta en vez de rellenarlo", () => {
    expect(doc).toContain("[FALTA: Confirmar el volumen diario de la tabla de ventas.]");
    // El costo de infraestructura nunca se inventa: depende de la arquitectura
    // definitiva, que es justo lo que todavía no se sabe.
    expect(doc).toMatch(/Costo mensual estimado: \[FALTA:/);
  });

  it("imprime la garantía y los supuestos base literales, no generados", () => {
    for (const linea of GARANTIA) expect(doc).toContain(linea);
    for (const supuesto of SUPUESTOS_BASE) expect(doc).toContain(supuesto);
  });

  /**
   * 🛑 El §2 exige nombrar tecnologías — exactamente lo que el pre-diagnóstico
   * tiene prohibido. Si alguien "arregla" el prompt copiando las reglas de la
   * Fase 2, este test cae.
   */
  it("nombra las tecnologías de la solución", () => {
    expect(doc).toContain("AWS Glue");
    expect(doc).toContain("dbt");
    expect(doc).toContain("QuickSight");
  });

  it("el timeline y la forma de pago se derivan del alcance", () => {
    // La última semana de la tabla de entregables es 8: tiene que aparecer como
    // duración total y como fecha del segundo hito, sin que nadie las escriba
    // dos veces. La fila completa y no un `toContain("Semana 8")`, que también
    // acierta con el timeline y por lo tanto no probaría nada.
    expect(doc).toContain("**Duración total**: 8 semanas");
    expect(doc).toContain("| Entrega final | 50% | $12.500.000 | Semana 8 |");
  });

  /**
   * Regresión del defecto que encontró el golden al leerlo: un `""` entre los
   * faltantes del modelo y el de infraestructura partía la lista en dos, y el
   * ítem que hay que completar sí o sí quedaba visualmente suelto.
   */
  it("la lista de faltantes no queda partida en dos", () => {
    const bloque = doc.slice(doc.indexOf("## Qué falta confirmar"));
    const items = bloque.split("\n").filter((l) => l.startsWith("- [FALTA:"));
    expect(items).toHaveLength(3);
    // Contiguas: entre la primera y la última no hay ninguna línea vacía.
    const lineas = bloque.split("\n");
    const primera = lineas.findIndex((l) => l.startsWith("- [FALTA:"));
    const ultima = lineas.findLastIndex((l) => l.startsWith("- [FALTA:"));
    expect(lineas.slice(primera, ultima + 1).some((l) => l === "")).toBe(false);
  });

  it("cotiza con pesos exactos y no con millones abreviados", () => {
    // business-intelligence medio = (15M + 35M) / 2 = 25M
    expect(doc).toContain("$25.000.000");
    expect(doc).toContain("$12.500.000");
  });

  it("omite el plazo del cliente cuando las notas no lo traen", () => {
    const sinPlazo = renderPropuesta(
      entrada(),
      salida({ plazoLimiteCliente: null }),
    );
    expect(sinPlazo).not.toContain("Plazo indicado por el cliente");
  });

  it("deja constancia de cómo se cotizó, para que Daniela lo pueda auditar", () => {
    expect(doc).toContain("## Cómo se cotizó");
    expect(doc).toContain("Posición en el rango: **medio**");
  });

  /**
   * La brecha de precio tiene que leerse de un vistazo: el presupuesto que
   * declaró el cliente, el monto y la posición, en líneas contiguas. La
   * calibración del 2026-09-04 salió con $35M para un cliente que había dicho
   * 10-20M **y el documento no lo mencionaba en ninguna parte**.
   */
  it("muestra el presupuesto declarado pegado al monto y a la posición", () => {
    expect(doc).toContain("Posición en el rango: **medio** → $25.000.000");
    expect(doc).toContain(
      '**El cliente declaró: "Tenemos entre 10 y 20 millones para esto"**',
    );
  });

  it("omite la línea cuando el cliente no declaró presupuesto", () => {
    const sinPresupuesto = renderPropuesta(
      entrada(),
      salida({
        inversion: { ...salida().inversion, presupuestoDeclarado: null },
      }),
    );
    expect(sinPresupuesto).not.toContain("El cliente declaró");
    // Y la posición sigue trayendo el monto: esa parte no es condicional.
    expect(sinPresupuesto).toContain("Posición en el rango: **medio** → $25.000.000");
  });

  it("separa lo interno de lo que ve el cliente", () => {
    const marca = "_Lo que sigue es interno y se borra antes de enviar._";
    expect(doc).toContain(marca);
    // Los faltantes y la justificación del precio van DESPUÉS de esa marca.
    expect(doc.indexOf("## Qué falta confirmar")).toBeGreaterThan(
      doc.indexOf(marca),
    );
    expect(doc.indexOf("## Cómo se cotizó")).toBeGreaterThan(doc.indexOf(marca));
  });
});
