# Architecture

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

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
| Styles | CSS Modules, with tokens as custom properties in `styles/tokens.css`, and their dark values under `:root[data-theme="dark"]` |

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
