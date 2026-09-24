// Bundles the worker (and the lib code it uses) into dist/worker.mjs for the Docker image,
// so the runtime image needs no TypeScript tooling.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
await build({
  entryPoints: [`${root}worker/index.ts`],
  outfile: `${root}dist/worker.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  legalComments: "none",
  jsx: "automatic",
  alias: { "@": root.replace(/\/$/, ""), "server-only": `${root}tests/stubs/server-only.ts` },
  external: ["pg-native"],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; import { fileURLToPath as __fu } from 'node:url'; import { dirname as __dn } from 'node:path'; const require = __cr(import.meta.url); const __filename = __fu(import.meta.url); const __dirname = __dn(__filename);",
  },
  logLevel: "warning",
});
console.info("Worker construit: dist/worker.mjs");
