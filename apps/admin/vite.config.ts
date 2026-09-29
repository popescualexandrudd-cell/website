import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The admin panel (§8.6) talks to the API on its own origin: in development and preview Vite
// passes /api to the backend (VITE_API_ORIGIN, default http://127.0.0.1:8000); in production the
// proxy (Caddy) does. The session cookie and the CSRF check then need no cross-origin rules.
const backend = process.env.VITE_API_ORIGIN ?? "http://127.0.0.1:8000";
const proxy = { "/api": { target: backend, changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  build: { target: "es2022", sourcemap: false },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
