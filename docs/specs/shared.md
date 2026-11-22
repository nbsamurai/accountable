# Shared rules and screens

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 2. Records

Every record has an `id`, a `created_at` and an `updated_at` (UTC timestamps), as well as the fields listed under Records in its area file. Only the name is required on organizations, contacts and deals. Text fields are trimmed, and an empty field is stored as empty (null).

## 3. Rules

### 3.7 Deleting

| Deleting | Linked records |
|---|---|
| An organization | Its contacts and deals are kept, with no organization |
| A contact | Their deals are kept, with no main contact. Their own activities are deleted |
| A deal | Its activities are deleted, stage changes included |
| An activity | Nothing else changes |

The database enforces these rules with foreign keys: `SET NULL` for links to organizations and contacts, and `CASCADE` for activities.

### 3.9 Formats

- **Money:** US dollars, whole dollars, with thousands separators, such as `$48,000`. Chart axes and the funnel's labels use the short form, such as `$40K` and `$1.2M`. The value field is labelled "Value (US$)".
- **Percent:** whole numbers, such as `75%`.
- **Dates:** `Nov 19, 2026`. Timeline entries add the time: `Nov 19, 2026, 2:30 PM`. Follow-ups say "Due today", "Due tomorrow", "Due Mon, Nov 23" or "3 days overdue".
- **Empty values** display as “–”, including on pipeline cards.
- Formatting uses the browser's `Intl` API with the `en-US` locale.

## 4. Screens

### 4.1 The app shell

- **Top bar,** 64 px tall, on the page background with no line under it. It has the Accountable wordmark on the left, which links to the dashboard, and the five sections: Dashboard, Organizations, Contacts, Deals and Pipeline. The current section is a `--fill-strong` pill (Midnight with white text, or Sea Mist with Midnight text in dark mode), and has `aria-current="page"`. The "Dark mode" toggle is at the right end. The bar stays at the top as the page scrolls.
- **Light and dark mode:** light mode is the default. The "Dark mode" toggle switches the whole app to dark mode, charts, dialogs and messages included, and back. The browser remembers the choice per browser profile, across reloads and restarts, in `localStorage` under `accountable-theme`. A dark choice applies before the page first shows, so it never flashes white or light. If the browser blocks storage, the toggle still works until the page reloads. The app doesn't follow the device's own dark mode setting.
- **Main area:** at most 1,440 px wide and centered, with 32 px side margins. Each screen has one `h1`, its title, with the screen's main action on the right of it, such as "Add contact".
- **Skip link:** "Skip to main content" is the first thing on the page, and shows when it has focus.
- **Narrow windows** reflow down to 320 px, the equivalent of a 1,280 px screen at 400% zoom. At 860 px and below, a “Menu” button holds the sections. The “Dark mode” toggle stays in the top bar, outside the menu, at every width. Grids stack as space narrows, and tables and the board scroll sideways within their panels.
- **Addresses:** `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id` and `/pipeline`. Any other address shows "Page not found", with a link to the dashboard.
- **Page titles:** "Contacts · Accountable", or "Jane Doe · Accountable" on a record's page.

### 4.3 Tables

Organizations, Contacts and Deals share one table design:

- **Toolbar:** a search box ("Search contacts") and any filters. The page header holds the add button ("Add contact").
- **Search** waits 250 ms after typing stops and matches any part of the fields listed for each table. Case folding covers A to Z. A live region announces the number of matches, such as “12 contacts.”
- **Sorting:** every column heading is a button. The first click sorts A to Z or smallest first, and the second reverses it. The heading shows an arrow and sets `aria-sort`. Empty values always go last. Each table sorts by name, A to Z, to begin with.
- **Paging:** 50 rows a page, with "1–50 of 5,000" and Previous and Next buttons under the table. If a deletion or an old address leaves the page past the end, the table opens the last available page and replaces the address. With zero results it returns to page one.
- **Rows:** the name links to the record's page. Each row has Edit and Delete icon buttons, always visible, with labels such as "Edit Northpeak".
- **State in the address:** search, sort, page and filters live in the address, such as `/contacts?q=ann&status=lead&sort=name&dir=asc&page=2`. A refresh or the Back button brings them back. Typing in the search box replaces the address instead of adding to the browser's history.
- **No rows:** "No contacts yet." with the add button, or "No contacts match "ann"." with a "Clear search" button.
- Search, sorting and paging all happen on the server.

### 4.8 Forms

- Adding and editing happen in a modal dialog titled "Add contact" or "Edit contact", with Save as the primary button and Cancel.
- Labels sit above their fields. The name is marked "(required)", and other fields have no mark.
- Errors show under their field, linked to it, and focus moves to the first field with an error. Server errors show at the top of the form.
- Enter saves, and Escape or Cancel closes without saving. After saving, the dialog closes, the list or page updates, and a message says "Contact added" or "Changes saved".
- **Organization form:** Name, Website, Industry and Notes.
- **Contact form:** Name, Email, Phone, Job title, Organization (a searchable picker with "No organization") and Status (Lead, Qualified or Customer as a radio group, with Lead chosen).
- **Deal form:**
  - Name
  - Organization (a searchable picker)
  - Main contact (a searchable picker that follows section 3.4)
  - Stage (a select)
  - Value (US$)
  - Probability (%)
  - Close date (a date picker)
  - Changing the stage fills in the probability, and today's date for Won or Lost, as section 3.2 says.
- **Pickers** search the server as the person types and show up to 20 matches.

### 4.10 Delete confirmations

Deleting always opens an alert dialog first, with Cancel focused. The delete button names what it deletes and uses Raspberry ink. The text uses the record's real counts:

- **Organization:** "Delete Northpeak? Its 4 contacts and 3 deals will be kept, without an organization. This can't be undone." Button: "Delete organization".
- **Contact:** "Delete Jane Doe? Their 2 deals will be kept, without a main contact. Their 6 activities will be deleted. This can't be undone." Button: "Delete contact".
- **Deal:** "Delete Website redesign? Its 5 activities will be deleted, including its stage changes. This can't be undone." Button: "Delete deal".
- **Activity:** "Delete this call from Nov 12? This can't be undone." Button: "Delete activity".

Parts with a count of 0 are left out. After deleting from a record's page, the app goes to that section's table.

### 4.11 Messages and errors

- **Messages** appear at the bottom right, are read out by screen readers, and close after 5 seconds. Errors stay until closed.
- **Server not running:** a banner at the top of the main area says "Can't reach Accountable. Check that it's still running, then try again." with a "Try again" button.
- **A record that no longer exists:** "This contact no longer exists." with a link to Contacts.
- **Loading:** grey placeholder blocks in the shape of the content, never a spinner on its own.
