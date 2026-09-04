/**
 * Genera el borrador de una propuesta comercial desde las notas de un discovery
 * — paso 6 de la Fase 3.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 ESTO NO ES UN TEST Y NO VA A LA SUITE DE VITEST.
 *
 * Pega contra la Messages API de Anthropic: gasta dinero real y falla sin
 * internet. Vive en `scripts/` (fuera del `include` de `vitest.config.ts`) y se
 * corre a mano.
 *
 * **Y tampoco es una superficie web.** ADR-012 §1 eligió la opción A: Daniela le
 * pasa las notas a Bastián y él le devuelve el borrador. No hay página, no hay
 * login, no hay endpoint — eso es exactamente lo que este script implementa, y
 * es la razón por la que `app/privacidad/page.tsx` no vuelve a quedar incompleta
 * con la Fase 3: el sitio no recolecta nada de esto.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ## Cómo se corre
 *
 * Desde `landingpage/`:
 *
 * ```
 * node --env-file=.env.local --import ./scripts/alias-hooks.mjs \
 *   scripts/generar-propuesta.ts scripts/fixtures/notas-retailco.md \
 *   --empresa "RetailCo"
 * ```
 *
 * `--env-file` levanta `ANTHROPIC_API_KEY` de `.env.local` (nunca se imprime).
 * `--import ./scripts/alias-hooks.mjs` resuelve el alias `@/` y neutraliza
 * `server-only`, que fuera del bundler de Next lanza al importarse.
 *
 * | Argumento | |
 * |---|---|
 * | `<archivo>` | las notas del discovery. Obligatorio. |
 * | `--empresa` | nombre del cliente. Obligatorio: encabeza el documento y **no se extrae del texto** (ver `entrada.ts`). |
 * | `--pre-diagnostico <archivo>` | el pre-diagnóstico de la Fase 2, si el prospecto pasó por `/assessment` (ADR-012 §2). |
 * | `--salida <archivo>` | dónde escribir. Por defecto `propuestas/<empresa>-<fecha>.md`. |
 *
 * ⚠️ **`propuestas/` está en `.gitignore`.** Un borrador real lleva nombre de
 * empresa, cargos, correos y el presupuesto que el cliente declaró; commitearlo
 * sería publicar en GitHub lo que un prospecto dijo en una reunión privada.
 *
 * ## Presupuesto
 *
 * Una llamada por corrida, o dos si la primera salida no valida. A diferencia
 * del assessment —donde el reintento nunca entra en el `maxDuration` de la
 * función— acá **sí entra**, porque el techo lo pone `lib/propuesta/cliente.ts` y
 * no la plataforma. El script reporta el tiempo de pared, que es el dato que
 * falta para fijar `TIMEOUT_POR_DEFECTO_MS` con una medición en vez de una
 * estimación.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { generarPropuesta } from "@/lib/propuesta/cliente";
import {
  entradaPropuestaSchema,
  MINIMO_NOTAS,
  normalizarEntrada,
} from "@/lib/propuesta/entrada";
import { renderPropuesta } from "@/lib/propuesta/render";

interface Argumentos {
  notas: string;
  empresa: string;
  preDiagnostico?: string;
  salida?: string;
}

function parsearArgumentos(argv: string[]): Argumentos {
  let notas: string | undefined;
  let empresa: string | undefined;
  let preDiagnostico: string | undefined;
  let salida: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--empresa") empresa = argv[++i];
    else if (arg === "--pre-diagnostico") preDiagnostico = argv[++i];
    else if (arg === "--salida") salida = argv[++i];
    else if (arg?.startsWith("--")) throw new Error(`Argumento desconocido: ${arg}`);
    else notas ??= arg;
  }

  if (!notas || !empresa) {
    throw new Error(
      "Uso: generar-propuesta.ts <notas.md> --empresa \"Nombre\" " +
        "[--pre-diagnostico <archivo>] [--salida <archivo>]",
    );
  }

  return { notas, empresa, ...(preDiagnostico && { preDiagnostico }), ...(salida && { salida }) };
}

/** `RetailCo SpA` → `retailco-spa`. Para el nombre del archivo, nada más. */
function slug(texto: string): string {
  return texto
    .normalize("NFD")
    // Los diacríticos que separó el NFD, escapados: escribirlos literales deja
    // caracteres invisibles en el fuente.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function separador(texto: string): string {
  return `\n${"═".repeat(78)}\n${texto}\n${"═".repeat(78)}\n`;
}

/**
 * Chequeos automáticos. **Primer filtro, no veredicto** — son textuales, dan
 * falsos positivos y falsos negativos, y quien decide es la persona que lee el
 * borrador completo como lo leería un gerente que está por firmar.
 *
 * ⚠️ **Cada chequeo corre sobre el artefacto correcto, y esa distinción es la
 * mitad del valor de esta función.** La regla "el modelo no escribe cifras" se
 * verifica sobre el JSON del modelo, **nunca sobre el documento renderizado**:
 * el documento SÍ tiene montos, puestos por `precios.ts`, así que buscarlos ahí
 * daría rojo siempre y el chequeo se terminaría ignorando. Al revés, el
 * encabezado de borrador solo existe después de renderizar.
 */
function correrChequeos(salidaJson: string, documento: string): void {
  console.log("\n── Chequeos automáticos (primer filtro, no veredicto) ──");

  // ── Sobre la salida del modelo ────────────────────────────────────────────
  const plata = salidaJson.match(/\$\s?\d|\d[\d.,]*\s*(millones|M\b|CLP|UF)/gi) ?? [];
  console.log(
    plata.length === 0
      ? "✅ el modelo no escribió cifras de dinero"
      : `🛑 el modelo escribió cifras: ${[...new Set(plata)].join(", ")}`,
  );

  const disenoDetallado =
    salidaJson.match(
      /\b(SELECT |CREATE TABLE|INSERT INTO|GROUP BY|yaml|yml|json_path|crawler|bookmark|IAM role|arn:aws|s3:\/\/|npm install|terraform apply|docker run|kubectl|CREATE OR REPLACE|--region|\bcron\b)/gi,
    ) ?? [];
  console.log(
    disenoDetallado.length === 0
      ? "✅ sin diseño detallado (ADR-012 §3: el con-qué sí, el cómo no)"
      : `🛑 diseño detallado filtrado: ${[...new Set(disenoDetallado)].join(", ")}`,
  );

  const herramientas =
    salidaJson.match(
      /\b(glue|quicksight|redshift|athena|lambda|dbt|airflow|kinesis|dynamodb|aurora|sagemaker|snowflake|databricks|power ?bi|tableau|looker|fivetran|s3)\b/gi,
    ) ?? [];
  console.log(
    herramientas.length > 0
      ? `✅ nombra herramientas: ${[...new Set(herramientas.map((h) => h.toLowerCase()))].join(", ")}`
      : "🛑 NO nombra ninguna herramienta — la §2 pierde su valor (ADR-012 §3)",
  );

  const porcentajes = salidaJson.match(/\d+\s?%|\bpor ciento\b/gi) ?? [];
  console.log(
    porcentajes.length === 0
      ? "✅ sin porcentajes inventados"
      : `🛑 porcentajes: ${[...new Set(porcentajes)].join(", ")} (un número inventado parece medido)`,
  );

  // ── Sobre el documento renderizado ────────────────────────────────────────
  const marcadores = documento.match(/\[FALTA:/g) ?? [];
  console.log(
    `ℹ️  "[FALTA: …]" aparece ${marcadores.length} vez/veces ` +
      "(1 es el mínimo: el costo de infraestructura lo pone siempre el renderer).",
  );

  for (const [nombre, patron] of [
    ["encabezado de borrador (ADR-005)", /^BORRADOR — pendiente de revisión y firma$/m],
    ["la firma queda pendiente, no puesta", /_Firma pendiente/],
  ] as const) {
    console.log(patron.test(documento) ? `✅ ${nombre}` : `🛑 ${nombre} — AUSENTE`);
  }

  /*
   * ⚠️ **Este chequeo corre solo sobre la mitad que ve el cliente, y la primera
   * versión no lo hacía.** Buscaba `§` en el documento entero y daba 🛑 en las
   * dos corridas de calibración por `(§6)` — una referencia que `render.ts`
   * pone **a propósito** dentro de la sección interna, la que Daniela borra
   * antes de enviar. O sea el chequeo reprobaba al renderer por hacer bien su
   * trabajo. Es el mismo error contra el que advierte el comentario de arriba,
   * cometido dos funciones más abajo: un chequeo textual solo prueba algo si
   * corre sobre el artefacto donde ese algo importa.
   */
  const CORTE_INTERNO = "_Lo que sigue es interno y se borra antes de enviar._";
  const paraElCliente = documento.split(CORTE_INTERNO)[0] ?? documento;

  console.log(
    /ADR-\d|§\d/.test(paraElCliente)
      ? "🛑 jerga interna filtrada en la parte que ve el cliente"
      : "✅ sin jerga interna en la parte que ve el cliente",
  );
}

async function main(): Promise<void> {
  const args = parsearArgumentos(process.argv.slice(2));

  const notas = await readFile(args.notas, "utf8");
  const preDiagnostico = args.preDiagnostico
    ? await readFile(args.preDiagnostico, "utf8")
    : undefined;

  /*
   * Se valida con el mismo esquema que usaría cualquier otra superficie: si
   * mañana esto pasa a ser una página (opción B), el contrato de entrada ya está
   * ejercitado. Un fixture que se salta el esquema calibra contra notas que el
   * flujo real no podría producir.
   */
  const validado = entradaPropuestaSchema.safeParse({
    empresa: args.empresa,
    notas,
    ...(preDiagnostico && { preDiagnostico }),
  });

  if (!validado.success) {
    console.error("🛑 La entrada no valida:\n");
    for (const issue of validado.error.issues) {
      console.error(`  · ${issue.path.join(".") || "(raíz)"}: ${issue.message}`);
    }
    console.error(
      `\n(las notas tienen ${notas.trim().length} caracteres; el mínimo es ${MINIMO_NOTAS})`,
    );
    process.exitCode = 1;
    return;
  }

  const entrada = normalizarEntrada(validado.data, new Date());

  console.log(
    separador(
      `PROPUESTA · ${entrada.empresa}\n` +
        `notas: ${args.notas} (${entrada.notas.length} caracteres)\n` +
        `pre-diagnóstico: ${entrada.preDiagnostico ? `${args.preDiagnostico} (${entrada.preDiagnostico.length} caracteres)` : "no se encadena"}`,
    ),
  );

  const inicio = Date.now();
  const resultado = await generarPropuesta(entrada);
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

  console.log(`⏱  ${segundos} s de pared.`);

  if (!resultado.ok) {
    console.error(`\n🛑 falló — motivo: ${resultado.motivo}\n   detalle: ${resultado.detalle}`);
    process.exitCode = 1;
    return;
  }

  const documento = renderPropuesta(entrada, resultado.salida);
  const destino =
    args.salida ??
    join("propuestas", `${slug(entrada.empresa)}-${entrada.preparadaEn.slice(0, 10)}.md`);

  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, documento, "utf8");

  console.log("\n── Salida estructurada del modelo (JSON validado) ──\n");
  console.log(JSON.stringify(resultado.salida, null, 2));

  correrChequeos(JSON.stringify(resultado.salida), documento);

  console.log(
    separador(
      `Borrador escrito en ${destino}\n` +
        "Leerlo completo antes de mandarlo: los chequeos de arriba son un filtro, no un veredicto.\n" +
        "Sale SIN FIRMA a propósito (ADR-005) y ningún camino de código lo manda al prospecto.",
    ),
  );
}

await main();
