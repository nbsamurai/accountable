import type { Page } from "@playwright/test";
import { API_URL, expect, test } from "./fixtures";

const dialog = (page: Page) => page.getByRole("dialog");
const rows = (page: Page) => page.locator("tbody tr");

test("record pages link to each other and prefill new linked records", async ({ page }) => {
  await page.goto("/organizations?q=northpeak");
  await page.getByRole("link", { name: "Northpeak Energy" }).click();
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText("Northpeak Energy");
  await expect(title).toBeFocused();
  await expect(page.getByRole("region", { name: "Organization figures" })).toContainText("$57,500");
  await expect(page.getByRole("table", { name: "Deals", exact: true })).toContainText("Website redesign");
  await page.getByRole("button", { name: "Add contact" }).click();
  await expect(dialog(page).getByRole("combobox", { name: "Organization" })).toHaveValue("Northpeak Energy");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add deal" }).click();
  await expect(dialog(page).getByRole("combobox", { name: "Organization" })).toHaveValue("Northpeak Energy");
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Grace Liu" }).click();
  await expect(title).toHaveText("Grace Liu");
  await expect(page.getByRole("link", { name: "Northpeak Energy" })).toBeVisible();
  await page.getByRole("button", { name: "Add deal" }).click();
  await expect(dialog(page).getByRole("combobox", { name: "Organization" })).toHaveValue("Northpeak Energy");
  await expect(dialog(page).getByRole("combobox", { name: "Main contact" })).toHaveValue("Grace Liu");
  await page.keyboard.press("Escape");
  await page.getByRole("table", { name: "Deals", exact: true }).getByRole("link", { name: "Website redesign" }).click();
  await expect(title).toHaveText("Website redesign");
  await expect(page.getByRole("link", { name: "Northpeak Energy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Grace Liu" })).toBeVisible();
});

test("a missing contact has a link back to Contacts", async ({ page, allowError }) => {
  allowError(/404/);
  await page.goto("/contacts/999999");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This contact no longer exists.");
  await page.getByRole("link", { name: "Back to Contacts" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacts");
});

test("the status filter shows the right rows and counts, follows the search, and is kept in the address", async ({ page }) => {
  await page.goto("/contacts");
  const filter = page.getByRole("radiogroup", { name: "Status" });
  await expect(filter.getByRole("radio", { name: "All 40" })).toBeChecked();
  await expect(filter.getByRole("radio", { name: "Leads 16" })).toBeVisible();
  await expect(filter.getByRole("radio", { name: "Qualified 10" })).toBeVisible();
  await expect(filter.getByRole("radio", { name: "Customers 14" })).toBeVisible();

  await filter.getByRole("radio", { name: "Customers 14" }).click();
  await expect(page).toHaveURL(/status=customer/);
  await expect(rows(page)).toHaveCount(14);
  for (const row of await rows(page).all()) await expect(row).toContainText("Customer");

  await page.getByRole("searchbox", { name: "Search contacts" }).fill("saltmarsh");
  await expect(filter.getByRole("radio", { name: "All 3" })).toBeVisible();
  await expect(filter.getByRole("radio", { name: "Leads 1" })).toBeVisible();
  await expect(filter.getByRole("radio", { name: "Customers 2" })).toBeChecked();
  await expect(rows(page)).toHaveCount(2);

  await page.reload();
  await expect(filter.getByRole("radio", { name: "Customers 2" })).toBeChecked();
  await expect(rows(page)).toHaveCount(2);
  await filter.getByRole("radio", { name: "All 3" }).click();
  await expect(page).not.toHaveURL(/status=/);
  await expect(rows(page)).toHaveCount(3);
});

test("the status filter works with the arrow keys", async ({ page }) => {
  await page.goto("/contacts");
  const filter = page.getByRole("radiogroup", { name: "Status" });
  await filter.getByRole("radio", { name: /^All/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(filter.getByRole("radio", { name: /^Leads/ })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/status=lead/);
  await expect(rows(page)).toHaveCount(16);
});

test("in the deal form, the organization limits the contacts, and a contact fills in the organization", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("button", { name: "Add deal" }).click();
  const form = dialog(page);
  const organization = form.getByRole("combobox", { name: "Organization" });
  const contact = form.getByRole("combobox", { name: "Main contact" });

  // With no organization, everyone is offered with their organization.
  await form.getByRole("button", { name: "Show main contact options" }).click();
  await expect(page.getByRole("option", { name: /Ana Lopez\s*Brightlane Retail/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // Picking an organization offers only its people.
  await organization.fill("saltmarsh");
  await page.getByRole("option", { name: /Saltmarsh Hotels/ }).click();
  await form.getByRole("button", { name: "Show main contact options" }).click();
  await expect(page.getByRole("option")).toHaveText(["No main contact", "Hannah Moore", "Leila Haddad", "Zoe Adams"]);
  await page.getByRole("option", { name: "Leila Haddad" }).click();
  await expect(contact).toHaveValue("Leila Haddad");

  // Changing the organization clears a contact who works elsewhere.
  await organization.fill("tallgrass");
  await page.getByRole("option", { name: /Tallgrass Builders/ }).click();
  await expect(contact).toHaveValue("No main contact");

  // Picking a contact first fills in their organization.
  await organization.fill("");
  await page.getByRole("option", { name: "No organization" }).click();
  await contact.fill("priya");
  await page.getByRole("option", { name: /Priya Nair/ }).click();
  await expect(organization).toHaveValue("Larkspur Health");
});

test("a contact who moved makes their deal's form ask for a new main contact", async ({ page, api }) => {
  const deals = await (await api.get(`${API_URL}/api/deals?q=website redesign`)).json();
  const deal = deals.items[0];
  const brightlane = (await (await api.get(`${API_URL}/api/organizations?q=brightlane`)).json()).items[0];
  await api.patch(`${API_URL}/api/contacts/${deal.contact.id}`, { data: { organization_id: brightlane.id } });

  await page.goto("/deals?q=website");
  await page.getByRole("button", { name: "Edit Website redesign" }).click();
  const form = dialog(page);
  await expect(form.getByText("Grace Liu now works at Brightlane Retail. Choose a new main contact.")).toBeVisible();
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeVisible();
  await expect(form.getByRole("combobox", { name: "Main contact" })).toBeFocused();

  await form.getByRole("button", { name: "Show main contact options" }).click();
  await page.getByRole("option", { name: "Victor Hale" }).click();
  await form.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Website redesign/ })).toContainText("Victor Hale");
});
