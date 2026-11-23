import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The tests run their own servers on their own ports, with their own database,
// so they never touch a running copy of Accountable or its data. The three Supabase
// settings are empty, so the app runs as a local copy whatever the shell holds.
export const API_URL = "http://127.0.0.1:8100";
export const APP_URL = "http://127.0.0.1:5174";
export const TEST_DB = join(root, "data", "test.db");
/** The backend treats an empty setting as not set. */
export const NO_SUPABASE = { DATABASE_URL: "", SUPABASE_URL: "", SUPABASE_PUBLISHABLE_KEY: "" };

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  // The HTML report keeps the traces of failed tests. Open it with npx playwright show-report.
  reporter: [
    ["list"],
    ["html", { outputFolder: join(root, "playwright-report"), open: "never" }],
  ],
  timeout: 30_000,
  // A browser that hangs can't block npm test for good.
  globalTimeout: 15 * 60_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: APP_URL,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      name: "backend",
      command: "uv run --quiet uvicorn --factory backend.app.main:create_app --host 127.0.0.1 --port 8100",
      cwd: root,
      url: `${API_URL}/api/health`,
      env: { ACCOUNTABLE_DB: TEST_DB, ...NO_SUPABASE },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      name: "frontend",
      command: "node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort",
      cwd: join(root, "frontend"),
      url: APP_URL,
      env: { ACCOUNTABLE_API: API_URL, ...NO_SUPABASE },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
