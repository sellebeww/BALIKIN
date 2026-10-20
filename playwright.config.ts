import { defineConfig, devices } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    ...devices["Desktop Chrome"],
    launchOptions: {
      executablePath:
        process.env.CHROME_PATH ?? (existsSync(chrome) ? chrome : undefined),
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      process.env.RETURRUKUN_E2E_PRODUCTION === "1"
        ? "npm start -- --port 3101"
        : "npm run dev -- --port 3101",
    url: "http://127.0.0.1:3101/api/network",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      RETURRUKUN_DATA_DIR: mkdtempSync(
        path.join(tmpdir(), "returrukun-browser-"),
      ),
    },
  },
});
