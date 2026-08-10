import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Configuración de tests.
 *
 * El alias `@/*` se declara acá a mano en vez de con un plugin que lea el
 * `tsconfig.json`: es una sola línea y evita sumar una dependencia más al
 * proyecto. Si algún día se agregan más paths al tsconfig, hay que reflejarlos
 * acá — es el precio de no tener el plugin, y es barato para dos entradas.
 *
 * `environment: "node"` a propósito: **no se testean componentes**, así que no
 * hace falta jsdom. Lo que se testea es la lógica de `lib/` y el endpoint, que
 * corren en Node.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),

      /**
       * `server-only` es un paquete-marcador: su `index.js` **lanza una
       * excepción al importarse**, y así es como convierte un import desde el
       * cliente en un error de build. El truco es que solo el bundler de Next
       * resuelve la condición `react-server` (que apunta a un `empty.js`);
       * Vitest corre en Node plano, cae al `index.js` y explota.
       *
       * Sin este alias, todo módulo marcado `server-only` queda **imposible de
       * testear** — hoy `catalogo-interno.ts` (los rangos en CLP) y `render.ts`
       * (el pre-diagnóstico entero, con su golden test). Apuntamos al mismo
       * `empty.js` que usaría Next: no debilita la garantía, porque lo que
       * protege los precios es el build de producción, no el runner de tests.
       */
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["{lib,app}/**/*.test.ts"],
  },
});
