import { API_URL, expect, test } from "./fixtures";

test.describe("a new browser", () => {
  test.use({ person: null });

  test("opens on the sign-in screen, and signing in as a teammate opens the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    await expect(page).toHaveTitle("Sign in · Accountable");
    await expect(page.getByText("This copy runs on this computer with made-up teammates.")).toBeVisible();
    await page.getByRole("button", { name: "Sign in as Alex Rivera" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
    await expect(page.getByRole("region", { name: "Key figures" })).toContainText("$612,000");
  });
});

test("/ opens the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expect(page).toHaveTitle("Dashboard · Accountable");
  const current = page.getByRole("navigation", { name: "Sections" }).locator('[aria-current="page"]');
  await expect(current).toHaveText("Dashboard");
  await expect(page.getByRole("region", { name: "Key figures" })).toContainText("$612,000");
});

test("each address shows its screen", async ({ page }) => {
  for (const [path, title, section] of [
    ["/organizations", "Organizations", "Organizations"],
    ["/contacts", "Contacts", "Contacts"],
    ["/deals", "Deals", "Deals"],
    ["/pipeline", "Pipeline", "Pipeline"],
  ]) {
    await page.goto(path!);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);
    await expect(page).toHaveTitle(`${title} · Accountable`);
    await expect(page.getByRole("navigation", { name: "Sections" }).locator('[aria-current="page"]')).toHaveText(section!);
  }
});

test("the sample data is visible across all sections", async ({ page, api }) => {
  for (const [path, count] of [["organizations", 15], ["contacts", 40], ["deals", 30]] as const) {
    await page.goto(`/${path}`);
    await expect(page.locator("tbody tr")).toHaveCount(count);
  }
  const boardData = await (await api.get(`${API_URL}/api/pipeline`)).json();
  await page.goto("/pipeline");
  await expect(page.getByRole("region", { name: "Pipeline board" }).getByRole("listitem")).toHaveCount(19);
  expect(boardData.totals.count).toBe(16);
  for (const [path, expected] of [
    ["/organizations/4", "Website redesign"],
    ["/contacts/16", "Website redesign"],
    ["/deals/10", "Grace Liu"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: expected, exact: true }).first()).toBeVisible();
  }
});

test("the dashboard can retry after the API is unreachable", async ({ page, allowError }) => {
  allowError(/502/);
  await page.route("**/api/dashboard", (route) => route.fulfill({ status: 502 }), { times: 1 });
  await page.goto("/");
  const banner = page.getByRole("alert").filter({ hasText: "Can't reach Accountable" });
  await expect(banner).toContainText("Check your internet connection, then try again.");
  await banner.getByRole("button", { name: "Try again" }).click();
  await expect(banner).toBeHidden();
  await expect(page.getByRole("region", { name: "Key figures" })).toContainText("$612,000");
});

test("an unknown address shows Page not found, with a link to the dashboard", async ({ page }) => {
  await page.goto("/no/such/page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await page.getByRole("link", { name: "Go to the dashboard" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
});
