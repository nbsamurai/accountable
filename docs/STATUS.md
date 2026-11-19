# Status

All nine build phases in `docs/plan.md` are complete. The hands-on acceptance check in spec 10.4 is next.

## Install once

1. **Node.js 24 or later.** Install the current LTS from [nodejs.org](https://nodejs.org).
2. **uv,** which runs the Python backend. Install it from [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/).

That's all. The first run downloads everything else, Python 3.12 included, so it needs an internet connection. After that, Accountable needs none.

## Commands

Run them from this folder.

| Command | Does |
|---|---|
| `npm run dev` | Installs what's missing, starts the backend on `127.0.0.1:8000` and the app on `127.0.0.1:5173`, and opens the browser. Ctrl+C stops both |
| `npm run seed` | Resets the database to the sample data. It works while the app runs: refresh the page to see it. `npm run seed -- --large` loads the large data set instead, for the performance test |
| `npm test` | Runs the frontend type check, both unit suites, and the end-to-end suite in Chrome. Attempts every check and exits nonzero if any fail |

The end-to-end tests start their own servers on ports 8100 and 5174, with their own database, `data/test.db`. They need Google Chrome installed.

## Done

- **Phase 1, skeleton and the one command:**
  - `npm run dev` checks for Node.js and uv, installs packages when needed, starts both servers, waits for `/api/health`, and opens the browser. It says "Port 5173 is in use. Is Accountable already running?" when a port is taken.
  - `npm test` runs Vitest, pytest and Playwright Test.
  - The end-to-end fixture fails a test on any console error, page error, or request to an address other than `127.0.0.1`.
  - Checked on a Mac, from a copy with `node_modules` and `.venv` removed.

- **Phase 2, the database, records and rules:**
  - The API in spec 9.4 for organizations, contacts, deals and activities, with both timelines and `POST /deals/{id}/move`.
  - The stage-change function (spec 3.2), card order (spec 9.4), the main-contact rule (spec 3.4), the delete rules through real foreign keys (spec 3.7), and the input rules (spec 2).
  - Backend tests: `test_stages`, `test_ordering`, `test_records`, `test_deletes`, `test_activities`, `test_lists` and `test_persistence`.
  - Two small shared files the plan didn't list: `backend/app/deps.py` (the request's connection, today and now) and `backend/app/errors.py` (the 404, 409 and 422 shapes). `backend/app/fields.py` holds the input rules all three records share.
  - The backend runs as an app factory: `uvicorn --factory backend.app.main:create_app`.
- **Phase 3, the sample data and reset:**
  - `backend/app/seed/sample_data.py` has the records in spec 8, written by hand around mockup 2. Each date is written as it reads on Nov 19, 2026, and moves with the day it's loaded.
  - A new database gets the sample data. `npm run seed` drops and makes the tables and loads the data in one transaction, so it resets a running app.
  - `seed --large` loads about 1,000 organizations, 5,000 contacts, 2,000 deals and 20,000 activities from a fixed random seed, in under a second.
  - The end-to-end fixture resets `data/test.db` with the seed command before each test file.
  - Backend test: `test_sample_data`.
- **Phase 4, the frontend foundation:**
  - `styles/tokens.css` has every color, size and shadow in spec 5 as custom properties. Fonts come from Fontsource, so nothing loads from the internet.
  - The app shell: the top bar with the current section as a Midnight pill, the skip link, the "Menu" button below 860 px, every address and "Page not found", page titles, and focus on the `h1` when a new screen opens.
  - `lib/api.ts` reads FastAPI's error shapes, and the "Can't reach Accountable" banner shows when a request gets no answer or Vite's 502.
  - Base components: button, icon button with its tooltip, panel, pills, late badge, loading blocks, page header, and Sonner's messages at the bottom right.
  - Frontend tests: `format`, `stages`, `api` and the app's routes. `npm test` type-checks the frontend first.
  - End-to-end: `1-start` (the screens and "Page not found") and `accessibility` (axe on every screen, the skip link, focus on the `h1`, and 320 px wide).
- **Phase 5, tables and forms:**
  - One table design for organizations, contacts and deals: search after 250 ms with the count read out, sortable headings with `aria-sort`, paging, Edit and Delete on each row, the empty states, and the state in the address.
  - The add and edit forms, the searchable pickers (20 matches from the server), the contacts' status filter, and the deal form's rules (spec 3.2 and 3.4), with "Jane Doe now works at Brightlane" when a contact has moved.
  - Delete dialogs with the real counts, Cancel focused.
  - The add button sits in the page header, right of the `h1` (spec 4.1). Spec 4.3 also puts it in the toolbar, but two identical buttons would be read out twice. The empty state keeps its own.
  - Fixed on the way: a refresh after a change now cancels any fetch already on its way, so a list never keeps rows read before the change.
  - Frontend tests: `deleteMessages` and `dealFormRules`. End-to-end: `2-tables`, the table parts of `3-links`, `keyboard` (add a contact, delete a deal), and axe on every table, form dialog, delete dialog and an open picker.

- **Phase 6, record pages, activities and timelines**
  - Organization, contact and deal pages show their linked records, with prefilled add forms and edit and delete actions. Missing records link back to their section.
  - The deal's stage path uses a keyboard-accessible radio group. Each change saves through the existing API, logs the move, and announces the result.
  - Contact and deal timelines show 50 entries at a time. Notes, calls, and emails can be logged, edited, and deleted, and follow-ups can be marked done or reopened.
  - Chrome coverage includes record links, activity editing and deletion, timeline paging, keyboard follow-ups, axe checks, and record-page reflow at 320 px.
- **Phase 7, pipeline**
  - The board supports mouse and keyboard dragging, a drop line, move announcements, and an accessible More menu. Moves update totals immediately and restore the previous order and totals if saving fails.
  - The board shows recent Won and Lost deals. Moving to Won sets the close date and announces when the main contact becomes a customer.
  - All cards on the plain board took 1,036 ms to render in Chrome with the large data set. The implemented board starts with 50 cards per column and a Show more button. Totals include every card.
- **Phase 8, dashboard**
  - The landing page includes a follow-up diary, recent activity, key figures, and the stage bar. Marking a follow-up done updates the dashboard and its record timeline.
  - Revenue, deals won, and the funnel each have a summary and a table view. Chrome tests compare the figures with the deals API and verify updates after a win.
- **Phase 9, verification**
  - `npm test` passed 45 frontend, 99 backend, and 52 Chrome tests. The suite includes keyboard workflows, axe checks, and page reflow at 320 px.
  - The root command now attempts all suites after a failure. A temporary failing test in each suite verified that every suite ran and that `npm test` returned exit status 1.
  - After one warm-up navigation per screen on the large data set, Chrome measured 647 ms for the dashboard, 693–738 ms for the tables, 608–732 ms for the record pages, and 901 ms for the pipeline.
  - Dashboard and pipeline screenshots were compared with mockup 2 at 1,440 px. Organization, contact, and deal screenshots were checked against the spec.
  - `npm run dev` installed dependencies and opened the sample dashboard from a temporary copy with no `node_modules/`, `.venv/`, or `data/`.
- **Agenda mockup review**
  - Playwright captured the live dashboard and pipeline at 1,440 px against the Agenda mockup. The review aligned the follow-up rows, activity timeline, figures, chart labels, stage legends, pipeline columns, and cards.
  - Both screens fit at 320 px, with horizontal scrolling contained inside the pipeline board. The chart table toggle and keyboard focus restoration after closing the card menu passed. The comparison PNGs are in the local `logs/agenda-review/` folder.
  - `npm test` passed all 196 tests after the visual changes. Chrome measured the dashboard at 714 ms and pipeline at 888 ms on the large data set.

## Known limits

- Search ignores case only for A to Z, as SQLite does, so "émile" won't find "Émile".
- While the dev server runs, Vite prints "ResizeObserver loop completed with undelivered notifications" when a picker opens. It's a browser notice, not an app error: Chrome's console and the end-to-end guard don't report it.
- `npm run dev` hasn't been tried on Windows or Linux yet. It handles their differences (`npm.cmd`, `xdg-open`, `start`, `taskkill`), but only a Mac was available.

## Next

- Complete the hands-on salesperson workflow in Chrome from spec 10.4 and record the findings here.
