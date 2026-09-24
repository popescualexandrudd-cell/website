import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["warn", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  {
    // app/[locale]/[...rest] catches every path, so this rule would flag plain <a> links to
    // downloads and route handlers (CSV/JSON exports, preview) in the admin, which must not use <Link>.
    files: ["app/admin/**", "components/admin/**"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  {
    files: ["scripts/**", "worker/**", "prisma/**", "tests/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "next-env.d.ts",
    "lib/generated/**",
    "playwright-report/**",
    "test-results/**",
    "public/**",
    ".scratch/**",
  ]),
]);
