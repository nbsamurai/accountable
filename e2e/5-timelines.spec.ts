import type { Page } from "@playwright/test";
import { API_URL, expect, test } from "./fixtures";

const timeline = (page: Page) => page.getByRole("region", { name: "Timeline" });

test("record activities appear newest first, follow the deal to its contact, and can be edited or deleted", async ({ page }) => {
  await page.goto("/deals?q=website");
  await page.getByRole("link", { name: "Website redesign" }).click();
  for (const type of ["Note", "Call", "Email"]) {
    await page.getByRole("radiogroup", { name: "Type" }).getByText(type, { exact: true }).click();
    await page.getByRole("textbox", { name: "Description" }).fill(`Deal ${type} for the timeline`);
    await page.getByRole("button", { name: "Log activity" }).click();
    await expect(timeline(page).getByRole("listitem").first()).toContainText(`Deal ${type} for the timeline`);
    await expect(page.getByRole("textbox", { name: "Description" })).toHaveValue("");
  }
  await expect(timeline(page).getByRole("listitem").nth(1)).toContainText("Deal Call");
  await expect(timeline(page).getByRole("listitem").nth(2)).toContainText("Deal Note");
  const proposal = page.getByRole("radio", { name: "Proposal" });
  await proposal.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Website redesign moved to Negotiation.")).toBeVisible();
  const move = timeline(page).getByRole("listitem").first();
  await expect(move).toContainText("Moved from Proposal to Negotiation");
  await expect(move.getByRole("button")).toHaveCount(0);

  await page.getByRole("link", { name: "Grace Liu" }).click();
  await expect(timeline(page).getByText("Deal Email for the timeline")).toBeVisible();
  const email = timeline(page).getByRole("listitem").filter({ hasText: "Deal Email for the timeline" });
  await expect(email).toContainText("on Website redesign");
  await email.getByRole("button", { name: "Edit email" }).click();
  const editor = page.getByRole("dialog", { name: "Edit activity" });
  await editor.getByRole("textbox", { name: "Description" }).fill("Updated email");
  await editor.getByRole("button", { name: "Save" }).click();
  const edited = timeline(page).getByRole("listitem").filter({ hasText: "Updated email" });
  await expect(edited).toBeVisible();
  await edited.getByRole("button", { name: "Delete email" }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation.getByRole("button", { name: "Cancel" })).toBeFocused();
  await confirmation.getByRole("button", { name: "Delete activity" }).click();
  await expect(edited).toHaveCount(0);

  for (const type of ["Note", "Call", "Email"]) {
    await page.getByRole("radiogroup", { name: "Type" }).getByText(type, { exact: true }).click();
    await page.getByRole("textbox", { name: "Description" }).fill(`Contact ${type} for the timeline`);
    await page.getByRole("button", { name: "Log activity" }).click();
    await expect(timeline(page).getByRole("listitem").first()).toContainText(`Contact ${type} for the timeline`);
  }
});

test("Show older loads the timeline beyond the first 50 entries", async ({ page, request }) => {
  const contact = await (await request.post(`${API_URL}/api/contacts`, { data: { name: "Timeline paging" } })).json();
  for (let index = 1; index <= 52; index++) {
    const response = await request.post(`${API_URL}/api/activities`, { data: { contact_id: contact.id, type: "note", description: `Note ${index}` } });
    expect(response.ok()).toBe(true);
  }
  await page.goto(`/contacts/${contact.id}`);
  const entries = timeline(page).getByRole("listitem");
  await expect(entries).toHaveCount(50);
  await expect(entries.first()).toContainText("Note 52");
  await expect(entries.last()).toContainText("Note 3");
  await page.getByRole("button", { name: "Show older" }).click();
  await expect(entries).toHaveCount(52);
  await expect(entries.last()).toContainText("Note 1");
  await expect(page.getByRole("button", { name: "Show older" })).toBeHidden();
});

test("the dashboard lists new and overdue follow-ups and reflects done and reopened states", async ({ page, request }) => {
  const { today } = await (await request.get(`${API_URL}/api/dashboard`)).json();
  const shift = (days: number) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  for (const [description, days] of [["Overdue follow-up", -1], ["Upcoming follow-up", 3]] as const) {
    const response = await request.post(`${API_URL}/api/activities`, {
      data: { contact_id: 16, type: "note", description, follow_up_date: shift(days) },
    });
    expect(response.ok()).toBe(true);
  }
  await page.goto("/");
  const tasks = page.getByRole("region", { name: "Follow-ups", exact: true });
  await expect(tasks.getByRole("region", { name: /^Overdue/ })).toContainText("Overdue follow-up");
  await tasks.getByRole("button", { name: "Show all 6" }).click();
  const next = tasks.getByRole("checkbox", { name: "Done, Upcoming follow-up" });
  await expect(next).toBeVisible();
  await tasks.getByText("Upcoming follow-up", { exact: true }).locator("xpath=../..").locator("label").click();
  await expect(next).toBeHidden();
  await page.goto("/contacts/16");
  const done = timeline(page).getByRole("checkbox", { name: "Done, Upcoming follow-up" });
  await expect(done).toBeChecked();
  await done.focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("Follow-up reopened")).toBeVisible();
  await page.goto("/");
  await tasks.getByRole("button", { name: "Show all 6" }).click();
  await expect(next).toBeVisible();
});
