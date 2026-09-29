import { defineConfig } from "@playwright/test";

// The servers (backend with Redis, two Hardware Bridges, the production builds of this app for
// a court screen and a lobby screen) are started by scripts/test-e2e. The screens are landscape
// Full HD displays nobody touches.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    viewport: { width: 1920, height: 1080 },
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
});
