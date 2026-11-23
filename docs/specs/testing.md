# Testing

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 10. Testing

No test touches Supabase or needs anyone's password, and CI needs no secrets. Every test run leaves the Supabase settings out, so the app under test is a local copy (section 9.8). Every unit test runs in under a second on a developer's computer, because CI runs on a much slower machine.

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
- **Today** in the time zone that `TZ` sets, on either side of midnight UTC.
- **Card order:** midpoints, the top and bottom of a column, and renumbering.
- **Tokens,** with signing keys the test makes, and no network:
  - a valid token passes, and the person comes from it
  - a missing, expired or badly signed token, the wrong audience, the wrong issuer and an unknown key each get 401, on every route but the three open ones
  - a person named in a request's body or address is ignored
  - the keys are fetched once and kept, and again for an unknown key
- **People:** a person's row made and kept up to date from the token, and how they show, with a name and with only an email.
- **Who added and changed a record:** adding, editing, a stage change, a board move, a follow-up marked done, and a contact made a customer by a Won deal each set the right people. A delete's `SET NULL` leaves `updated_by` alone.
- **Search in the top bar:** part of a name in any case, names that start with the search first, at most 5 of each kind, and the details.
- **Both databases:** the search and sort expressions, compiled for Postgres without a Postgres server, fold case as they do on SQLite. The migrations, run on an empty SQLite database, make the tables the app expects.
- **Settings:** all three Supabase settings or none, and a stop that names the missing ones. Local sign-in refused on Supabase and when the backend doesn't listen on `127.0.0.1`. `npm run seed` refusing when `DATABASE_URL` is set.
- **Sample data:** the counts in section 8, the three teammates, someone recorded on every record and activity, and dates that move with the day it's loaded.
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
- **People:** how a person shows, and their initials, from names and from emails.
- **The sign-in screen,** with Supabase's client replaced by a stand-in: empty fields, a wrong password, no answer, too many attempts, and success. The local sign-in list.
- **A session that ends:** a 401 shows the sign-in screen with its message, and signing in returns to the same page.
- **The search box:** the 250 ms wait, the groups and details, no matches, opening a match, and the keys.
- **The theme:**
  - reading, saving and showing Light, Dark and System, with light when nothing usable is stored or storage is blocked
  - System following the device's setting, and changing with it
  - a `light` or `dark` stored before this change still working
  - the user menu, by mouse and keyboard: each theme, and signing out
  - the color tokens: every contrast pair in section 5.2 in both modes, a dark value for every color, and no color written outside `tokens.css`

### 10.3 End-to-end tests (Playwright Test, installed Chrome)

- The tests run in installed Google Chrome. They start the app themselves, as a local copy, and reset their own database to sample data before each file. They sign in as a made-up teammate through local sign-in.
- Unexpected console errors, uncaught page errors and requests to addresses other than `127.0.0.1` fail the tests.
- **Product workflows covered by the suite**
  1. start, the sign-in screen first, then the dashboard, and sample data everywhere
  2. add, search, sort, edit and delete on each table, kept after a reload, and reset
  3. the status filter, linked records, and the deal form's contacts
  4. the pipeline, by mouse: moves, Won, reopening, order kept after a reload, totals, adding from a column, late cards
  5. timelines and follow-ups
  6. the dashboard's figures against the data
  7. the theme: light by default, Light, Dark and System from the user menu, System following Chrome's emulated light and dark settings, the choice kept after a reload, a restart and signing out, on every screen, the sign-in screen and at 320 px, and charts, dialogs and messages following it
  8. signing in and out: signed out, every address shows the sign-in screen and every API route but the three open ones answers 401. Signing in opens the address asked for. A 401 during a session shows "Your session has ended. Sign in again." Signing out shows the sign-in screen, and Back shows no records
  9. search in the top bar: an organization, a contact and a deal found by part of a name in another case, at full width and from the Menu at 320 px
  10. who added and changed a record: a record added by one teammate and changed by another shows both names, and an activity shows who logged it
- **Accessibility:** axe (`@axe-core/playwright`, with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`) on every screen, the sign-in screen included, on each form dialog and on each delete dialog, with an icon button's tooltip open, with the user menu open and with search results open, in light mode and in dark mode. It must find no violations in either. The tooltip shows the button's name on hover and on keyboard focus.
  - One rule is left out while the search results are open: `aria-hidden-focus`. React Aria hides the rest of the page from screen readers with `aria-hidden` while any combobox's list is open, and axe flags the links and buttons in it, though focus can't reach them. React Spectrum lists this as a known false positive. A dialog's picker passes, because axe allows it while a modal is open. In its place, the test checks that Tab leaves the box, closes the list and leaves nothing hidden, then runs axe with every rule.
- **Keyboard only:**
  - sign in
  - add a contact
  - log an activity and mark its follow-up done
  - move a deal to another column and to another place with the keyboard drag
  - move one with the "More" menu
  - choose a far stage on a deal's stage path, passing other stages with the arrow keys without changing them
  - delete a deal
  - search for a deal and open it
  - open the user menu, choose Dark, then Light, and sign out
- **Performance:** section 7.

### 10.4 The hands-on check

For the hands-on acceptance check, start Accountable with `npm run dev` from a fresh copy of the working tree without `node_modules/`, `.venv/`, `data/` or `.env`, so it runs as a local copy and never touches the team's data. Sign in as a made-up teammate and follow the salesperson's workflow through all five sections in Chrome. Check the actions in section 10.3, including search, the user menu and signing out. Confirm saved changes survive a restart, after signing in again, and verify that the reset restores the sample data. Check each screen and the sign-in screen against the visual design and accessibility requirements in light mode and in dark mode, exercise the workflow with the keyboard and watch the console for errors.

Then the person who owns the Supabase account checks the shared app, with their own password. With the settings in `.env`, `npm start` runs the built app as Render does. They sign in, add a record, see their name on its page, find it with search, and sign out. A read-only look at the live database through Supabase's MCP server then confirms the tables, row-level security on each one, and who added the new record.

Record the results in [STATUS.md](../STATUS.md).
