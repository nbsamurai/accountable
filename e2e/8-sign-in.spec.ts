import { API_URL, expect, test, TOKEN_KEY } from "./fixtures";

// Every address in spec 4.1, and one that doesn't exist.
const ADDRESSES = [
  "/",
  "/organizations",
  "/organizations/4",
  "/contacts",
  "/contacts/3",
  "/deals",
  "/deals/10",
  "/pipeline",
  "/nowhere",
];

// Every route in spec 9.4 but the three open ones, with ids that exist in the sample data.
const ROUTES = [
  ["GET", "/me"],
  ["GET", "/organizations"],
  ["POST", "/organizations"],
  ["GET", "/organizations/4"],
  ["PATCH", "/organizations/4"],
  ["DELETE", "/organizations/4"],
  ["GET", "/contacts"],
  ["POST", "/contacts"],
  ["GET", "/contacts/3"],
  ["PATCH", "/contacts/3"],
  ["DELETE", "/contacts/3"],
  ["GET", "/contacts/3/timeline"],
  ["GET", "/deals"],
  ["POST", "/deals"],
  ["GET", "/deals/10"],
  ["PATCH", "/deals/10"],
  ["DELETE", "/deals/10"],
  ["POST", "/deals/10/move"],
  ["GET", "/deals/10/timeline"],
  ["POST", "/activities"],
  ["PATCH", "/activities/1"],
  ["DELETE", "/activities/1"],
  ["GET", "/pipeline"],
  ["GET", "/dashboard"],
] as const;

test.describe("signed out", () => {
  test.use({ person: null });

  test("every address shows the sign-in screen, with no top bar", async ({
    page,
  }) => {
    for (const path of ADDRESSES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(
        "Sign in",
      );
      await expect(page).toHaveTitle("Sign in · Accountable");
      await expect(page.getByRole("banner")).toHaveCount(0);
      await expect(page.getByRole("navigation")).toHaveCount(0);
      await expect(page.getByRole("main")).toHaveCount(1);
    }
  });

  test("every API route but the three open ones answers 401", async ({
    request,
  }) => {
    for (const [method, path] of ROUTES) {
      const response = await request.fetch(`${API_URL}/api${path}`, {
        method,
        data: method === "GET" ? undefined : {},
      });
      expect(response.status(), `${method} ${path}`).toBe(401);
    }
    expect((await request.get(`${API_URL}/api/health`)).status()).toBe(200);
    expect((await request.get(`${API_URL}/api/auth/config`)).status()).toBe(
      200,
    );
  });

  test("signing in at /contacts/3 opens /contacts/3, with focus on its h1", async ({
    page,
  }) => {
    await page.goto("/contacts/3");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await page.getByRole("button", { name: "Sign in as Jordan Blake" }).click();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Tom Becker");
    await expect(heading).toBeFocused();
    await expect(page).toHaveURL(/\/contacts\/3$/);
  });
});

test.describe("in dark mode", () => {
  test.use({ theme: "dark" });

  test("signing out from the user menu shows the sign-in screen, Back shows no records, and the theme stays", async ({
    page,
  }) => {
    await page.goto("/contacts");
    await expect(page.locator("tbody tr")).toHaveCount(40);
    await page.goto("/deals/10");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Website redesign",
    );

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Account: Alex Rivera" })
      .click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Sign in");
    await expect(heading).toBeFocused();
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Sign in as Alex Rivera" }),
    ).toBeVisible();
    // Signing out isn't a session that ended by itself.
    await expect(
      page.getByText("Your session has ended. Sign in again."),
    ).toHaveCount(0);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
    ).toBeNull();

    await page.goBack();
    await expect(page).toHaveURL(/\/contacts$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText("Ana Lopez")).toHaveCount(0);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test("a 401 during a session asks to sign in again, then returns to the same page", async ({
  page,
  allowError,
}) => {
  allowError(/401/);
  await page.goto("/deals/10");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Website redesign",
  );

  // The backend restarted, or the person was removed: their token no longer works.
  await page.evaluate(
    (key) => localStorage.setItem(key, "an-old-token"),
    TOKEN_KEY,
  );
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("link", { name: "Contacts" })
    .click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await expect(
    page.getByText("Your session has ended. Sign in again."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/contacts$/);
  await page.getByRole("button", { name: "Sign in as Alex Rivera" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacts");
  await expect(page.locator("tbody tr")).toHaveCount(40);
  await expect(
    page.getByText("Your session has ended. Sign in again."),
  ).toHaveCount(0);
});
