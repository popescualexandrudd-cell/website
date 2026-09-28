import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// The League Kiosk (§8.2): a static page served by the club's server, shown full screen by
// Chromium in kiosk mode (ADR-0014). It talks to the API with the device token and to the
// Hardware Bridge on 127.0.0.1 (ADR-0013).
export default defineConfig(({ command, mode }) => {
  // The device token is a secret: it comes from the bridge on the machine. A published build
  // is a public file, so building one while a token is set in the environment is refused.
  if (command === "build" && loadEnv(mode, process.cwd(), "VITE_").VITE_DEVICE_TOKEN) {
    throw new Error("VITE_DEVICE_TOKEN is for `pnpm dev` only; unset it before building");
  }
  return {
    plugins: [react()],
    build: { target: "es2022", sourcemap: false },
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
    },
  };
});
