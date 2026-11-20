# Plan: building the Accountable MVP

This plan builds the MVP that `docs/spec.md` describes, for the intent in `docs/intent.md`. The spec says what to build. This plan says which files change, in what order to build them, what could go wrong, and which tests prove it works. "Spec 3.2" means section 3.2 of the spec.

The dashboard and pipeline follow mockup 2, `docs/mockups/2-agenda.html`. The mockups are git-ignored, so they're only on this computer.

## 1. Files that change

Only the docs exist so far, so nearly every file is new. Files that already exist are marked "(edit)".

### The repository root

| File | What it holds |
|---|---|
| `package.json` | The scripts `dev`, `test` and `seed`. The test command runs the frontend type check and unit tests, the backend unit tests, and the Chrome end-to-end tests. `frontend` is an npm workspace. Playwright Test and axe are dev dependencies |
| `package-lock.json` | Made by npm |
| `pyproject.toml` | Python 3.12, FastAPI, Uvicorn, Pydantic and SQLAlchemy, with pytest and httpx for the tests, and pytest's settings |
| `uv.lock` | Made by uv |
| `.python-version` | `3.12`, so uv fetches the right Python by itself |
| `scripts/dev.mjs` | The one command (spec 9.6), using only Node's built-in modules |
| `scripts/test.mjs` | Attempts every test suite even after a failure and returns a nonzero exit status if any check fails |
| `.gitignore` (edit) | Adds `data/` |
| `docs/STATUS.md` (edit) | Installing Node.js and uv, the three commands, and what's done |

### How the code is organized

The backend and frontend are both organized by area, and the areas match the screens in the top bar: organizations, contacts, deals, activities, pipeline and dashboard. Code that more than one area uses sits outside the area folders. Folders go one level deep.

So everything about contacts is in a `contacts/` folder on each side. A later area, such as invoices, gets a folder of its own on each side, and the existing folders don't change.

### Backend: `backend/`

```
backend/
  app/
    main.py           the app: each area's routes under /api, /api/health, and the 404, 409 and 422 responses
    db.py             the database path, the engine, foreign keys and WAL, making the tables, and the sample data when it's new
    tables.py         all four tables, their foreign keys (spec 3.7) and their indexes
    lists.py          search, sorting with empty values last, and paging, for every table
    organizations/    routes.py, schemas.py, service.py
    contacts/         routes.py, schemas.py, service.py
    deals/            routes.py, schemas.py, service.py, stages.py, ordering.py
    activities/       routes.py, schemas.py, service.py, timelines.py
    pipeline/         routes.py, service.py
    dashboard/        routes.py, service.py
    seed/             __main__.py, sample_data.py, large_data.py
  tests/              conftest.py and the test files in section 4.1
```

Each folder also has an empty `__init__.py`.

**What goes where:**

- **`routes.py`** only handles HTTP. It reads the request, calls the service and returns the response.
- **`schemas.py`** has the Pydantic models for what the routes take and return, with the input rules of spec 2.
- **`service.py`** has the area's queries and rules. Its functions take a database connection, and today when they need it, so tests can call them without HTTP.
- **A rule gets its own file** only when it's big enough to read and test on its own:
  - `deals/stages.py`: the stages and their probabilities, expected revenue and late deals (spec 3.1, 3.3 and 3.8).
  - `deals/ordering.py`: card order (spec 9.4).
  - `activities/timelines.py`: the two timelines (spec 3.6). Their routes, `GET /contacts/{id}/timeline` and `GET /deals/{id}/timeline`, are in `activities/routes.py`, so contacts and deals don't need to import activities.
- **The one function that changes a deal's stage** (spec 3.2) is in `deals/service.py`. Every stage change goes through it, including `POST /deals/{id}/move`.
- **Imports go one way.** An area can use another area's code, but two areas never import each other. Deals is at the bottom: other areas use it, and it uses only the shared files.
- **`tables.py`** keeps every table in one file, so the whole database can be read in one place. When there are many more tables, it can be split by area.
- **`seed/`** runs as `python -m backend.app.seed`, with `--large` for the large data set.
- **`tests/`** stays flat until it grows big enough to need folders. `conftest.py` gives each test a fresh database file, a fixed today and an API client.

### Frontend: `frontend/`

| File or folder | What it holds |
|---|---|
| `package.json` | The libraries in spec 9.2, with Vitest and Testing Library |
| `vite.config.ts` | Serves on `127.0.0.1:5173` and passes `/api` to the backend at `ACCOUNTABLE_API`, or `http://127.0.0.1:8000` when it isn't set. Vitest's settings |
| `tsconfig.json` | Strict TypeScript |
| `index.html` | `lang="en"` |

`src/` uses the same areas as the backend:

```
frontend/src/
  main.tsx           start-up
  App.tsx            the routes and the query client
  styles/            tokens.css (spec 5.2 and 5.5) and global.css (fonts, base type, focus ring, reduced motion)
  lib/               shared code with no screen: api.ts, queryKeys.ts, format.ts, stages.ts,
                     deleteMessages.ts, useUrlState.ts, usePageTitle.ts
  components/        shared UI: AppShell, ServerBanner, NotFoundPage, Panel, Button, IconButton, Pill,
                     LateBadge, Skeleton, DataTable, FormDialog, DeleteDialog, Picker, StageBar,
                     ProbabilityMeter, Initials, ChartPanel
  organizations/     OrganizationListPage, OrganizationPage, OrganizationForm, queries.ts
  contacts/          ContactListPage, ContactPage, ContactForm, StatusFilter, queries.ts
  deals/             DealListPage, DealPage, DealForm, StagePath, dealFormRules.ts, queries.ts
  activities/        ActivityForm, ActivityDialog, Timeline, queries.ts
  pipeline/          PipelinePage, Board, Column, Card, CardMenu, boardState.ts, announcements.ts, queries.ts
  dashboard/         DashboardPage, FollowUps, RecentActivity, Scoreboard, RevenueChart, Funnel,
                     DealsWonChart, followUpGroups.ts, chartSummaries.ts, queries.ts
```

A name with no extension is a component: a `.tsx` file with its CSS Module beside it, such as `Card.tsx` and `Card.module.css`.

**What goes where:**

- **An area's folder** has everything that only it uses: its pages, forms and parts, its TanStack Query hooks in `queries.ts`, and its plain functions.
- **`components/` and `lib/`** have only what two or more areas use. Something moves there when a second area needs it, not before.
- **`lib/api.ts`** makes the requests. **`lib/queryKeys.ts`** names every query, so a change in one area can refresh another's data without the two importing each other. For example, moving a deal on the board refreshes the deals table and the dashboard.
- **Page names:** `…ListPage` is a table and `…Page` is one record, so `ContactListPage` and `ContactPage` don't get mixed up.
- **Plain functions are named for what they do,** so a function file never has the same name as a component apart from capital letters: `dealFormRules.ts` sits beside `DealForm.tsx`, and `followUpGroups.ts` beside `FollowUps.tsx`. macOS and Windows ignore case in file names, so an import of `dealForm` could find `DealForm`.
- **Tests sit beside the file they test,** such as `boardState.test.ts`.
- **No folders inside an area, and no folder per component.** If an area grows past about 15 files, split it then.

### End-to-end tests: `e2e/`

| File | What it holds |
|---|---|
| `playwright.config.ts` | Installed Chrome (`channel: "chrome"`) and one worker. Starts the backend on `127.0.0.1:8100` with `ACCOUNTABLE_DB=data/test.db`, and Vite on `127.0.0.1:5174` with `ACCOUNTABLE_API` pointing to it |
| `fixtures.ts` | Fails a test on any console error, page error, or request to an address other than `127.0.0.1`. Resets the test database before each file with the seed command |
| The test files | Listed in section 4.3 |

### Packages

The latest releases on Nov 19, 2026. The build installs the latest release at the time, and the lock files fix them.

| Frontend | Version | Backend and tests | Version |
|---|---|---|---|
| react | 19.3 | fastapi | 0.165 |
| react-router | 8.5 | sqlalchemy | 2.1 |
| @tanstack/react-query | 5.108 | pydantic | 2.14 |
| @tanstack/react-table | 9.3 | uvicorn | 0.54 |
| recharts | 3.11 | pytest | 9.2 |
| @dnd-kit/react | 0.5.3 | httpx | 0.28 |
| react-aria-components | 1.22 | vitest | 5.1 |
| sonner | 2.0 | @testing-library/react | 16.3 |
| lucide-react | 1.76 | @playwright/test | 1.65 |
| vite | 8.3 | @axe-core/playwright | 4.14 |
| @fontsource-variable/instrument-sans, @fontsource/instrument-serif, @fontsource-variable/jetbrains-mono | 5.3 | | |

## 2. Order of work

Nine phases. The backend and its rules come first, because every screen depends on them. The pipeline comes before the dashboard, because it's the riskiest part.

**In every phase:**

- Work in small steps, and check each one before the next: run its tests, or open the screen.
- Before using a library, read its current docs with Context7. Several are new major versions or not yet 1.0, and older examples won't work (section 3).
- Add each new screen and dialog to the accessibility test as it's built, so problems show up early.
- Take a screenshot of each new screen with Playwright and compare it with the spec. Compare the dashboard and pipeline with mockup 2 too.
- End with `npm test` passing and `docs/STATUS.md` updated. The end of each phase is a good place to commit.

### Phase 1: Skeleton and the one command

**Goal:** `npm run dev` starts an empty app, and `npm test` runs all three kinds of test.

1. `pyproject.toml`, `.python-version` and `uv sync`. A FastAPI app with `GET /api/health`, on `127.0.0.1:8000`, and one pytest test for it.
2. The React and TypeScript app in `frontend/`, as an npm workspace, with `/api` passed to the backend. One page that says "Accountable", and one Vitest test.
3. `scripts/dev.mjs`, following spec 9.6: check Node.js and uv, install what's missing, start both servers, wait for `/api/health`, open the browser, stop both servers on Ctrl+C, and say when a port is in use.
4. The Playwright config, the fixtures and one end-to-end test that opens the app.
5. The `test` scripts in `package.json`.
6. `docs/STATUS.md`: install Node.js and uv once, then run `npm run dev`.

**Done when:** with `node_modules` and `.venv` removed, `npm run dev` installs everything and opens the page, and `npm test` passes.

### Phase 2: Database, records and rules

**Goal:** the API in spec 9.4, apart from the pipeline and dashboard, with the rules of spec 3 unit tested.

1. `db.py` and `tables.py`: the four tables, foreign keys with `SET NULL` and `CASCADE`, and indexes on the links and the sorted columns.
2. `deals/stages.py`: the stages, probabilities, expected revenue and late deals. Then the stage-change function in `deals/service.py`, with steps 1 to 5 of spec 3.2. It takes today as an argument.
3. `deals/ordering.py`: the position for a drop, for the top and bottom of a column, and renumbering.
4. `lists.py`: search (ignores case, matches any part, with `%` and `_` escaped), sorting with empty values last in both directions, and paging that returns `{ items, total }`.
5. Organizations: list with counts and open pipeline, add, get (with contacts, deals, figures and delete counts), change and delete.
6. Contacts: the same, with the status filter, status counts that follow the search, and their deals.
7. Deals: the same, with expected revenue, the late flag, sorting by stage in pipeline order, the main-contact rule (spec 3.4), and stage changes through the stage-change function.
8. `POST /deals/{id}/move`.
9. Activities, with 409 for stage changes, and the two timelines.
10. The input rules of spec 2: names trimmed and up to 200 characters, `https://` added to websites, emails checked, values of 0 or more, and probabilities from 0 to 100. Invalid input gets 422 with the field and a message.

**Done when:** the backend tests in section 4.1 pass, apart from the figures and the sample data.

### Phase 3: Sample data and reset

**Goal:** the app starts with the sample data, and `npm run seed` brings it back.

1. `seed/sample_data.py`: the records in spec 8, written by hand, with dates set relative to today, a stage change for each deal past New, and board positions in each column.
2. Load it when the database is new.
3. `seed/__main__.py` and `npm run seed`. It resets the database in place, dropping and making the tables and loading the data in one transaction, so it works while the app runs.
4. `seed/large_data.py` and `seed --large`.
5. The end-to-end fixture resets the test database before each file.

**Done when:** the sample data tests pass, and `npm run seed` resets a running app.

### Phase 4: Frontend foundation

**Goal:** the app shell, the tokens and the shared pieces, on every address.

1. `tokens.css` and `global.css`, with the fonts from Fontsource.
2. `lib/format.ts` and `lib/stages.ts`, with their unit tests.
3. The app shell (spec 4.1): the top bar, with the current section as a Midnight pill with `aria-current`; the skip link; the "Menu" button in narrow windows; every address, and "Page not found"; page titles; and focus on the `h1` when a new screen opens.
4. `lib/api.ts`, `lib/queryKeys.ts` and the query client: FastAPI's error shapes, and the "Can't reach Accountable" banner with "Try again".
5. The base components: panel, buttons, icon button with its tooltip, pills, late badge, loading blocks, and Sonner's messages at the bottom right.
6. The accessibility test, with axe on the shell.

**Done when:** each address shows its title in the shell, and axe finds nothing.

### Phase 5: Tables and forms

**Goal:** organizations, contacts and deals can be added, found, sorted, edited and deleted.

1. The shared data table (spec 4.3): the toolbar; search after 250 ms with the count read out; sortable headings with `aria-sort`; paging; Edit and Delete on each row; the empty states; and the state in the address, replaced rather than added while typing.
2. Organizations: the table, the form and the delete dialog.
3. Contacts: the table with the status filter and its counts, the form and the delete dialog.
4. The pickers, which search the server for 20 matches at a time.
5. Deals: the table with the late badge, the delete dialog, and the deal form. The form follows spec 3.4, fills in the probability and the date when the stage changes, and shows "Jane Doe now works at Brightlane" when the contact has moved.
6. Delete messages with the real counts, leaving out parts with a count of 0.
7. End-to-end: test 2, and the table parts of test 3. Axe on each table, form dialog and delete dialog. Keyboard: add a contact, delete a deal.

**Done when:** those tests pass, and the screens match the spec.

### Phase 6: Record pages, activities and timelines

**Goal:** each record's page shows its linked records, and activities can be logged, edited and deleted.

1. The organization's page (spec 4.4).
2. The contact's page (spec 4.5).
3. The deal's page (spec 4.6), with the stage path as a radio group and a message after each change.
4. The log-activity form and the timeline (spec 4.9), with "Show older" after 50 entries.
5. The activity edit and delete dialogs. Stage changes have neither.
6. "This contact no longer exists." for a record that's gone.
7. End-to-end: the rest of test 3, and test 5 apart from the dashboard. Axe on each record page and the activity dialogs. Keyboard: log an activity and mark its follow-up done.

**Done when:** those tests pass, and the screens match the spec.

### Phase 7: Pipeline

**Goal:** the board, by mouse, keyboard and menu. It's the riskiest part, so it starts with two checks.

1. `GET /pipeline`, with the board totals, and its backend tests.
2. **Measure first:** a plain board with every card and no dragging, timed in Chrome with the large data set, the way spec 7 measures. Write the time in `docs/STATUS.md`. At 1,000 ms or more, build the fallback in spec 7 (the first 50 cards in each column) in this phase.
3. **Try dnd kit first:** a small board with two columns, dragging between and within columns by mouse and by keyboard, with the announcements of spec 6. Confirm that `@dnd-kit/react` does all of this before building on it.
4. The summary panel and the stage bar, which the dashboard uses too.
5. The columns and cards, styled as mockup 2.
6. Dragging, with the drop line. `boardState.ts` moves the card and works out the new totals at once, then the server saves the move. If the save fails, the card goes back and a message says so.
7. The "More" menu: Move to, Move up, Move down, Open and Edit.
8. Adding a deal from a column's "+" button and from the header.
9. The message when a deal moves to Won: "Jane Doe is now a customer."
10. End-to-end: test 4. Keyboard: the drag and the "More" menu. Axe on the board and on the open menu.

**Done when:** those tests pass, the board is under 1,000 ms at full scale, and it matches mockup 2.

### Phase 8: Dashboard

**Goal:** the landing page, matching mockup 2.

1. `GET /dashboard`: every figure, worked out in SQL in `dashboard/service.py`, the follow-ups and the recent activity, in one response, with backend tests at the edges.
2. The follow-ups, set out like a diary, with the Done checkboxes and "Show all".
3. Recent activity.
4. The scoreboard and the stage bar.
5. The revenue line chart, the funnel and the deals-won bars (spec 5.7), each with its summary and "Show as table". Run axe on the first chart as soon as it exists.
6. The layout: a third and two thirds, stacked below 1,100 px wide.
7. End-to-end: tests 1 and 6, and the dashboard part of test 5. Axe on the dashboard, and again with each chart shown as a table.

**Done when:** those tests pass, and the dashboard matches mockup 2.

### Phase 9: The finish

**Goal:** everything in section 4 passes, and the app is ready for the hands-on check.

1. The performance test (spec 7) on every screen.
2. The check at 320 px wide on every screen.
3. Check that the accessibility and keyboard tests cover every screen, dialog and menu.
4. Compare the dashboard and pipeline with mockup 2 at 1,440 px wide, with screenshots side by side, and fix the differences.
5. From a clean copy (`node_modules`, `.venv` and `data/` removed), run `npm run dev` and check that it lands on the dashboard with the sample data.
6. `docs/STATUS.md`: how to run, test and reset the app, what's done, and that the hands-on check (spec 10.4) comes next.

**Done when:** `npm test` passes, and the clean-copy run works.

## 3. Risks

- **`@dnd-kit/react` isn't 1.0 yet (0.5.3).** Its API can change between releases, and it has fewer examples of moving cards between columns with the keyboard.
  - Fix the exact version, and try it on a small board before building the real one (phase 7, step 3).
  - If it can't do what spec 6 needs, stop and ask before switching to `@dnd-kit/core` with `@dnd-kit/sortable`.
  - The "More" menu makes every move without dragging, so keyboard users can always move deals.
- **New major versions.** React Router 8, TanStack Table 9, Vitest 5 and Recharts 3 differ from the examples most often found online. Read each one's current docs with Context7 before using it.
- **The board at full scale.** About 1,000 open cards, each with drag handlers, may take longer than a second to show in the dev server that `npm run dev` runs. Measure it first (phase 7, step 2), and build the fallback in spec 7 if needed.
- **Dates and time zones.** Today is the computer's local date. Timestamps are stored in UTC, and dates without a time, such as close and follow-up dates, must never shift. A wrong conversion moves a follow-up or a late deal by a day near midnight.
  - Store dates as `YYYY-MM-DD` with no time, and timestamps in UTC. Show timestamps in local time.
  - Every rule takes today as an argument, and the tests fix it and cover the edges: yesterday, today, 6 and 7 days ahead, and 30 and 31 days ago.
- **Rounding money.** Rounding each deal's expected revenue before adding them up gives the wrong total, and Python's `round` rounds halves to even. Add value × probability as whole numbers (dollars × percent), divide by 100 once, and round halves up.
- **Resetting while the app runs.** If the seed command deleted the database file, the running server would carry on with the deleted file, and the reset would seem to do nothing. The seed command resets the tables inside the file instead, in one transaction.
- **The one command on Windows and Linux.** Starting `npm` and `uv` from Node, stopping both servers on Ctrl+C and opening the browser differ on each system, and only a Mac is available here.
  - Use only Node's built-in modules, and handle the known differences: `npm.cmd` on Windows, `open`, `xdg-open` or `start` for the browser, and stopping each server's child processes.
  - `docs/STATUS.md` says that Windows and Linux haven't been tried.
- **Working offline.** A font or file loaded from the internet would break the app offline. The fonts come from Fontsource through npm, and the end-to-end fixture fails any request to an address other than `127.0.0.1`.
- **The end-to-end tests share one database.** Tests running at the same time or in another order would see each other's changes. They run in one worker, the database is reset before each file, and each test waits for the server's response rather than a fixed time. Running tests in parallel is an optional step after the Test stage.
- **Recharts and axe.** Recharts draws SVG, and its tooltips and keyboard layer may break axe rules. Run axe on the first chart as soon as it exists. Fix any problem with labels and roles, and never turn an axe rule off to pass.
- **Search and accents.** SQLite ignores case only for A to Z, so "émile" won't find "Émile". That's acceptable for the MVP and is written in `docs/STATUS.md`. `%` and `_` in a search are escaped, so they match themselves.
- **Test ports.** The tests use ports 8100 and 5174, so they don't clash with a running copy of Accountable. If those ports are taken, the tests stop at the start with Playwright's message.
- **The mockups aren't in git.** A build on this computer can read `docs/mockups/`. A fresh clone can't, so it has only the spec's description of each screen.
- **The size of the build.** It's long, and usage limits may stop a session partway. Each phase is small and ends with the tests passing, and `docs/STATUS.md` says where the build is, so a session can carry on from there.

## 4. Proof

### 4.1 Backend unit tests (pytest)

They use a fresh database file for each test, with foreign keys on, and a fixed today.

- **`test_stages.py`**
  - Moving to each stage sets its usual probability.
  - Moving to Won or Lost sets the close date to today.
  - Moving to Won makes the main contact a customer. With no main contact, nothing else changes.
  - Creating a deal directly in Won also makes its main contact a customer, and the response names that contact.
  - Each change writes one `stage_change` activity, such as "Moved from Proposal to Negotiation".
  - A Won deal moved back to Proposal keeps its close date and its contact's status, and shows as late when that date has passed.
  - A probability set by hand is kept by an edit that doesn't change the stage, and replaced when the stage changes.
  - A probability or close date sent with a stage change wins over the defaults.
  - Creating a deal at a stage writes no activity. Neither does moving a card within its column.
  - Late: an open deal with a close date before today is late. One due today, one with no date, and Won or Lost deals aren't.
- **`test_ordering.py`**
  - A drop between two cards takes their midpoint.
  - A drop at the top takes one less than the first card. A drop at the bottom, or into an empty column, goes last.
  - When neighbors get closer than 0.000001, the column is renumbered 1, 2, 3 in the same order, in the same transaction.
  - A stage change that doesn't come from the board puts the card at the top of its new column.
  - A `before_id` that isn't in the target column is refused with 422.
- **`test_records.py`**
  - The name is required, trimmed and up to 200 characters. Empty fields are stored as empty.
  - `northpeak.example` is saved as `https://northpeak.example`, and other kinds of address, such as `javascript:`, are refused.
  - Emails must look like an email. Values must be 0 or more. Probabilities must be from 0 to 100.
  - A main contact from another organization is refused. A contact with no organization can be the main contact of a deal with no organization.
  - A contact who moves to another organization stays on their deals.
  - A record that doesn't exist gets 404.
  - Each record's `GET` returns the counts its delete message needs.
- **`test_deletes.py`**
  - Deleting an organization keeps its contacts and deals, with no organization.
  - Deleting a contact keeps their deals, with no main contact, and deletes their own activities.
  - Deleting a deal deletes its activities, stage changes included.
  - Deleting an activity changes nothing else.
- **`test_activities.py`**
  - A logged activity needs a type, a description and exactly one contact or deal. `occurred_at` is now when not given.
  - An activity's contact or deal can't be changed.
  - Editing or deleting a stage change gets 409.
  - A follow-up can be marked done and not done again.
  - A contact's timeline has their own activities and those on the deals where they're the main contact. Timelines are newest first, by `occurred_at` then `created_at`, and page by `offset` and `limit`.
- **`test_lists.py`**
  - Search ignores case, matches any part of each listed field, including the organization's name, and treats `%` and `_` as plain characters.
  - Each sortable column sorts both ways, with empty values last both ways. Stage sorts in pipeline order.
  - Pages hold 50 rows, and `total` counts every match.
  - The contacts' status counts follow the search.
  - An unknown sort column gets 422.
- **`test_figures.py`**
  - Expected revenue adds the exact amounts and rounds once: three $1 deals at 50% make $2, not $3.
  - Open pipeline, Won this month (value and count), and the win rate, which is "–" with no closed deals.
  - The 12 months end with the current month, months with nothing show $0 and 0, and a deal won 12 months ago is left out.
  - The funnel counts each deal at its stage and every stage before it. Won counts at every stage, Lost isn't counted, and each stage has its share of New's value.
  - Board totals count open deals only. The Won and Lost columns hold deals closed in the last 30 days: day 30 is in and day 31 is out.
  - Follow-ups: yesterday is overdue, today and 6 days ahead are upcoming, 7 days ahead isn't shown, and done ones aren't shown.
  - Recent activity is the 10 newest up to now, so an activity dated later is left out.
- **`test_sample_data.py`**
  - The counts in spec 8: 15 organizations; 40 contacts (16 leads, 10 qualified, 14 customers, 4 with no organization); 30 deals by stage, with 3 late, 10 Won (2 in the last 30 days) and 4 Lost (1 in the last 30 days); 80 activities, with 4 overdue follow-ups, 5 upcoming (one today) and 3 done.
  - Every Won deal's main contact is a customer.
  - Loading on two different days moves the dates by the same number of days.
  - The seed command resets a database while another connection has it open.
  - The large set has the counts in spec 8, and the same seed makes the same data.
- **`test_persistence.py`:** data written by one app is all there when a new app starts on the same file, which is what a restart does.

### 4.2 Frontend unit tests (Vitest)

- **`format.test.ts`:** `$48,000`, `$40K`, `$1.2M` and `$0`; `75%`; `Nov 19, 2026` and `Nov 19, 2026, 2:30 PM`; "Due today", "Due tomorrow", "Due Mon, Nov 23" and "3 days overdue"; and "–" for empty values.
- **`stages.test.ts`:** the stage order, the probabilities, open and closed, and each stage's colors.
- **`dealFormRules.test.ts`:**
  - Picking an organization limits the contacts to its people.
  - Picking a contact fills in their organization.
  - Changing the organization clears a contact who works elsewhere.
  - Changing the stage fills in the probability, and today's date for Won and Lost.
  - A contact who has moved gives "Jane Doe now works at Brightlane", and the form can't be saved.
- **`deleteMessages.test.ts`:** the message for each kind of record, with parts of 0 left out, and "1 deal" against "2 deals".
- **`chartSummaries.test.ts`:** the revenue and deals-won summaries, with the best month, and the wording when every month is 0.
- **`followUpGroups.test.ts`:** Overdue (oldest first), Today, Tomorrow, then named days; up to 5 in each, with "Show all 12" for the rest.
- **`boardState.test.ts`:** moving a card between and within columns; the board's and columns' totals worked out again; Won and Lost left out of the open totals; and putting the board back after a failed save.
- **`announcements.test.ts`:** the words for picking up, moving over, dropping and putting back a card, as in spec 6.

### 4.3 End-to-end tests (Playwright Test, installed Chrome)

Every file uses the fixtures: the app's own servers and database, the database reset to the sample data before the file, and a failure on any console error, page error or request beyond `127.0.0.1`. A test that makes a request fail on purpose allows that one error.

- **`1-start.spec.ts`**
  - `/` opens the dashboard: the `h1` says "Dashboard" and the title is "Dashboard · Accountable".
  - Every screen has the sample data: 15 organizations, 40 contacts, 30 deals, the board's cards, and a page of each kind with its linked records.
  - An unknown address shows "Page not found", with a link to the dashboard.
  - With the API unreachable, the banner says "Can't reach Accountable…", and "Try again" works once it's back.
- **`2-tables.spec.ts`**
  - For organizations, contacts and deals: add one, find it by searching (the count is read out), sort by a column both ways, edit it and delete it. After a reload, every change is still there.
  - Saving with no name shows the error under the field and moves focus to it.
  - The delete dialog says what happens to linked records. After deleting an organization, its contacts have no organization. After deleting a contact, their deals have no main contact.
  - Search, sort and page come back after a reload and after Back.
  - No results shows "No contacts match "ann"." and "Clear search" clears it.
  - After changes, the seed command brings back the sample data.
- **`3-links.spec.ts`**
  - The contacts' status filter shows the right rows and counts, the counts follow the search, and the filter is kept in the address.
  - An organization's page shows its contacts and deals. "Add contact" from it fills in the organization.
  - A contact's page shows their organization and deals. "Add deal" from it fills in the contact and organization.
  - A deal's page links to its organization and main contact.
  - In the deal form, picking an organization offers only its people, picking a contact first fills in the organization, and changing the organization clears a contact who works elsewhere.
  - After a contact moves to another organization, their deal's form shows the mismatch and needs a new main contact before it saves.
- **`4-pipeline.spec.ts`**
  - Dragging a card to another column changes its stage and probability. The deals table shows both, and the deal's timeline has the stage change.
  - Dragging to Won sets the close date to today, makes the contact a customer, and says so in the message.
  - Dragging it back to an open stage keeps the close date and status, and the card shows "Late".
  - A card dropped higher or lower in its own column, or anywhere in another, is in the same place after a reload.
  - The board's and columns' totals change before the server answers, which the test checks by holding back the response.
  - When the save fails, the card goes back and a message says so.
  - A deal added with a column's "+" starts at that stage, at the top. One added from the header starts at New.
  - A deal added in Won with a lead as its main contact says "Deal added. Lucy Grant is now a customer."
  - Late deals show "Late". Won and Lost show only deals closed in the last 30 days.
  - Changing the stage on a deal's page moves its card to the top of the new column.
- **`5-timelines.spec.ts`**
  - A note, call and email logged on a contact and on a deal show at the top of the timeline, newest first. A deal's entries show on its main contact's timeline as "on Website redesign".
  - Stage changes show with no Edit or Delete.
  - An activity can be edited and deleted.
  - A follow-up due in 3 days shows on the dashboard under its day, and one due yesterday shows under Overdue. Marking one done removes it from the dashboard, and it stays in the timeline as done. Marking it not done brings it back.
- **`6-dashboard.spec.ts`**
  - The test works out the figures from the deals the API lists, and checks the scoreboard, the stage bar, the funnel and each chart's table against them.
  - After a deal moves to Won on the board, the dashboard shows the new Won this month, win rate, funnel and revenue.
  - A new follow-up appears on the dashboard.
  - Each chart's summary matches its table.
  - Below 1,100 px wide, the columns stack with the follow-ups first.
- **`accessibility.spec.ts`**
  - Axe, with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`, finds no violations on every screen, every form dialog (organization, contact, deal and activity), every delete dialog, the open "More" menu, and the dashboard with each chart shown as a table.
  - At 320 px wide, no screen scrolls sideways, apart from tables and the board inside their panels, and the "Menu" button opens the sections.
  - The skip link is the first thing to get focus, and focus moves to the `h1` when a new screen opens.
- **`keyboard.spec.ts`:** with the keyboard only:
  - Add a contact.
  - Log an activity and mark its follow-up done.
  - Move a deal to another column and to another place in its column with the keyboard drag, checking what the live region says.
  - Move a deal with the "More" menu.
  - On a deal's stage path, arrow from Negotiation past Won to Lost and choose Lost. Only that one stage change is saved, and the contact's status stays as it was.
  - Delete a deal.
- **`performance.spec.ts`**
  - Loads the large data set into the test database, then resets it to the sample data at the end.
  - After one warm-up load, times each screen in Chrome, from the start of navigation to its main content showing: the dashboard, the three tables, a page of each kind of record, and the pipeline. Each must be under 1,000 ms.
  - Paging works at scale: Next on contacts shows "51–100 of 5,000".

### 4.4 How the intent's success criteria are proved

| Intent criterion | Proved by |
|---|---|
| 1. Starts with one command, sample data everywhere | `1-start`, and the clean-copy run in phase 9 |
| 2. Add, find, sort, edit, delete, kept, reset | `2-tables`, `test_lists`, `test_deletes` and `test_persistence` |
| 3. Status filter, linked records, the deal's contacts | `3-links` and `dealFormRules.test.ts` |
| 4. Pipeline moves and their effects | `4-pipeline`, `test_stages`, `test_ordering` and `boardState.test.ts` |
| 5. Timelines and follow-ups | `5-timelines`, `test_activities` and the follow-up tests in `test_figures` |
| 6. The dashboard's figures | `6-dashboard` and `test_figures` |
| 7. Sharp, on brand, stunning dashboard | The comparison with mockup 2 in phase 9, and the hands-on check |
| 8. WCAG 2.2 AA and keyboard only | `accessibility`, `keyboard` and the hands-on check |
| 9. Under a second at scale | `performance` |
| 10. Used end to end in Chrome | The hands-on check (spec 10.4), after the build |

Passing tests isn't enough to call the MVP done. Someone still uses it end to end in Chrome, as spec 10.4 describes, and writes what they found in `docs/STATUS.md`.
