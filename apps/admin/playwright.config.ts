import { defineConfig } from "@playwright/test";

// The servers (backend, the production build of the panel served with its /api proxy on 5179)
// are started by scripts/test-e2e. The panel is a desk tool: a laptop screen.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5179",
    viewport: { width: 1440, height: 900 },
    locale: "ro-RO",
    timezoneId: "Europe/London", // not the club's zone: the panel must still show club time
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
});
