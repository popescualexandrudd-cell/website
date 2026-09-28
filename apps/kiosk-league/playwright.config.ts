import { defineConfig } from "@playwright/test";

// The servers (backend, Hardware Bridge with simulators, production build of this app) are
// started by scripts/test-e2e. The kiosk is a landscape touch screen.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_KIOSK_URL ?? "http://localhost:5174",
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
});
