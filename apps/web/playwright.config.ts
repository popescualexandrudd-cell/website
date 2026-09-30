import { defineConfig, devices } from "@playwright/test";

// The servers are started by scripts/test-e2e (backend + production build of this site). The
// pre-launch page is tested first; then, with the full site turned on (E2E_SITE_MODE=full), e2e/full.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const mode = process.env.E2E_SITE_MODE;
// "full": the full site as approved; "effects": the same tests again with the effects switched on
// (ADR-0023: they must pass unchanged), plus the tests of the effects themselves.
const match = mode === "full" ? { testMatch: "full/**/*.spec.ts" } : mode === "effects" ? { testMatch: ["full/**/*.spec.ts", "effects/**/*.spec.ts"] } : { testIgnore: ["full/**", "effects/**"] };

export default defineConfig({
  testDir: "e2e",
  ...match,
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: executablePath ? { executablePath } : {} } },
    // Mobile runs with reduced motion: smooth scrolling makes emulated taps land on moving elements.
    // Desktop keeps full motion, so both modes are covered.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], reducedMotion: "reduce", launchOptions: executablePath ? { executablePath } : {} },
    },
  ],
});
