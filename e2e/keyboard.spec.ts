import type { Page } from "@playwright/test";
import { API_URL, expect, test } from "./fixtures";

/** Presses Tab until the element is focused, as a keyboard user would. */
async function tabTo(page: Page, target: ReturnType<Page["getByRole"]>, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Couldn't reach the element with Tab");
}

test.describe("signed out", () => {
  test.use({ person: null });

  test("sign in with the keyboard only", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await tabTo(page, page.getByRole("button", { name: "Sign in as Alex Rivera" }));
    await page.keyboard.press("Enter");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Contacts");
    await expect(heading).toBeFocused();
  });
});

test("add a contact with the keyboard only", async ({ page }) => {
  await page.goto("/contacts");
  await tabTo(page, page.getByRole("button", { name: "Add contact" }));
  await page.keyboard.press("Enter");
  const form = page.getByRole("dialog");
  await expect(form.getByRole("textbox", { name: "Name" })).toBeFocused();
  await page.keyboard.type("Kim Keyboard");
  await page.keyboard.press("Tab");
  await page.keyboard.type("kim@keys.example");
  await tabTo(page, form.getByRole("combobox", { name: "Organization" }));
  await page.keyboard.type("quill");
  // The server's matches for "quill": just the one.
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option", { name: /Quillon Mutual/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(form.getByRole("combobox", { name: "Organization" })).toHaveValue("Quillon Mutual");
  await tabTo(page, form.getByRole("radio", { name: "Lead" }));
  await page.keyboard.press("ArrowRight");
  await expect(form.getByRole("radio", { name: "Qualified" })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Contact added")).toBeVisible();
  await expect(form).toBeHidden();

  await page.goto("/contacts?q=kim keyboard");
  await expect(page.getByRole("row", { name: /Kim Keyboard/ })).toContainText("Quillon Mutual");
  await expect(page.getByRole("row", { name: /Kim Keyboard/ })).toContainText("Qualified");
});

test("delete a deal with the keyboard only", async ({ page }) => {
  await page.goto("/deals?q=kiosk network");
  const remove = page.getByRole("button", { name: "Delete Kiosk network" });
  await tabTo(page, remove);
  await page.keyboard.press("Enter");
  const alert = page.getByRole("alertdialog");
  await expect(alert.getByRole("button", { name: "Cancel" })).toBeFocused();
  // Escape closes without deleting, and focus goes back to the button.
  await page.keyboard.press("Escape");
  await expect(alert).toBeHidden();
  await expect(remove).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(alert.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(alert.getByRole("button", { name: "Delete deal" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Deal deleted")).toBeVisible();
  await expect(page.getByText('No deals match "kiosk network".')).toBeVisible();
});

test("log a follow-up and mark it done with the keyboard only", async ({ page }) => {
  await page.goto("/contacts/16");
  const form = page.getByRole("region", { name: "Log activity" });
  await expect(form).toBeVisible();
  await tabTo(page, form.getByRole("radio", { name: "Note" }));
  await page.keyboard.press("ArrowRight");
  await expect(form.getByRole("radio", { name: "Call" })).toBeChecked();
  await tabTo(page, form.getByRole("textbox", { name: "Description" }));
  await page.keyboard.type("Keyboard follow-up");
  await tabTo(page, form.getByRole("button", { name: "Choose follow-up date" }));
  await page.keyboard.press("Enter");
  const calendar = page.getByRole("dialog", { name: "Follow-up date" });
  await expect(calendar).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(calendar).toBeHidden();
  await tabTo(page, form.getByRole("button", { name: "Log activity" }));
  await page.keyboard.press("Enter");
  const checkbox = page.getByRole("checkbox", { name: "Done, Keyboard follow-up" });
  await expect(checkbox).toBeVisible();
  await tabTo(page, checkbox);
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(page.getByText("Follow-up marked done")).toBeVisible();
  await page.reload();
  await expect(checkbox).toBeChecked();
  await tabTo(page, checkbox);
  await page.keyboard.press("Space");
  await expect(page.getByText("Follow-up reopened")).toBeVisible();
  await expect(checkbox).not.toBeChecked();
});

test("move, reorder and cancel a card using the keyboard and its menu", async ({ page }) => {
  await page.goto("/pipeline");
  const grip = page.getByRole("button", { name: "Move Website redesign" });
  const live = page.getByRole("status", { name: "Card movement" });
  await expect(grip).toBeVisible();
  await tabTo(page, grip, 100);
  await page.keyboard.press("Space");
  await expect(live).toHaveText("Picked up Website redesign, in Proposal, position 1 of 4");
  await page.keyboard.press("ArrowRight");
  await expect(live).toHaveText("Over Negotiation, position 1 of 4");
  await page.keyboard.press("ArrowDown");
  await expect(live).toHaveText("Over Negotiation, position 2 of 4");
  await page.keyboard.press("Enter");
  await expect(live).toHaveText("Dropped in Negotiation, position 2 of 4");
  const negotiation = page.getByRole("region", { name: "Negotiation", exact: true });
  await expect(negotiation.getByRole("listitem").nth(1)).toContainText("Website redesign");
  await expect(page.getByText("Website redesign moved to Negotiation.")).toBeVisible();
  const board = page.getByRole("region", { name: "Pipeline board" });
  await expect(board).toHaveAttribute("aria-busy", "false");
  await expect(grip).toBeFocused();
  await page.keyboard.press("Space");
  await expect(live).toHaveText("Picked up Website redesign, in Negotiation, position 2 of 4");
  await page.keyboard.press("ArrowDown");
  await expect(live).toHaveText("Over Negotiation, position 3 of 4");
  await page.keyboard.press("Space");
  await expect(live).toHaveText("Dropped in Negotiation, position 3 of 4");
  await expect(negotiation.getByRole("listitem").nth(2)).toContainText("Website redesign");
  await expect(board).toHaveAttribute("aria-busy", "false");
  await expect(grip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(live).toHaveText("Picked up Website redesign, in Negotiation, position 3 of 4");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await expect(live).toHaveText("Put back Website redesign in Negotiation, position 3 of 4");
  await expect(negotiation.getByRole("listitem").nth(2)).toContainText("Website redesign");
  const menuButton = page.getByRole("button", { name: "More actions for Website redesign" });
  await tabTo(page, menuButton);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  for (let step = 0; step < 5; step++) await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Move up" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(negotiation.getByRole("listitem").nth(1)).toContainText("Website redesign");
});

test("choose a far stage on a deal's stage path with the keyboard only", async ({ page, api }) => {
  const found = await (await api.get(`${API_URL}/api/deals`, { params: { q: "Payments gateway" } })).json();
  const deal = found.items[0];
  expect(deal.stage).toBe("negotiation");
  expect(deal.contact.name).toBe("Sam Okafor");
  await page.goto(`/deals/${deal.id}`);
  const path = page.getByRole("radiogroup", { name: "Deal stage" });
  for (let i = 0; i < 60 && !(await path.evaluate((el) => el.contains(document.activeElement))); i++) {
    await page.keyboard.press("Tab");
  }
  // The arrow keys only move focus, so passing Won on the way to Lost saves nothing.
  const lost = path.getByRole("radio", { name: "Lost" });
  for (let i = 0; i < 6 && !(await lost.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("ArrowRight");
  }
  await expect(lost).toBeFocused();
  await expect(path.getByRole("radio", { name: "Negotiation" })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Payments gateway moved to Lost.")).toBeVisible();
  await expect(lost).toBeChecked();

  const timeline = await (await api.get(`${API_URL}/api/deals/${deal.id}/timeline`)).json();
  const moves = timeline.items.filter((item: { type: string }) => item.type === "stage_change");
  // Only the one new move. The sample move is dated today at 10:42, so before then it's the
  // newer of the two, and the order depends on the time of day.
  expect(moves.map((item: { description: string }) => item.description).sort()).toEqual([
    "Moved from Negotiation to Lost",
    "Moved from Proposal to Negotiation",
  ]);
  const contact = await (await api.get(`${API_URL}/api/contacts/${deal.contact.id}`)).json();
  expect(contact.status).toBe("qualified");
});

test("search for a deal in the top bar and open it with the keyboard only", async ({ page }) => {
  await page.goto("/contacts");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacts");
  const box = page.getByRole("banner").getByRole("combobox", { name: "Search organizations, contacts and deals" });
  await tabTo(page, box);
  await page.keyboard.type("ran");
  // One match in each group: an organization, a contact, then the deal.
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(3);
  const deal = page.getByRole("option", { name: /^Branch kiosk pilot/ });
  for (let step = 0; step < 3; step++) await page.keyboard.press("ArrowDown");
  await expect(deal).toHaveAttribute("data-focused", "true");
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("Branch kiosk pilot");
  await expect(page).toHaveURL(/\/deals\/\d+$/);
  await expect(box).toHaveValue("");
});

test("open the user menu, choose Dark, then Light, and sign out with the keyboard only", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  const account = page.getByRole("button", { name: "Account: Alex Rivera" });
  const menu = page.getByRole("menu");
  await tabTo(page, account);

  await page.keyboard.press("Enter");
  await expect(menu).toBeVisible();
  const dark = menu.getByRole("menuitemradio", { name: "Dark" });
  for (let i = 0; i < 4 && !(await dark.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(account).toBeFocused();

  await page.keyboard.press("Space");
  await expect(menu).toBeVisible();
  await page.keyboard.press("Home");
  await expect(menu.getByRole("menuitemradio", { name: "Light" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(account).toBeFocused();

  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: "Sign out" })).toBeFocused();
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("Sign in");
  await expect(heading).toBeFocused();
});
