# Testing

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

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
- **Light and dark mode:**
  - reading, saving and showing the choice, with light when nothing usable is stored or storage is blocked
  - the "Dark mode" toggle, by mouse and keyboard
  - the color tokens: every contrast pair in section 5.2 in both modes, a dark value for every color, and no color written outside `tokens.css`

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
  7. dark mode: light by default, the toggle, the choice kept after a reload and a restart, on every screen and at 320 px, and charts, dialogs and messages following it
- **Accessibility:** axe (`@axe-core/playwright`, with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`) on every screen, on each form dialog and on each delete dialog, and with an icon button's tooltip open, in light mode and in dark mode. It must find no violations in either. The tooltip shows the button's name on hover and on keyboard focus.
- **Keyboard only:**
  - add a contact
  - log an activity and mark its follow-up done
  - move a deal to another column and to another place with the keyboard drag
  - move one with the "More" menu
  - choose a far stage on a deal's stage path, passing other stages with the arrow keys without changing them
  - delete a deal
  - switch to dark mode and back
- **Performance:** section 7.

### 10.4 The hands-on check

For the hands-on acceptance check, start Accountable with `npm run dev` from a fresh clone and follow the salesperson's workflow through all five sections in Chrome. Check the actions in section 10.3, confirm saved changes survive a restart and verify that the reset restores the sample data. Check each screen against the visual design and accessibility requirements in light mode and in dark mode, exercise the workflow with the keyboard and watch the console for errors. Record the results in [STATUS.md](../STATUS.md).
