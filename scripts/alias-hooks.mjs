/**
 * Hooks de resolución para correr TypeScript del proyecto con `node` a secas.
 *
 * No es parte de la app ni del build: existe solo para que los scripts sueltos
 * de `scripts/` puedan importar los módulos de `lib/` y `content/` tal como
 * están escritos. Resuelve las dos cosas que Node no sabe resolver por su
 * cuenta y que en la app resuelve el bundler de Next (y en los tests, el
 * `resolve.alias` de `vitest.config.ts`):
 *
 * 1. **El alias `@/`** del `tsconfig.json` → la raíz del proyecto, agregando la
 *    extensión `.ts`/`.tsx` que el import no escribe.
 * 2. **`server-only`**, un paquete-marcador cuyo `index.js` lanza al importarse.
 *    Solo el bundler de Next resuelve su condición `react-server` (que apunta a
 *    un `empty.js`); Node plano cae al `index.js` y explota. Se apunta al mismo
 *    `empty.js` que usaría Next — es exactamente lo que hace `vitest.config.ts`,
 *    con el mismo argumento: lo que protege los precios de `catalogo-interno.ts`
 *    es el build de producción, no el runner.
 *
 * El type-stripping de TypeScript lo hace Node solo (v22.18+ / v24, sin flag).
 *
 * Uso: `node --import ./scripts/alias-hooks.mjs <script>.ts`
 */
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const raiz = path.resolve(import.meta.dirname, "..");

const vacioServerOnly = pathToFileURL(
  path.join(raiz, "node_modules", "server-only", "empty.js"),
).href;

/** Primer candidato que exista como archivo, o `undefined`. */
function primerArchivo(candidatos) {
  return candidatos.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}

registerHooks({
  resolve(especificador, contexto, siguiente) {
    if (especificador === "server-only") {
      return { url: vacioServerOnly, shortCircuit: true };
    }

    if (especificador.startsWith("@/")) {
      const base = path.join(raiz, especificador.slice(2));
      const archivo = primerArchivo([
        base,
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, "index.ts"),
      ]);
      if (archivo) {
        return { url: pathToFileURL(archivo).href, shortCircuit: true };
      }
    }

    return siguiente(especificador, contexto);
  },
});
