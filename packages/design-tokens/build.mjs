// Generates dist/tokens.css (CSS custom properties) and dist/tokens.ts from tokens/*.json (ADR-0020).
// Run: pnpm --filter @jungle/design-tokens build. The outputs are committed; scripts/test-all checks they are current.
import StyleDictionary from "style-dictionary";

const sd = new StyleDictionary({
  source: ["tokens/**/*.json"],
  usesDtcg: true,
  log: { verbosity: "silent" },
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "dist/",
      files: [{ destination: "tokens.css", format: "css/variables", options: { outputReferences: false } }],
    },
    ts: {
      transformGroup: "js",
      buildPath: "dist/",
      files: [{ destination: "tokens.ts", format: "javascript/es6" }],
    },
  },
});
await sd.buildAllPlatforms();
