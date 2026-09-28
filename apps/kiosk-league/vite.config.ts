import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The League Kiosk (§8.2): a static page served by the club's server, shown full screen by
// Chromium in kiosk mode (ADR-0014). It talks to the API with the device token and to the
// Hardware Bridge on 127.0.0.1 (ADR-0013).
export default defineConfig({
  plugins: [react()],
  build: { target: "es2022", sourcemap: false },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
