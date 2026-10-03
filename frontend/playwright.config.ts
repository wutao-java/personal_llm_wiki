import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:8765",
    channel: process.env.E2E_BROWSER_CHANNEL === "msedge" ? "msedge" : undefined,
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
