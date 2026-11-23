import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { API_URL, NO_SUPABASE, TEST_DB } from "./playwright.config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Resets the test database with the seed command: the sample data, or the large data set. */
export function seed(large = false) {
  execFileSync("uv", ["run", "--quiet", "python", "-m", "backend.app.seed", ...(large ? ["--large"] : [])], {
    cwd: root,
    env: { ...process.env, ACCOUNTABLE_DB: TEST_DB, ...NO_SUPABASE },
    stdio: "pipe",
  });
}

export { API_URL };

/** The made-up teammates (spec 8), who sign in through local sign-in. */
export const ALEX = "sample-alex-rivera";
export const JORDAN = "sample-jordan-blake";
/** Where a local copy keeps its token (frontend/src/lib/session.ts). */
export const TOKEN_KEY = "accountable-local-session";

/** A token for a teammate, from local sign-in, as the sign-in screen gets one. */
export async function localToken(request: APIRequestContext, personId: string): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/local`, { data: { person_id: personId } });
  expect(response.ok(), await response.text()).toBeTruthy();
  return ((await response.json()) as { access_token: string }).access_token;
}

/**
 * Stores the token before each page in the context loads, as signing in would. Only the
 * first load in each tab, so a test that signs out stays signed out after a reload.
 */
export async function signInContext(context: BrowserContext, token: string) {
  await context.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("e2e-signed-in")) return;
      localStorage.setItem(key, value);
      sessionStorage.setItem("e2e-signed-in", "yes");
    },
    [TOKEN_KEY, token] as const,
  );
}

// The tests run one file at a time in one worker. The database is reset when a new file starts.
let lastFile: string | undefined;

type Options = {
  /** The mode every page in the test opens in. Light is the default, as in the app. */
  theme: "light" | "dark";
  /** The teammate every page is signed in as, Alex Rivera by default, or null for signed out. */
  person: string | null;
};

type Fixtures = {
  /** Stores the theme option's choice before each page loads, as the user menu would. */
  applyTheme: void;
  /** The signed-in person's token, or null when the test starts signed out. */
  token: string | null;
  /** Signs every page in as the person option before it loads. */
  signIn: void;
  /** Direct API calls, which send the person's token. */
  api: APIRequestContext;
  /** The console and page errors this test causes on purpose. */
  allowedErrors: RegExp[];
  /** Lets one test allow an error it causes on purpose, such as a failed save. */
  allowError: (pattern: RegExp) => void;
  /** Fails the test on any console error, page error, or request beyond 127.0.0.1. */
  guard: void;
  /** Resets the database to the sample data before the first test of each file. */
  freshData: void;
};

export const test = base.extend<Options & Fixtures>({
  theme: ["light", { option: true }],
  person: [ALEX, { option: true }],

  token: async ({ person, request }, use) => {
    await use(person ? await localToken(request, person) : null);
  },

  signIn: [
    async ({ context, token }, use) => {
      if (token) await signInContext(context, token);
      await use();
    },
    { auto: true },
  ],

  api: async ({ playwright, token }, use) => {
    const api = await playwright.request.newContext({
      extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });
    await use(api);
    await api.dispose();
  },

  applyTheme: [
    async ({ context, theme }, use) => {
      if (theme === "dark") {
        await context.addInitScript(() => localStorage.setItem("accountable-theme", "dark"));
      }
      await use();
    },
    { auto: true },
  ],

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
