# Accountable product spec

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. That makes it hard to see at a glance which companies it deals with, who its contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## 1. Scope

Accountable is a sales CRM that one salesperson runs on their own computer. It brings organizations, contacts, deals and activities together in five sections. The Dashboard shows sales figures, recent activity and follow-ups. Organizations, Contacts and Deals are where the salesperson finds and manages records. The Pipeline shows deals by stage and lets the salesperson move and reorder them.

The app is account-free and uses a desktop light-mode layout. It uses US dollars and a fixed set of sales stages and record fields. The salesperson logs notes, calls and emails in the app. Sales reporting is on the dashboard.

Data is stored on the same computer and persists across browser refreshes and server restarts. The first run installs dependencies and opens the dashboard with sample data. Once installed, the app can be used offline. Section 9.6 covers starting the app and resetting its data. See the [setup instructions](STATUS.md#install-once) and [technical stack](TECH_STACK.md).

## 2. Records

Every record has an `id`, a `created_at` and an `updated_at` (UTC timestamps), as well as the fields below. Only the name is required on organizations, contacts and deals. Text fields are trimmed, and an empty field is stored as empty (null).

### Organization

| Field | Type | Notes |
|---|---|---|
| name | text, required | Up to 200 characters |
| website | text | An `http` or `https` address. `northpeak.example` is saved as `https://northpeak.example` |
| industry | text | Free text |
| notes | long text | |

### Contact

| Field | Type | Notes |
|---|---|---|
| name | text, required | Up to 200 characters |
| email | text | Must look like an email address |
| phone | text | Free text |
| job_title | text | |
| organization | link to an organization | Optional |
| status | `lead`, `qualified` or `customer` | Lead when not given |

### Deal

| Field | Type | Notes |
|---|---|---|
| name | text, required | Up to 200 characters |
| organization | link to an organization | Optional |
| main contact | link to a contact | Optional. Must work at the deal's organization (section 3.4) |
| stage | `new`, `qualified`, `proposal`, `negotiation`, `won` or `lost` | New when not given |
| value | whole US dollars, 0 or more | Optional. An empty value counts as $0 in every total |
| probability | whole percent, 0 to 100 | The stage's usual probability when not given |
| close_date | date | The expected close date while open, the actual one once Won or Lost |
| board_position | number | The card's place in its pipeline column. Lower comes first |

### Activity

| Field | Type | Notes |
|---|---|---|
| type | `note`, `call`, `email` or `stage_change` | People log the first three. The app writes `stage_change` |
| contact or deal | a link to exactly one of them | Set when the activity is logged, and can't be changed |
| description | text, required | |
| occurred_at | date and time | When it happened. Now when not given |
| follow_up_date | date | Optional |
| done | yes or no | No when not given. Used only when there's a follow-up date |

The activity form supplies the current time by default. The API also defaults to the current time when the request omits it.

## 3. Rules

### 3.1 Stages and probability

The stages, in pipeline order, with their usual probability of close:

| Stage | Probability | Open or closed |
|---|---|---|
| New | 10% | Open |
| Qualified | 25% | Open |
| Proposal | 50% | Open |
| Negotiation | 75% | Open |
| Won | 100% | Closed |
| Lost | 0% | Closed |

A probability set by hand is kept until the stage changes.

### 3.2 Changing a deal's stage

All stage changes go through one function on the server, whichever screen they come from. When a deal's stage changes:

1. Its probability defaults to the new stage's usual probability.
2. If the new stage is Won or Lost, its close date defaults to today.
3. If the new stage is Won and the deal has a main contact, the contact's status becomes customer.
4. A `stage_change` activity is written on the deal, such as "Moved from Proposal to Negotiation", dated now.
5. Board moves place the card according to the drop or menu action. Changes made from the deal form or stage path put the card at the top of its new column.

When a Won or Lost deal moves back to an open stage, steps 1, 4 and 5 still apply. Its close date and its contact's status stay as they are. If the close date has passed, the deal shows as late until someone sets a new one.

Moving a card within its own column changes only its place. The app logs an activity automatically only when an existing deal changes stage.

New deals go to the top of their stage's column. A new deal in Won or Lost defaults to today's close date. When a deal is created directly in Won, its main contact becomes a customer if one is set. If that changes the contact's status, the app names the contact in the confirmation message.

The board and stage path use the server defaults. When the stage changes in the deal form, the form fills in the new probability and, for Won or Lost, today's date. The salesperson can change either field before saving. The API uses explicitly supplied values in place of the defaults.

### 3.3 Late deals

A deal is late when it's open (New to Negotiation) and its close date is before today. A deal with no close date is never late.

### 3.4 A deal's organization and main contact

A deal's main contact works at the deal's organization:

- With an organization chosen, the main contact picker lists only that organization's people.
- With no organization chosen, it lists everyone, with each person's organization. Picking someone who has an organization fills it in.
- Changing the organization clears the main contact if they don't work at the new one.
- When a request sends a deal's organization or main contact, the server refuses it if the main contact's organization isn't the deal's.
- A contact with no organization can be the main contact of a deal with no organization.

If a contact later moves to another organization, their deals keep them as main contact. The deal form then shows the mismatch, with "Jane Doe now works at Brightlane", and asks for a new main contact before it can be saved.

### 3.5 Activities and follow-ups

- Notes, calls and emails are logged on a contact's or deal's page. They can be edited or deleted from any timeline that shows them.
- `stage_change` activities can't be edited or deleted. The server refuses with 409, and the screens show no edit or delete for them.
- A follow-up is an activity with a follow-up date that isn't done.
- **Overdue:** its follow-up date is before today.
- **Upcoming:** its follow-up date is today or one of the 6 days after it. That's 7 days, today included.
- Marking a follow-up done removes it from the dashboard. It stays in the timeline, shown as done, and can be marked not done again.

### 3.6 Timelines

- **A deal's timeline:** the deal's activities, stage changes included.
- **A contact's timeline:** the contact's activities, and every activity on deals where they're the main contact today, stage changes included. Each deal entry names its deal.
- An organization has no timeline.
- Newest first, by `occurred_at`, then by `created_at`.

### 3.7 Deleting

| Deleting | Linked records |
|---|---|
| An organization | Its contacts and deals are kept, with no organization |
| A contact | Their deals are kept, with no main contact. Their own activities are deleted |
| A deal | Its activities are deleted, stage changes included |
| An activity | Nothing else changes |

The database enforces these rules with foreign keys: `SET NULL` for links to organizations and contacts, and `CASCADE` for activities.

### 3.8 Figures

- **Expected revenue** of a deal is its value multiplied by its probability as a fraction (50% is 0.5). Totals add up the exact amounts and round to the dollar once.
- **Open pipeline:** the total value of open deals.
- **Won this month:** the total value and the number of Won deals with a close date in the current month.
- **Win rate:** of the deals closed in the last 12 months, the share that were Won, by count. With no closed deals it shows "–".
- **Last 12 months:** the current month and the 11 before it, by close date. Months with nothing show $0 and 0.
- **Revenue won by month** and **deals won by month:** Won deals, grouped by the month of their close date.
- **Funnel:** for each of New, Qualified, Proposal, Negotiation and Won, the total value and number of deals now at that stage or a later one. Won counts at every stage, and Lost isn't counted. Each stage also shows its value as a share of New's.
- **Board totals** include the value and expected revenue of every open deal. Each column shows the count, value and expected revenue of all eligible deals in its stage, including cards behind “Show more.” For Won and Lost, eligibility depends on the close date window in section 4.7.
- **Today** is the date on the computer that runs Accountable.

### 3.9 Formats

- **Money:** US dollars, whole dollars, with thousands separators, such as `$48,000`. Chart axes and the funnel's labels use the short form, such as `$40K` and `$1.2M`. The value field is labelled "Value (US$)".
- **Percent:** whole numbers, such as `75%`.
- **Dates:** `Nov 19, 2026`. Timeline entries add the time: `Nov 19, 2026, 2:30 PM`. Follow-ups say "Due today", "Due tomorrow", "Due Mon, Nov 23" or "3 days overdue".
- **Empty values** display as “–”, including on pipeline cards.
- Formatting uses the browser's `Intl` API with the `en-US` locale.

## 4. Screens

### 4.1 The app shell

- **Top bar,** 64 px tall, on the page background with no line under it. It has the Accountable wordmark on the left, which links to the dashboard, and the five sections: Dashboard, Organizations, Contacts, Deals and Pipeline. The current section is a Midnight pill with white text, and has `aria-current="page"`. The bar stays at the top as the page scrolls.
- **Main area:** at most 1,440 px wide and centered, with 32 px side margins. Each screen has one `h1`, its title, with the screen's main action on the right of it, such as "Add contact".
- **Skip link:** "Skip to main content" is the first thing on the page, and shows when it has focus.
- **Narrow windows** reflow down to 320 px, the equivalent of a 1,280 px screen at 400% zoom. At 860 px and below, a “Menu” button holds the sections. Grids stack as space narrows, and tables and the board scroll sideways within their panels.
- **Addresses:** `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id` and `/pipeline`. Any other address shows "Page not found", with a link to the dashboard.
- **Page titles:** "Contacts · Accountable", or "Jane Doe · Accountable" on a record's page.

### 4.2 Dashboard

The landing page shows how sales are going at a glance, with the day's work first. A left column, a third of the width, holds the follow-ups and recent activity. A right column, two thirds of the width, holds the figures and charts. The gaps are 24 px. Below 1,100 px wide, the columns stack, follow-ups first.

- **Header:** "Dashboard", with the tagline "Here's how sales are going." beside it in Instrument Serif, and today's date on the right.
- **Left column:**
  - **Follow-ups,** set out like a diary, with a summary such as "4 overdue and 5 due in the next 7 days." Each group has its name on the left and its follow-ups on the right:
    - **Overdue,** in Raspberry ink, with "4 to do" under it, oldest first. Each one says how late it is, after its record: "Lab results integration, 6 days overdue".
    - **One group for each day** in the next 7 days that has follow-ups due: "Today", "Tomorrow", then "Mon, Nov 23" and so on.
    - Each follow-up has a "Done" checkbox, its description, and a link to its contact or deal.
    - Overdue and the next 7 days each show up to 5 follow-ups. A "Show all 12" button opens the rest in place.
    - With none due: "Nothing overdue or due in the next 7 days."
  - **Recent activity,** under the follow-ups, as a timeline: the 10 newest activities with `occurred_at` up to now, stage changes included, joined by a grey line. Each has its type's icon in a circle (Sea Green for stage changes), its description, and then its record and when it happened: "Payments gateway, Today, 10:42 AM".
- **Right column:**
  - **The scoreboard,** one panel with the four figures side by side, each in JetBrains Mono:
    - **Open pipeline:** the total, and "16 open deals".
    - **Expected revenue:** the total, and "Value × probability of close".
    - **Won this month:** the total, and "1 deal".
    - **Win rate:** the percent, and "10 won of 14 closed in 12 months".
    - Under the figures, **Open pipeline by stage** (section 5.6), with "$612,000 in 16 deals" on the right of its heading.
  - **Revenue won by month,** a line chart across the column: 12 months, with a Sea Green line and a light Sea Green fill under it. The tooltip shows the month, the revenue and the number of deals.
  - **Sales funnel** and **Deals won by month,** side by side:
    - **Sales funnel:** one bar per stage from New to Won, centered, in its stage's color, and as wide as its share of New's value. The stage and its number of deals are on the left. Its value, in the short form, and its share are on the right.
    - **Deals won by month:** 12 Cerulean bars, with each month's count above its bar.

Every chart panel has a title, a text summary that states its key figures, and a "Show as table" button that swaps the chart for a table of the same figures. The funnel summary gives each stage's deal count, value and share.

The dashboard loads its figures in one request, and loads them again whenever it opens, so a deal just marked Won or a follow-up just added shows straight away.

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

### 4.4 Organizations

- **Table columns:** Name, Industry, Website, Contacts (a count), Open deals (a count) and Open pipeline (US$).
- **Search** covers name, industry and website.
- **An organization's page:**
  - **Header:** name, industry, the website as a link that opens in a new tab and says so, and Edit and Delete buttons.
  - **Figures:** open pipeline, expected revenue, and won to date.
  - **Notes,** when there are any.
  - **Contacts panel:** name, job title, status, email, and an "Add contact" button with this organization filled in.
  - **Deals panel:** name, stage, value, close date with the late badge, and an "Add deal" button with this organization filled in.
  - No timeline.

### 4.5 Contacts

- **Table columns:** Name, Organization, Job title, Email, Phone and Status.
- **Search** covers name, email, phone, job title and organization name.
- **Status filter:** a segmented control above the table with "All 40", "Leads 16", "Qualified 10" and "Customers 14". The chosen one is a Midnight pill with white text. The counts follow the search.
- **A contact's page:**
  - **Header:** name, status pill, "Job title at Organization" (with a link), email as a `mailto:` link, phone as a `tel:` link, and Edit and Delete buttons.
  - **Left, 8 columns:** the log-activity form, then the timeline (section 4.9).
  - **Right, 4 columns:** a Deals panel with the deals where they're the main contact (name, stage pill, value, late badge), and an "Add deal" button with this contact and their organization filled in.

### 4.6 Deals

- **Table columns:** Name, Organization, Main contact, Stage, Value, Probability, Expected revenue and Close date. A late deal has a "Late" badge next to its close date.
- **Search** covers name, organization name and main contact name. Sorting by Stage follows pipeline order.
- **A deal's page:**
  - **Header:** name, stage pill, late badge, and Edit and Delete buttons.
  - **Facts:** value, probability, expected revenue, close date, organization (a link) and main contact (a link).
  - **Stage path:** the six stages as a row of buttons, New to Negotiation joined left to right, then Won and Lost. The current stage is filled in its color, with a check icon. Choosing another stage with a click, Space or Enter changes it at once, following section 3.2, and a message says what changed. The arrow keys only move focus along the row, so passing a stage, such as Won on the way to Lost, never changes the deal.
  - **Below:** the log-activity form, then the timeline.

### 4.7 Pipeline

- **Header:** "Pipeline", with "Add deal" on the right.
- **Summary panel:** open pipeline, expected revenue and open deals, in JetBrains Mono. Beside them is the same open-pipeline-by-stage bar as the dashboard's, headed "By stage".
- **Board:** six columns side by side, in stage order. Each is at least 200 px wide and they share the width equally. If the window is too narrow, the board scrolls sideways inside its area.
- **Columns** sit on the page background with no panel. Each column header has:
  - a stage pill (section 5.6) with the stage's name and its card count
  - a "+" button labelled "Add deal to Proposal"
  - under them, the column's value, and "Expected" with its expected revenue
  - for Won and Lost, "Closed in the last 30 days". These two columns show only deals with a close date from 30 days ago to today.
- **Card visibility.** Each column initially displays up to 50 cards. “Show N more” reveals the remaining cards in that column. Dropping below the last visible card inserts the moved card before any hidden cards.
- **Cards** are white. From top to bottom, each one has:
  - a grip handle button ("Move Website redesign"), the deal name, which links to the deal, and a "More" menu button
  - the organization
  - the value in JetBrains Mono, with the main contact's initials in a circle on the right. The contact's full name is the circle's tooltip and accessible name. A deal with no main contact has no circle.
  - a probability meter (section 5.6), with the percent beside it
  - the close date with a calendar icon, or the late badge and the date
- **Dragging:** a card can be dragged by the card or its handle to any column, and to any place in a column. A drop line shows where it will land. When it's dropped:
  - the card stays where it was dropped
  - the totals change straight away
  - the server saves the move
  - if the save fails, the card goes back and a message says so
- **Moving to Won:** the message says "Website redesign moved to Won. Jane Doe is now a customer." when the contact's status changed.
- **The "More" menu** opens under its button. It has three groups:
  - "Move to", then each other stage, each with a small square in its color.
  - "Move up" and "Move down".
  - "Open" and "Edit".

  The menu gives a way to make every move without dragging, for keyboard users, screen-reader users and people who can't drag. A card moved to another stage from the menu goes to the top of that column. After a move, focus returns to the moved card's More button.
- **Keyboard dragging:** see section 6.
- **Adding:** a deal added from a column starts at that stage, at the top of the column. A deal added from the header starts at New.

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

### 4.9 Activities and timelines

- **The log-activity form** sits above the timeline on a contact's or deal's page:
  - **Type:** Note, Call or Email, a radio group with icons. Note is chosen.
  - **Description**
  - **When:** date and time, set to now.
  - **Follow-up date:** optional.
  - **“Log activity”** saves the entry in the timeline at its occurrence time and clears the form.
- **A timeline entry** shows:
  - its type's icon and name
  - its description
  - when it happened
  - for a deal's entry on a contact's timeline, "on Website redesign" with a link
  - any follow-up, as "Follow up Nov 24" with a "Done" checkbox, and "Overdue" in Raspberry ink when it's overdue
  - Edit and Delete buttons on notes, calls and emails. Edit opens the same fields in a dialog.
- **Stage changes** show an arrow icon and "Moved from Proposal to Negotiation", with no edit or delete.
- A timeline shows its 50 newest entries, then a "Show older" button.
- With no entries: "Nothing logged yet."

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

## 5. Visual design

### 5.1 Approach

The interface follows the [Accountable brand guidelines](../.claude/skills/brand/SKILL.md). White panels sit on a cool grey page with Midnight text. Color identifies stages, statuses, alerts and the main action. Monospace figures line up, and the revenue line has a gradient fill.

### 5.2 Color tokens

The brand's colors are too light for small text on white, and two of its pairings are below WCAG AA for small text. White on Cerulean is 3.96:1, and white on Raspberry is 3.62:1, where AA needs 4.5:1. Each brand color therefore has an "ink" shade, a darker version of the same hue that reaches 4.5:1 on both white and the page background. The brand skill lists the same shades. The brand colors stay for fills with Midnight text, large shapes and chart areas. The ink shades are for text, lines, icons, and badges with white text.

All colors are CSS custom properties on `:root`.

| Token | Value | Used for | Contrast |
|---|---|---|---|
| `--page` | `#F0F4F5` | Page background | |
| `--panel` | `#FFFFFF` | Panels, cards, dialogs, inputs | |
| `--ink` | `#073B4C` Midnight | Text, icons, the Won fill | 12.1:1 on white, 10.9:1 on page |
| `--ink-muted` | `#456C79` | Secondary text, captions, axis labels | 5.7:1 on white, 5.2:1 on page |
| `--line` | `#DAE2E4` | Table dividers, chart grid lines | Decorative |
| `--control` | `#77939D` | Input, checkbox and radio borders | 3.3:1 on white |
| `--subtle` | `#E6EBED` | Row hover, the Lost fill, column drop area | Midnight text 10.0:1 |
| `--primary` | `#06D6A0` Sea Green | Primary buttons, New, Customer | Midnight text 6.4:1 |
| `--primary-hover` | `#05C291` | Primary button hover | Midnight text 5.2:1 |
| `--primary-ink` | `#008050` | Sea Green text, the revenue line | 5.0:1 on white |
| `--secondary` | `#FFC145` Marigold | Qualified (stage and status) | Midnight text 7.5:1 |
| `--secondary-ink` | `#9B6200` | Marigold text | 5.1:1 on white |
| `--tertiary` | `#F78C6B` Coral | Proposal, Lead | Midnight text 5.1:1 |
| `--tertiary-ink` | `#B65132` | Coral text | 5.0:1 on white |
| `--info` | `#118AB2` Cerulean | Chart bars, large shapes | 4.0:1 on white |
| `--info-ink` | `#00789F` | Links, the focus ring, the Negotiation fill with white text | 5.0:1 on white |
| `--alert` | `#EF476F` Raspberry | Large alert shapes | 3.6:1 on white |
| `--alert-ink` | `#D22758` | Late and Overdue badges, delete buttons, error text | White text 5.0:1 |

### 5.3 Stage and status colors

The pipeline has six stages and the brand has five colors. The four open stages follow the brand's order. Won takes Midnight, and Lost a neutral grey. Raspberry stays free for alerts, so "late" and "overdue" never look like a stage.

| Stage | Fill | Text on it |
|---|---|---|
| New | Sea Green `--primary` | Midnight |
| Qualified | Marigold `--secondary` | Midnight |
| Proposal | Coral `--tertiary` | Midnight |
| Negotiation | Cerulean ink `--info-ink` | White |
| Won | Midnight `--ink` | White |
| Lost | Grey `--subtle` | Midnight |

| Contact status | Fill | Text on it |
|---|---|---|
| Lead | Coral | Midnight |
| Qualified | Marigold | Midnight |
| Customer | Sea Green | Midnight |

Stages and statuses always show their name in text, so color is never the only sign. The late badge is `--alert-ink` with white text, a clock icon and the word "Late".

### 5.4 Type

All fonts are bundled from npm (Fontsource), so the app needs no internet connection.

- **Instrument Sans** (variable) for headings and body:
  - Page titles: 28 px, weight 600.
  - Panel titles: 18 px, weight 600.
  - Body: 15 px, line height 1.5.
  - Tables and cards: 14 px.
  - Captions: 13 px.
  - Nothing is smaller than 12 px.
- **JetBrains Mono** for numbers: money, percentages, counts and the scoreboard's figures, with tabular figures. The scoreboard's figures use 34 px, weight 500. Money in tables is right-aligned.
- **Instrument Serif,** italic, only for the dashboard's tagline (22 px).

### 5.5 Space, shape and depth

- **Spacing:** a 4 px scale of 4, 8, 12, 16, 24, 32 and 48. Panels have 24 px padding.
- **Corners:** 16 px on panels and dialogs, 12 px on cards, 10 px on buttons and inputs, and fully round on pills.
- **No outlines on panels,** and no line on just one edge of anything. White panels on the grey page give the separation.
- **Shadows:** none on panels. Board cards have `0 1px 2px rgb(7 59 76 / 8%)`. A card being dragged has `0 12px 24px rgb(7 59 76 / 18%)`. Dialogs have `0 24px 48px rgb(7 59 76 / 24%)` over a backdrop of `rgb(7 59 76 / 40%)`.
- **Focus:** a 2 px `--info-ink` outline with a 2 px gap, on everything that can take focus.
- **Click targets:** at least 32 px tall for buttons and inputs, and never under 24 × 24 px.
- **Motion** uses a 150 ms ease-out transition on hover where applicable and respects the system's reduced-motion setting.

### 5.6 Components

- **Primary button:** Sea Green with Midnight text, weight 600.
- **Secondary button:** `--subtle` with Midnight text.
- **Destructive button:** `--alert-ink` with white text.
- **Icon buttons:** Midnight icons, with a `--subtle` background on hover, a visible label in a tooltip, and the same text as their accessible name.
- **Inputs:** white, with a 1 px `--control` border and 10 px corners. Fields in an error state get an `--alert-ink` border and the error text under them.
- **Pills:** 13 px, weight 600, fully round, with the fills from section 5.3.
- **Icons:** Lucide, at 16 or 20 px.
- **Panels:** white, with 16 px corners and 24 px padding, and the title at top left.
- **Open pipeline by stage:** a 14 px bar split into the four open stages. Each part is in its stage's color and as wide as its share of the open value, with 2 px gaps and 4 px rounded outer ends. Under each part are the stage's name, with a small square in its color, and its value in JetBrains Mono. The bar itself is decoration. The names and values carry the meaning.
- **Stage pill with count:** the stage's fill and text color (section 5.3), 30 px tall, with the count in JetBrains Mono on a small white badge at 55% opacity.
- **Contact initials:** a 26 px `--subtle` circle with up to two initials, 11 px, weight 700.
- **Probability meter:** a 4 px `--subtle` track with a Midnight fill as wide as the probability, and the percent in JetBrains Mono beside it. The meter is decoration. The percent is the text.
- **Menus:** a white panel with 12 px corners, 6 px padding and a dialog-like shadow. Items are 34 px tall, with a `--subtle` background on hover and focus. Groups are separated by a 1 px `--line` rule.

### 5.7 Charts

- **Recharts.** Each chart shows one series, so no chart needs a legend.
- **The revenue line** uses a 2 px stroke in `--primary-ink` and a Sea Green fill that fades to transparent. It labels the peak and latest values when the peak is above zero, and highlights the active point.
- **The deals-won bars:** `--info`, with the count above each bar in Midnight.
- **The funnel bars:** centered, 30 px tall, in each stage's fill, with the figures in text on either side. Light fills always have their value in text next to them, which WCAG accepts in place of 3:1 contrast for the shape.
- **Grid lines:** horizontal only, in `--line`.
- **Axes** use 12 px `--ink-muted` labels, with money in the short form.
- **Tooltips:** a white panel with a shadow and numbers in JetBrains Mono. They can be reached with the keyboard (Recharts' accessibility layer).

### 5.8 Words

Plain business English. Short labels, sentence case, and no exclamation marks. Buttons say what they do: "Add deal", "Log activity" and "Delete contact", never "Submit" or "OK". Money always shows its currency.

## 6. Accessibility

The accessibility standard is WCAG 2.2 AA across all screens. Section 10 describes how keyboard access, reflow and axe checks are verified.

- **Structure:**
  - Landmarks: header, nav and main.
  - One `h1` per screen, with headings in order.
  - `lang="en"` on the page.
  - Real `table` elements for tables.
  - When a new screen opens, focus moves to its `h1` and the page title updates. Searching, sorting and paging don't move focus.
- **Keyboard:**
  - Everything works without a mouse, in a sensible tab order.
  - Dialogs keep focus inside them, close on Escape, and return focus to what opened them.
  - Menus, pickers and radio groups use the arrow keys.
  - On a narrow screen, focus a control in the pipeline board or a linked table and use Left and Right to scroll the panel.
- **The board with a keyboard:**
  - Tab to a card's grip handle, and press Space or Enter to pick the card up.
  - Up and Down move it within its column, and Left and Right move it to the next column.
  - Space or Enter drops it. Escape or Tab cancels the move.
  - A live region says each step: "Picked up Website redesign, in Proposal, position 2 of 5", "Over Negotiation, position 1 of 3", "Dropped in Negotiation, position 1 of 3".
  - The "More" menu does the same moves without dragging.
- **Dragging (2.5.7):** every move a drag can make, the "More" menu can make too.
- **Focus (2.4.7 and 2.4.11):** the focus ring always shows, and the top bar never covers focused content: `scroll-padding-top` matches its height.
- **Contrast:** text is at least 4.5:1, and large text, controls and chart shapes at least 3:1, through the tokens in section 5.2.
- **Color:** stages, statuses, late and overdue always have text as well.
- **Reflow, zoom and spacing:** the layout works at 320 px wide and at 200% text size, and with the text spacing WCAG 1.4.12 describes. Tables and the board may scroll sideways, which WCAG allows.
- **Forms:** visible labels, errors linked to their fields, and required fields marked in text.
- **Charts:** a summary in text and a table of the same figures, as section 4.2 describes.
- **Messages:** search counts, saves and moves are read out through live regions.
- **Motion:** respects the system's reduced-motion setting.

React Aria Components provides the dialogs, menus, pickers, selects, radio groups, checkboxes and date pickers, so their keyboard and screen-reader behavior comes from the library.

## 7. Performance

Every screen opens in under a second with about 1,000 organizations, 5,000 contacts, 2,000 deals and 20,000 activities.

- **Tables** search, sort and page on the server, 50 rows at a time. Each table has indexes on its links and the columns it sorts by.
- **The dashboard** works out its figures in SQL and sends them in one response.
- **The board** loads the cards and totals in one request. It renders up to 50 cards per column initially, as described in section 4.7.
- **Timelines** load 50 entries at a time.
- **Pickers** ask for 20 matches at a time.
- **SQLite** runs in WAL mode, with foreign keys on.

**How it's measured:** the performance test loads the large data set into its own database. For each screen (the dashboard, the three tables, a record's page of each kind, and the pipeline), it times from the start of navigation to the screen's main content showing, in Chrome, after one warm-up load. Every screen must be under 1,000 ms on a developer's computer. On GitHub's runners, which load the dev server's modules more slowly, the limit is 4,000 ms, and the test gets three times its usual time.

## 8. Sample data

The sample data is written by hand, so it reads like a real business. It's the same every time, apart from its dates, which are set relative to the day it's loaded. It loads when the database is new, and whenever `npm run seed` runs.

- **15 organizations** across software, manufacturing, healthcare, retail, logistics, financial services, education, hospitality, construction and energy. The names are made up, and websites and emails use the reserved `.example` domain, such as `northpeak.example`, so no real company or person appears.
- **40 contacts:** 16 leads, 10 qualified and 14 customers. Four have no organization.
- **30 deals,** from $2,000 to $120,000:
  - 5 New, 4 Qualified, 4 Proposal and 3 Negotiation. That's 16 open, 3 of them late.
  - 10 Won, spread over the last 12 months, 2 of them in the last 30 days.
  - 4 Lost, 1 of them in the last 30 days.
  - Every Won deal's main contact is a customer.
- **80 activities** (notes, calls and emails over the last six months), on both contacts and deals:
  - 4 overdue follow-ups.
  - 5 follow-ups due in the next 7 days, one of them today.
  - 3 follow-ups already done.
- **Stage changes:** each deal past New also has one stage change, for its last move.

**The large data set,** for the performance test only, is made by a generator with a fixed random seed. It has about 1,000 organizations, 5,000 contacts, 2,000 deals and 20,000 activities. Half the deals are open, and the rest closed over the last two years. The seed command loads it with `--large`.

## 9. Architecture

### 9.1 The repository

```
package.json        npm scripts; frontend/ is a workspace
pyproject.toml      Python project, with uv.lock beside it
scripts/dev.mjs     the one command: install, start both servers, open the browser
backend/app/        FastAPI app: shared database code, then one folder per area
backend/tests/      pytest
frontend/src/       React app: shared components, helpers and styles, then one folder per area
e2e/                Playwright Test, with its config and the accessibility and performance tests
data/               the SQLite databases (git-ignored)
```

### 9.2 Frontend

| Need | Library |
|---|---|
| UI | React 19, TypeScript, built with Vite 8 |
| Routing | React Router 8 |
| Server data | TanStack Query 5: one hook per request, and every change refreshes what it affects |
| Tables | TanStack Table 9, in manual mode, as the server sorts and pages |
| Charts | Recharts 3 |
| Drag and drop | dnd kit (`@dnd-kit/react`), with its keyboard sensor and screen-reader announcements |
| Dialogs, menus, pickers, dates | React Aria Components |
| Messages | Sonner |
| Icons | Lucide |
| Fonts | Fontsource: Instrument Sans, Instrument Serif and JetBrains Mono |
| Styles | CSS Modules, with tokens as custom properties in `styles/tokens.css` |

The lockfiles record the dependency versions used by the app.

### 9.3 Backend

- Python 3.12, with FastAPI, Uvicorn, Pydantic 2 and SQLAlchemy 2.1 Core for application queries.
- The tables and the rules in section 3 live in their own modules, so the routes stay thin and the rules can be unit tested without HTTP.
- Functions that depend on today take it as an argument, so tests can fix the date.
- Errors use FastAPI's shapes: 422 for invalid input, with the field and the message, 404 for a missing record, and 409 for editing or deleting a stage change.

### 9.4 API

All paths start with `/api`. Lists return `{ "items": [...], "total": n }`.

| Method and path | Does |
|---|---|
| `GET /health` | Says the server is up |
| `GET /organizations?q&sort&dir&page&page_size` | Lists organizations, with contact and deal counts and open pipeline |
| `POST /organizations` | Adds one |
| `GET /organizations/{id}` | One organization, with its contacts, deals and figures |
| `PATCH /organizations/{id}` | Changes the fields sent |
| `DELETE /organizations/{id}` | Deletes it (section 3.7) |
| `GET /contacts?q&status&organization_id&sort&dir&page&page_size` | Lists contacts, with their organization, deal and activity counts, and the count for each status |
| `POST /contacts`, `GET`, `PATCH` and `DELETE /contacts/{id}` | As for organizations. `GET` includes their deals |
| `GET /contacts/{id}/timeline?offset&limit` | The contact's timeline (section 3.6) |
| `GET /deals?q&sort&dir&page&page_size` | Lists deals, with their organization, contact, expected revenue, late flag and activity count |
| `POST /deals`, `GET`, `PATCH` and `DELETE /deals/{id}` | As above. A stage in `POST` or `PATCH` follows section 3.2. `POST` and `PATCH` return the deal and any contact they made a customer |
| `POST /deals/{id}/move` | Body `{ "stage", "before_id" }`: moves a card to a stage and to just above the card `before_id`, or to the bottom when it's null. Returns the deal and any contact it changed |
| `GET /deals/{id}/timeline?offset&limit` | The deal's timeline |
| `POST /activities` | Logs a note, call or email on a contact or a deal |
| `PATCH` and `DELETE /activities/{id}` | Changes or deletes one. 409 for a stage change |
| `GET /pipeline` | The board's columns, cards and totals |
| `GET /dashboard` | Every dashboard figure, the follow-ups and the recent activity |

Each record's `GET` also returns the counts its delete message needs (section 4.10).

**Card order:** each deal has a `board_position`. A dropped card takes the midpoint of its new neighbors' positions. A card at the top takes one less than the first. When two neighbors get closer than 0.000001, the server renumbers that column 1, 2, 3 and so on, in the same transaction.

### 9.5 Database

- One SQLite file, `data/accountable.db`, made on first start and filled with the sample data. The `ACCOUNTABLE_DB` environment variable points elsewhere, and the tests use it to keep their own databases.
- Foreign keys are switched on for every connection, so the delete rules in section 3.7 hold.
- The app creates the schema when it starts. `npm run seed` rebuilds the tables and replaces their contents in one transaction.

### 9.6 Commands

- **`npm run dev`** runs `scripts/dev.mjs`, which uses only Node's own modules:
  1. It checks that Node.js 24 or later and uv are installed, and if not, says how to install them.
  2. It runs `npm install` when `node_modules/.package-lock.json` is missing or older than `package-lock.json`. It runs `uv sync` on every start.
  3. It starts the backend on `127.0.0.1:8000` and Vite on `127.0.0.1:5173`, which passes `/api` to the backend.
  4. It waits for `/api/health`, then opens the browser at the dashboard.
  5. Ctrl+C stops both servers.
  6. If a port is in use, it says "Port 5173 is in use. Is Accountable already running?".
- **`npm test`** runs the frontend type check, both unit test suites and the end-to-end tests. It requires 80% line coverage in the frontend and 80% statement coverage in the backend. It attempts every check and exits nonzero if any fail. The end-to-end tests start their own servers on other ports, with their own database.
- **`npm run check`** checks formatting, linting, types and secrets, and runs `npm test`. ESLint and Ruff limit each function's cyclomatic complexity to 15. Gitleaks scans Git history, the index and the working tree. The working-tree scan honors Git ignore rules, including the local `.env`.
- **`npm run check:quick`** runs the same checks and skips the end-to-end suite.
- **`npm run format`** applies Prettier formatting to the frontend and Ruff formatting to the backend.
- **`npm run seed`** resets the database to the sample data. It works while the app is running, and a refresh then shows the sample data. `npm run seed -- --large` loads the performance data set instead.

The first run needs an internet connection to download packages and Python. After that, Accountable needs none.

### 9.7 Security

- Both servers listen on `127.0.0.1` only, so other computers on the network can't reach the app.
- The backend accepts only `localhost` and `127.0.0.1` in the `Host` header.
- Application queries use SQLAlchemy with bound parameters.
- React escapes all text. Website links must be `http` or `https`, and open with `rel="noopener noreferrer"`.
- The local setup uses no credentials, and Git ignores the database file.

## 10. Testing

### 10.1 Backend unit tests (pytest)

- **Stage changes:** the probability, the close date for Won and Lost, the contact becoming a customer on Won, the stage-change activity, and a reopened deal keeping its close date and its contact's status.
- **Hand-set probabilities:** kept until the stage changes, and fields sent in the request win over the defaults.
- **Deletes:** each rule in section 3.7, through the real foreign keys.
- **A deal's main contact:** refused when they work elsewhere, and accepted with no organization.
- **Stage changes are read-only:** editing or deleting one gets 409.
- **Lists:** search, sort with empty values last, paging, and the status counts.
- **Figures,** with a fixed today:
  - expected revenue and rounding
  - open pipeline, Won this month and win rate
  - the 12 months, with empty months included
  - the funnel, with Won included and Lost left out
  - overdue and upcoming follow-ups at the edges of the 7 days
  - late deals
- **Card order:** midpoints, the top and bottom of a column, and renumbering.
- **Sample data:** the counts in section 8, and dates that move with the day it's loaded.
- **Persistence:** saved records are available when the app starts again.

### 10.2 Frontend unit tests (Vitest)

- Money, percent, date and follow-up formats.
- The stage list and its probabilities.
- **The deal form:**
  - picking an organization limits the contacts
  - picking a contact fills in their organization
  - changing the stage fills in the probability and, for Won and Lost, the date
- The delete messages for each record, with counts of 0 left out.
- Chart summaries and follow-up groups.
- Pipeline ordering, totals and move announcements.

### 10.3 End-to-end tests (Playwright Test, installed Chrome)

- The tests run in installed Google Chrome. They start the app themselves and reset their own database to sample data before each file.
- Unexpected console errors, uncaught page errors and requests to addresses other than `127.0.0.1` fail the tests.
- **Product workflows covered by the suite**
  1. start, dashboard first, sample data everywhere
  2. add, search, sort, edit and delete on each table, kept after a reload, and reset
  3. the status filter, linked records, and the deal form's contacts
  4. the pipeline, by mouse: moves, Won, reopening, order kept after a reload, totals, adding from a column, late cards
  5. timelines and follow-ups
  6. the dashboard's figures against the data
- **Accessibility:** axe (`@axe-core/playwright`, with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`) on every screen, on each form dialog and on each delete dialog. It must find no violations.
- **Keyboard only:**
  - add a contact
  - log an activity and mark its follow-up done
  - move a deal to another column and to another place with the keyboard drag
  - move one with the "More" menu
  - choose a far stage on a deal's stage path, passing other stages with the arrow keys without changing them
  - delete a deal
- **Performance:** section 7.

### 10.4 The hands-on check

For the hands-on acceptance check, start Accountable with `npm run dev` from a fresh clone and follow the salesperson's workflow through all five sections in Chrome. Check the actions in section 10.3, confirm saved changes survive a restart and verify that the reset restores the sample data. Check each screen against the visual design and accessibility requirements, exercise the workflow with the keyboard and watch the console for errors. Record the results in [STATUS.md](STATUS.md).
