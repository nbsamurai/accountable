import type { Page } from "@playwright/test";
import { API_URL, expect, seed, test } from "./fixtures";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const dialog = (page: Page) => page.getByRole("dialog");
const count = (page: Page, noun: RegExp) => page.getByRole("status").filter({ hasText: noun });
const firstRowName = (page: Page) => page.locator("tbody tr").first().locator("td").first();

async function search(page: Page, label: string, text: string) {
  await page.getByRole("searchbox", { name: label }).fill(text);
}

test("organizations: add, find, sort, edit and delete, kept after a reload", async ({ page }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).click();
  await dialog(page).getByLabel("Name").fill("Aardvark Analytics");
  await dialog(page).getByLabel("Website").fill("aardvark.example");
  await dialog(page).getByLabel("Industry").fill("Software");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Organization added")).toBeVisible();
  await expect(dialog(page)).toBeHidden();

  await search(page, "Search organizations", "aardvark");
  await expect(count(page, /organizations?$/)).toHaveText("1 organization");
  await expect(page.getByRole("link", { name: "Aardvark Analytics" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "aardvark.example" })).toBeVisible();

  await search(page, "Search organizations", "");
  await expect(count(page, /organizations?$/)).toHaveText("16 organizations");
  await expect(firstRowName(page)).toHaveText("Aardvark Analytics");
  const name = page.getByRole("columnheader", { name: "Name" });
  await expect(name).toHaveAttribute("aria-sort", "ascending");
  await name.getByRole("button").click();
  await expect(name).toHaveAttribute("aria-sort", "descending");
  await expect(firstRowName(page)).toHaveText("Westbrook Clinics");
  await page.getByRole("columnheader", { name: "Open pipeline (US$)" }).getByRole("button").click();
  await expect(page.getByRole("columnheader", { name: "Open pipeline (US$)" })).toHaveAttribute("aria-sort", "ascending");
  await expect(page).toHaveURL(/sort=open_pipeline/);

  await page.getByRole("button", { name: "Edit Aardvark Analytics" }).click();
  await dialog(page).getByLabel("Name").fill("Aardvark Labs");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  await page.reload();
  await search(page, "Search organizations", "aardvark");
  await expect(page.getByRole("link", { name: "Aardvark Labs" })).toBeVisible();

  await page.getByRole("button", { name: "Delete Aardvark Labs" }).click();
  const alert = page.getByRole("alertdialog");
  await expect(alert).toContainText("Delete Aardvark Labs?");
  await expect(alert.getByRole("button", { name: "Cancel" })).toBeFocused();
  await alert.getByRole("button", { name: "Delete organization" }).click();
  await expect(page.getByText("No organizations match \"aardvark\".")).toBeVisible();
  await page.reload();
  await expect(page.getByText("No organizations match \"aardvark\".")).toBeVisible();
});

test("contacts: add, find, sort, edit and delete, kept after a reload", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Add contact" }).click();
  await dialog(page).getByLabel("Name").fill("Aaron Abbott");
  await dialog(page).getByLabel("Email").fill("aaron@northpeak.example");
  await dialog(page).getByLabel("Job title").fill("Buyer");
  await dialog(page).getByRole("combobox", { name: "Organization" }).fill("northpeak");
  await page.getByRole("option", { name: /Northpeak Energy/ }).click();
  await dialog(page).locator("label", { hasText: "Qualified" }).click();
  await expect(dialog(page).getByRole("radio", { name: "Qualified" })).toBeChecked();
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Contact added")).toBeVisible();

  await search(page, "Search contacts", "abbott");
  await expect(count(page, /contacts?$/)).toHaveText("1 contact");
  const row = page.getByRole("row", { name: /Aaron Abbott/ });
  await expect(row).toContainText("Northpeak Energy");
  await expect(row).toContainText("Qualified");

  await search(page, "Search contacts", "");
  await page.getByRole("columnheader", { name: "Job title" }).getByRole("button").click();
  await expect(firstRowName(page)).toHaveText("Aaron Abbott");
  await page.getByRole("columnheader", { name: "Job title" }).getByRole("button").click();
  await expect(page.getByRole("columnheader", { name: "Job title" })).toHaveAttribute("aria-sort", "descending");
  // Empty values go last both ways: Ryan Cole has no job title.
  await page.getByRole("button", { name: "Next" }).isDisabled();
  await expect(page.locator("tbody tr").last()).toContainText("Ryan Cole");

  await page.getByRole("button", { name: "Edit Aaron Abbott" }).click();
  await dialog(page).getByLabel("Phone").fill("+1 555 0199");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: /Aaron Abbott/ })).toContainText("+1 555 0199");

  await page.getByRole("button", { name: "Delete Aaron Abbott" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete contact" }).click();
  await expect(page.getByRole("row", { name: /Aaron Abbott/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("link", { name: "Ana Lopez" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Aaron Abbott/ })).toHaveCount(0);
});

test("deals: add, find, sort, edit and delete, kept after a reload", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("button", { name: "Add deal" }).click();
  const form = dialog(page);
  await form.getByLabel("Name").fill("Aardvark rollout");
  await form.getByRole("combobox", { name: "Main contact" }).fill("grace");
  await page.getByRole("option", { name: /Grace Liu/ }).click();
  await expect(form.getByRole("combobox", { name: "Organization" })).toHaveValue("Northpeak Energy");
  await form.getByLabel("Value (US$)").fill("12,500");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Deal added.")).toBeVisible();

  await search(page, "Search deals", "aardvark");
  await expect(count(page, /deals?$/)).toHaveText("1 deal");
  const row = page.getByRole("row", { name: /Aardvark rollout/ });
  await expect(row).toContainText("Northpeak Energy");
  await expect(row).toContainText("Grace Liu");
  await expect(row).toContainText("$12,500");
  await expect(row).toContainText("10%");
  await expect(row).toContainText("$1,250");

  await search(page, "Search deals", "");
  await page.getByRole("columnheader", { name: "Value" }).getByRole("button").click();
  await page.getByRole("columnheader", { name: "Value" }).getByRole("button").click();
  await expect(firstRowName(page)).toHaveText("Plant maintenance suite");

  await page.goto("/deals?q=aardvark");
  await page.getByRole("button", { name: "Edit Aardvark rollout" }).click();
  await form.getByRole("button", { name: /Stage/ }).click();
  await page.getByRole("option", { name: "Proposal" }).click();
  await expect(form.getByLabel("Probability (%)")).toHaveValue("50");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: /Aardvark rollout/ })).toContainText("Proposal");
  await expect(page.getByRole("row", { name: /Aardvark rollout/ })).toContainText("50%");

  await page.getByRole("button", { name: "Delete Aardvark rollout" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Its 1 activity will be deleted, including its stage changes. This can't be undone.",
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete deal" }).click();
  await expect(page.getByText("No deals match \"aardvark\".")).toBeVisible();
});

test("saving with no name shows the error under the field and moves focus to it", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Add contact" }).click();
  await dialog(page).getByLabel("Email").fill("someone@example.example");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  const name = dialog(page).getByRole("textbox", { name: "Name" });
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(dialog(page).getByText("Enter a name.")).toBeVisible();
  await expect(name).toHaveAccessibleDescription(/Enter a name\./);
});

test("a server error shows under its field", async ({ page, allowError }) => {
  allowError(/status of 422/);
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Add contact" }).click();
  await dialog(page).getByLabel("Name").fill("Bad Email");
  await dialog(page).getByLabel("Email").fill("not-an-email");
  // The browser's own email check is off, so the server's message shows.
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page).getByText(/Enter an email address/)).toBeVisible();
  await expect(dialog(page).getByRole("textbox", { name: "Email" })).toBeFocused();
});

test("delete dialogs say what happens to linked records, and the links go", async ({ page, request }) => {
  await page.goto("/organizations?q=northpeak");
  await page.getByRole("button", { name: "Delete Northpeak Energy" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Its 3 contacts and 3 deals will be kept, without an organization. This can't be undone.",
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete organization" }).click();
  await expect(page.getByText("Organization deleted")).toBeVisible();
  await page.goto("/contacts?q=grace");
  await expect(page.getByRole("row", { name: /Grace Liu/ })).toContainText("–");

  await page.goto("/contacts?q=priya");
  await page.getByRole("button", { name: "Delete Priya Nair" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Their 2 deals will be kept, without a main contact. Their 3 activities will be deleted. This can't be undone.",
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete contact" }).click();
  await expect(page.getByText("Contact deleted")).toBeVisible();
  await page.goto("/deals?q=lab results");
  await expect(page.getByRole("row", { name: /Lab results integration/ }).getByRole("cell").nth(2)).toHaveText("–");

  const deals = await (await request.get(`${API_URL}/api/deals?q=patient`)).json();
  expect(deals.items[0].contact).toBeNull();
});

test("search, sort and page come back after a reload and after Back", async ({ page }) => {
  await page.goto("/contacts");
  await search(page, "Search contacts", "an");
  await expect(page).toHaveURL(/q=an/);
  await page.getByRole("columnheader", { name: "Email" }).getByRole("button").click();
  await page.getByRole("columnheader", { name: "Email" }).getByRole("button").click();
  await expect(page).toHaveURL(/sort=email&dir=desc/);
  // Zoe Adams matches "an" through her job title, and has the last email A to Z.
  await expect(firstRowName(page)).toHaveText("Zoe Adams");

  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search contacts" })).toHaveValue("an");
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveAttribute("aria-sort", "descending");
  await expect(firstRowName(page)).toHaveText("Zoe Adams");

  await page.goBack();
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveAttribute("aria-sort", "ascending");
  await page.goForward();
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveAttribute("aria-sort", "descending");

  // Typing replaces the address, so Back leaves the search behind in one step.
  await page.goto("/organizations");
  await page.goto("/contacts");
  await search(page, "Search contacts", "sam");
  await expect(page).toHaveURL(/q=sam/);
  await page.goBack();
  await expect(page).toHaveURL(/\/organizations$/);
});

test("paging comes back after a reload", async ({ page, request }) => {
  const before = (await (await request.get(`${API_URL}/api/contacts`)).json()).total as number;
  for (let n = 0; n < 60 - before; n++) {
    await request.post(`${API_URL}/api/contacts`, { data: { name: `Paging Person ${n}` } });
  }
  await page.goto("/contacts");
  await expect(page.getByText("1–50 of 60")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("51–60 of 60")).toBeVisible();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByText("51–60 of 60")).toBeVisible();
  await page.goBack();
  await expect(page.getByText("1–50 of 60")).toBeVisible();
});

test("no results shows a message and Clear search clears it", async ({ page }) => {
  await page.goto("/contacts");
  await search(page, "Search contacts", "xyz");
  await expect(page.getByText('No contacts match "xyz".')).toBeVisible();
  await expect(count(page, /contacts?$/)).toHaveText("0 contacts");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search contacts" })).toHaveValue("");
  await expect(page.getByRole("link", { name: "Ana Lopez" })).toBeVisible();
});

test("after changes, the seed command brings back the sample data", async ({ page, request }) => {
  const before = (await (await request.get(`${API_URL}/api/organizations`)).json()).total as number;
  await request.post(`${API_URL}/api/organizations`, { data: { name: "Temporary Co" } });
  await page.goto("/organizations");
  await expect(page.getByText(`1–${before + 1} of ${before + 1}`)).toBeVisible();
  seed();
  await page.reload();
  await expect(page.getByText("1–15 of 15")).toBeVisible();
  await expect(page.getByRole("link", { name: "Temporary Co" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Northpeak Energy" })).toBeVisible();
});
