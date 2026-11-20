# Status

All nine phases in the [MVP plan](changes/mvp/plan.md) are complete. The findings of both MVP reviews are resolved. The [hands-on Chrome acceptance check](spec.md#104-the-hands-on-check) is still open.

The [product spec](spec.md) now describes Accountable as it runs today. The MVP's intent and plan live in [its change folder](changes/mvp/), and the review policy checks for product behavior missing from the spec.

`AGENTS.md` points to the [coding standards](STANDARDS.md), and the review policy checks changes against them.

## Install once

1. **Node.js 24 or later.** Install the current LTS from [nodejs.org](https://nodejs.org).
2. **uv,** which runs the Python backend. Install it from [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/).

The first app run downloads everything else, Python 3.12 included, so it needs an internet connection. After that, Accountable needs none. For development checks, install [Gitleaks](https://github.com/gitleaks/gitleaks#installing) and Google Chrome. Run `npm ci` and `uv sync --locked` after pulling a dependency change.

## Commands

Run them from this folder.

| Command | Does |
|---|---|
| `npm run dev` | Installs what's missing, starts the backend on `127.0.0.1:8000` and the app on `127.0.0.1:5173`, and opens the browser. Ctrl+C stops both |
| `npm run seed` | Resets the database to the sample data. It works while the app runs: refresh the page to see it. `npm run seed -- --large` loads the large data set instead, for the performance test |
| `npm test` | Runs the frontend type check, both unit suites with an 80% coverage floor each, and the end-to-end suite in Chrome |
| `npm run check` | Checks formatting, linting, function complexity, types and secrets, then runs `npm test`. Attempts every check and exits nonzero if any fail |
| `npm run check:quick` | Runs the same checks and skips the end-to-end suite |
| `npm run format` | Applies Prettier and Ruff formatting |

The end-to-end tests start their own servers on ports 8100 and 5174, with their own database, `data/test.db`. They need Google Chrome installed.

The frontend check uses TypeScript 6.0, the newest series supported by the installed typescript-eslint, and ESLint 9, the newest major supported by the installed jsx-a11y plugin. Gitleaks scans Git history, staged changes, and the working tree, excluding files ignored by Git from the working-tree scan.

## Development hooks

- `npm ci` installs Lefthook and its Git pre-commit hook. Run `npm exec --no -- lefthook install` if your npm setup skipped install scripts. The hook formats and re-stages eligible frontend and backend files, then runs ESLint, Ruff lint, TypeScript, ty and Gitleaks. The pre-commit hook skips tests.
- Start a fresh local Codex session in this trusted workspace and review the two project hooks in **Settings > Hooks** in the desktop app or `/hooks` in the CLI. Once trusted, the Stop hook runs `npm run check:quick` on the first stop attempt and sends any failure back to Codex for one follow-up pass. [Codex hook setup](https://learn.chatgpt.com/docs/hooks)
- The PreToolUse hook blocks patch edits and shell or filesystem tool calls that explicitly name `.env`. The `accountable-workspace` permission profile also makes the root `.env` read-only for sandboxed tools, including indirect writes. Use that profile for the filesystem restriction. Codex's full-access mode and tools outside its local sandbox do not get filesystem enforcement from the profile. [Codex hooks](https://learn.chatgpt.com/docs/hooks) · [Codex permissions](https://learn.chatgpt.com/docs/permissions)
- Claude Code reads its two project hooks from `.claude/settings.json`, and a running session picks up changes to them. The Stop hook runs `npm run check:quick` when Claude finishes a turn and sends any failure back for one follow-up pass. On the next stop, `stop_hook_active` is true, so the hook lets Claude stop. [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- The Claude Code PreToolUse hook denies Edit and Write calls on any file named `.env`, and shell commands that name `.env`, reads included. It can't see a write that a script makes without naming the file in the command.

## Continuous integration

`.github/workflows/ci.yml` runs one job, `check`, on every push to any branch, on GitHub's `ubuntu-latest` runner. It uses no secrets.

1. It installs Gitleaks and checks the download against a pinned SHA-256. Gitleaks then scans the history of every branch, so a leaked secret fails the run before anything else is installed. To update Gitleaks, change `VERSION` and `SHA256` together, from the release's checksums file.
2. It installs the current Node.js LTS and the latest uv, runs `npm ci` and `uv sync --locked`, then runs `npm run check`. The end-to-end tests use the Google Chrome on the runner.
3. If the run fails, it uploads the Playwright HTML report, with traces of failed tests, as the `playwright-report` artifact for 14 days.

`npm test` also writes the HTML report to `playwright-report/` locally. Open it with `npx playwright show-report`.

## Done

- **Phase 1, skeleton and the one command:**
  - `npm run dev` checks for Node.js and uv, installs packages when needed, starts both servers, waits for `/api/health`, and opens the browser. It says "Port 5173 is in use. Is Accountable already running?" when a port is taken.
  - `npm test` runs the frontend type check, Vitest, pytest and Playwright Test.
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
  - The add button sits in the page header, right of the `h1`. The empty state keeps its own button (spec 4.3).
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

## MVP review

Resolved the six findings in [the Nov 19 review](mvp-review.md) on Nov 20, 2026.

1. The API accepts `Host` headers for `localhost` and `127.0.0.1` and returns 400 for unrecognized hosts. Backend tests use a local base URL.
2. The dev script checks `node_modules/.package-lock.json` to decide when to install frontend dependencies. A clean copy installed them on the first start and skipped `npm install` on restart.
3. Deleting the last row on a page or opening a stale page URL takes the table to its last valid page. The correction replaces the URL and preserves search, sorting and filters.
4. Creating a deal directly in Won now makes its main contact a customer if one is set. Creation leaves the deal's timeline empty. The intent and spec record this rule.
5. The dashboard funnel's text summary reports each stage's deal count, dollar value and percentage share. Chrome tests compare the summary and table with the deal data.
6. The plan documents the type check and the test runner that attempts every suite. The spec places the main Add button in the page header and keeps the empty-state button.

`npm test` passed the frontend type check and all 200 tests (45 frontend, 102 backend and 53 Chrome). The large-data Chrome checks measured all eight screens under a second.

On a clean copy with a fresh sample database, a scripted Chrome walkthrough visited all five sections, created a linked lead and a deal directly in Won, confirmed the lead became a customer, and logged and completed a follow-up from the dashboard. The records and completion persisted after restart. The walkthrough recorded zero console or page errors. Screenshots of all sections, record pages and the missing-page screen were reviewed against the spec, with the dashboard and pipeline compared to the Agenda mockup. The desktop Chrome controls became unavailable during the hands-on walkthrough.

## Second review (Nov 20, 2026)

A second review of the branch against `docs/REVIEW.md` found three issues. All three are resolved.

1. **Important. Arrow keys on the stage path save every stage they pass through** (`frontend/src/deals/StagePath.tsx`). The stage path is a radio group, so each arrow key selects the next stage, and each selection saves at once. In Chrome, on "Payments gateway" (Negotiation, main contact Sam Okafor, qualified), pressing → twice from Negotiation to reach Lost left the deal Lost, made Sam Okafor a customer, and wrote "Moved from Negotiation to Won" and "Moved from Won to Lost", which can't be deleted. Spec 4.6 asked for both "changes it at once" and "arrow keys move along it", which conflict.
2. **Adding a deal in Won doesn't say its contact became a customer.** The server makes the contact a customer but doesn't return the contact, and the frontend sets `contact: null` for every new deal. Dragging a deal to Won says so; adding one with the Won column's "+" doesn't.
3. **The planned `announcements.test.ts` is missing** (plan 4.2). The keyboard end-to-end test checks the same words.

How each was fixed:

1. The stage path is now a React Aria `ToggleButtonGroup` with single selection. It keeps the `radiogroup` and `radio` roles, but the arrow keys only move focus, and Space, Enter or a click chooses a stage. A new keyboard test arrows from Negotiation past Won to Lost and chooses Lost: only "Moved from Negotiation to Lost" is saved, and Sam Okafor stays qualified. The test fails on the old stage path. `5-timelines` now presses Enter after the arrow key. Spec 4.6 says how the keys work.
2. `POST /deals` returns `{ deal, contact }`, as `PATCH` and the board's move do, so the deal form says "Deal added. Lucy Grant is now a customer." A backend test checks the contact in the response, and that nothing is reported when the contact is already a customer or the deal is open. A new `4-pipeline` test adds a deal from the Won column's "+". Spec 9.4 records the response.
3. `frontend/src/pipeline/announcements.test.ts` checks the four messages with spec 6's own examples.

`npm test` passed the frontend type check and all 207 tests (49 frontend, 103 backend and 55 Chrome). Chrome measured every screen under 800 ms on the large data set.

## Development checks

`npm run check` passed formatting, linting, both type checks, secret scanning, and all 219 tests (60 frontend, 103 backend and 56 Chrome). Frontend line coverage was 82.32% and backend statement coverage was 96.53%. The new Chrome test verified keyboard scrolling in the pipeline board and linked contacts table at 320 px.

`npm run check:quick` passed without starting Chrome. A temporary Git repository verified that Gitleaks skips an ignored `.env`. It flagged a force-staged `.env` and credentials in untracked files, staged changes, and earlier commits. The findings were redacted.

## Known limits

- Search ignores case only for A to Z, as SQLite does, so "émile" won't find "Émile".
- While the dev server runs, Vite prints "ResizeObserver loop completed with undelivered notifications" when a picker opens. It's a browser notice, not an app error: Chrome's console and the end-to-end guard don't report it.
- `npm run dev` hasn't been tried on Windows or Linux yet. It handles their differences (`npm.cmd`, `xdg-open`, `start`, `taskkill`), but only a Mac was available.

## Next

- Complete the hands-on salesperson workflow in desktop Chrome from spec 10.4 and record the findings here.
