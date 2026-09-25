// Bundles the Node programs that run next to the Next.js server in the Docker image, so the
// runtime image needs no TypeScript tooling:
//   dist/worker.mjs        background jobs (emails, reminders, retention)
//   dist/seed.mjs          first content from config/club.yml
//   dist/admin-create.mjs  creates an admin account / resets a password
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const entries = {
  worker: "worker/index.ts",
  seed: "prisma/seed.ts",
  "admin-create": "scripts/admin-create.ts",
};

for (const [name, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [`${root}${entry}`],
    outfile: `${root}dist/${name}.mjs`,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    sourcemap: false,
    legalComments: "none",
    jsx: "automatic",
    alias: { "@": root.replace(/\/$/, ""), "server-only": `${root}tests/stubs/server-only.ts` },
    // Native modules stay in node_modules.
    external: ["pg-native", "@node-rs/argon2", "sharp"],
    banner: {
      js: "import { createRequire as __cr } from 'node:module'; import { fileURLToPath as __fu } from 'node:url'; import { dirname as __dn } from 'node:path'; const require = __cr(import.meta.url); const __filename = __fu(import.meta.url); const __dirname = __dn(__filename);",
    },
    logLevel: "warning",
  });
  console.info(`Construit: dist/${name}.mjs`);
}
