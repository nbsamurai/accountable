# Shared rules and screens

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 2. Records

Every organization, contact, deal and activity has an `id`, a `created_at` and an `updated_at` (UTC timestamps), and a `created_by` and an `updated_by`, the people who added it and last changed it (section 3.11), as well as the fields listed under Records in its area file. Only the name is required on organizations, contacts and deals. Text fields are trimmed, and an empty field is stored as empty (null).

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

- **Top bar,** 64 px tall, on the page background with no line under it. It has the Accountable wordmark on the left, which links to the dashboard, then the five sections: Dashboard, Organizations, Contacts, Deals and Pipeline. The current section is a `--fill-strong` pill (Midnight with white text, or Sea Mist with Midnight text in dark mode), and has `aria-current="page"`. The search box (section 4.12) comes next, and the signed-in person's initials, which open the user menu (section 4.14), are at the right end. The bar stays at the top as the page scrolls.
- **Theme:** Light, Dark or System, chosen in the user menu (section 4.14). Light is the default. Dark switches the whole app to dark mode, the sign-in screen, charts, dialogs and messages included. System follows the device's light or dark setting, and changes with it while the app is open. The browser remembers the choice per browser profile, across reloads, restarts and signing out, in `localStorage` under `accountable-theme`, as `light`, `dark` or `system`. A dark choice, or System on a device set to dark, applies before the page first shows, so it never flashes white or light. If the browser blocks storage, the choice still works until the page reloads.
- **Main area:** at most 1,440 px wide and centered, with 32 px side margins. Each screen has one `h1`, its title, with the screen's main action on the right of it, such as "Add contact".
- **Skip link:** "Skip to main content" is the first thing on the page, and shows when it has focus.
- **Narrow windows** reflow down to 320 px, the equivalent of a 1,280 px screen at 400% zoom. At 1,100 px and below, a “Menu” button holds the sections. At 640 px and below, it holds the search box too, above the sections. The initials button stays in the top bar, outside the menu, at every width. Grids stack as space narrows, and tables and the board scroll sideways within their panels.
- **Addresses:** `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id` and `/pipeline`. Any other address shows "Page not found", with a link to the dashboard. Signed out, every address shows the sign-in screen instead (section 4.13).
- **Page titles:** "Contacts · Accountable", or "Jane Doe · Accountable" on a record's page, and "Sign in · Accountable" on the sign-in screen.

### 4.3 Tables

Organizations, Contacts and Deals share one table design:

- **Toolbar:** a search box ("Search contacts") and any filters. The page header holds the add button ("Add contact").
- **Search** waits 250 ms after typing stops and matches any part of the fields listed for each table. Case folding covers A to Z, the same on SQLite and on Postgres. A live region announces the number of matches, such as “12 contacts.”
- **Sorting:** every column heading is a button. The first click sorts A to Z or smallest first, and the second reverses it. Text sorts ignore case, the same on SQLite and on Postgres. The heading shows an arrow and sets `aria-sort`. Empty values always go last. Each table sorts by name, A to Z, to begin with.
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
- **No answer from the server:** a banner at the top of the main area says "Can't reach Accountable. Check your internet connection, then try again." with a "Try again" button.
- **A record that no longer exists:** "This contact no longer exists." with a link to Contacts.
- **Loading:** grey placeholder blocks in the shape of the content, never a spinner on its own.
- **A session that has ended:** see section 3.10.

### 4.12 Search

- **The search box** sits in the top bar, between the sections and the initials button (section 5.6). Its placeholder is "Search", and its accessible name is "Search organizations, contacts and deals". It's 280 px wide, and narrows to 200 px when the bar is short of space. At 640 px and below, it moves into the Menu (section 4.1).
- **What it finds:** organizations, contacts and deals by any part of their name. Case folding covers A to Z, the same on SQLite and on Postgres. It waits 250 ms after typing stops, as the tables do, and searches from the first character.
- **Results** drop down under the box, in up to three groups: "Organizations", "Contacts" and "Deals". Each group shows up to 5 matches. Names that start with the search come first, then the rest, each A to Z. A group with no matches is left out.
- **Each match** shows its name and, under it, one detail: an organization's industry, a contact's organization, or a deal's organization and stage. A detail with nothing in it shows “–”.
- **No matches:** "No matches for "zz"."
- **Choosing a match** opens its page and clears the box. The arrow keys move through the matches across the groups, Enter opens one, and Escape closes the list, then clears the box. A live region announces the number of matches, such as "7 matches."
