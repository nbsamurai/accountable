import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect } from "@playwright/test";
import { API_URL, TEST_DB } from "./playwright.config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Resets the test database with the seed command: the sample data, or the large data set. */
export function seed(large = false) {
  execFileSync("uv", ["run", "--quiet", "python", "-m", "backend.app.seed", ...(large ? ["--large"] : [])], {
    cwd: root,
    env: { ...process.env, ACCOUNTABLE_DB: TEST_DB },
    stdio: "pipe",
  });
}

export { API_URL };

// The tests run one file at a time in one worker. The database is reset when a new file starts.
let lastFile: string | undefined;

type Fixtures = {
  /** The console and page errors this test causes on purpose. */
  allowedErrors: RegExp[];
  /** Lets one test allow an error it causes on purpose, such as a failed save. */
  allowError: (pattern: RegExp) => void;
  /** Fails the test on any console error, page error, or request beyond 127.0.0.1. */
  guard: void;
  /** Resets the database to the sample data before the first test of each file. */
  freshData: void;
};

export const test = base.extend<Fixtures>({
  freshData: [
    async ({}, use, testInfo) => {
      if (testInfo.file !== lastFile) {
        seed();
        lastFile = testInfo.file;
      }
      await use();
    },
    { auto: true },
  ],

  allowedErrors: async ({}, use) => {
    await use([]);
  },

  allowError: async ({ allowedErrors }, use) => {
    await use((pattern) => {
      allowedErrors.push(pattern);
    });
  },

  guard: [
    async ({ page, context, allowedErrors }, use) => {
      const problems: string[] = [];
      const isAllowed = (text: string) => allowedErrors.some((pattern) => pattern.test(text));

      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === "127.0.0.1") return route.continue();
        problems.push(`Request beyond 127.0.0.1: ${url.href}`);
        return route.abort();
      });
      page.on("console", (message) => {
        if (message.type() === "error" && !isAllowed(message.text())) {
          problems.push(`Console error: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => {
        if (!isAllowed(error.message)) problems.push(`Page error: ${error.message}`);
      });

      await use();

      expect(problems, "console errors, page errors and outside requests").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
