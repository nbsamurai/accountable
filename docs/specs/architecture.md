# Architecture

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 9. Architecture

### 9.1 The repository

```
package.json        npm scripts; frontend/ is a workspace
pyproject.toml      Python project, with uv.lock beside it
render.yaml         the Render service (section 9.9)
scripts/dev.mjs     the one command: install, start both servers, open the browser
backend/app/        FastAPI app: shared database code, then one folder per area
backend/migrations/ the database migrations
backend/tests/      pytest
frontend/src/       React app: shared components, helpers and styles, then one folder per area
e2e/                Playwright Test, with its config and the accessibility and performance tests
data/               the local SQLite databases (git-ignored)
.env                the Supabase settings, written by hand (git-ignored, section 9.8)
```

### 9.2 Frontend

| Need | Library |
|---|---|
| UI | React 19, TypeScript, built with Vite 8 |
| Routing | React Router 8 |
| Server data | TanStack Query 5: one hook per request, and every change refreshes what it affects |
| Sign-in | Supabase's JavaScript client (`@supabase/supabase-js`): signing in, keeping the session and renewing its token |
| Tables | TanStack Table 9, in manual mode, as the server sorts and pages |
| Charts | Recharts 3 |
| Drag and drop | dnd kit (`@dnd-kit/react`), with its keyboard sensor and screen-reader announcements |
| Dialogs, menus, pickers, the search box, dates | React Aria Components |
| Messages | Sonner |
| Icons | Lucide |
| Fonts | Fontsource: Instrument Sans, Instrument Serif and JetBrains Mono |
| Styles | CSS Modules, with tokens as custom properties in `styles/tokens.css`, and their dark values under `:root[data-theme="dark"]` |

The lockfiles record the dependency versions used by the app.

### 9.3 Backend

- Python 3.12, with FastAPI, Uvicorn, Pydantic 2 and SQLAlchemy 2.1 Core for application queries.
- SQLAlchemy reaches Postgres through psycopg 3. Alembic runs the migrations. PyJWT checks Supabase's tokens.
- The tables and the rules in section 3 live in their own modules, so the routes stay thin and the rules can be unit tested without HTTP.
- One shared dependency checks the token and gives each route the signed-in person (section 9.7). Functions that record who added or changed a record take that person as an argument.
- Functions that depend on today take it as an argument, so tests can fix the date.
- Errors use FastAPI's shapes: 401 for a missing or invalid token, 422 for invalid input, with the field and the message, 404 for a missing record, and 409 for editing or deleting a stage change. On Supabase, a token that arrives while the project's signing keys can't be fetched gets 503, so a short loss of the network doesn't sign anyone out.

### 9.4 API

All paths start with `/api`. Every route needs a valid token in an `Authorization: Bearer` header and answers 401 without one, apart from `GET /health`, `GET /auth/config` and `POST /auth/local`. Lists return `{ "items": [...], "total": n }`.

| Method and path | Does |
|---|---|
| `GET /health` | Says the server is up, and nothing else. Open to everyone |
| `GET /auth/config` | How to sign in. Open to everyone. On Supabase: `{ "mode": "supabase", "supabase_url", "publishable_key" }`. On a local copy: `{ "mode": "local", "people": [...] }`, with the made-up teammates |
| `POST /auth/local` | Local sign-in (section 3.10). Body `{ "person_id" }`. Returns `{ "access_token" }` for that teammate. 404 on Supabase, 403 on a connection that isn't to `127.0.0.1`, and 422 for anyone but a made-up teammate |
| `GET /me` | The signed-in person: `{ "id", "email", "name" }` |
| `GET /search?q` | Up to 5 organizations, 5 contacts and 5 deals whose names match (section 4.12): `{ "organizations": [...], "contacts": [...], "deals": [...] }`, each with its detail |
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

Each record's `GET` also returns the counts its delete message needs (section 4.10), and `created_by` and `updated_by`, each as `{ "id", "name" }`, where `name` is how the person shows (section 2, Person). Each timeline entry has its `created_by` in the same shape. No request body or query can set `created_by` or `updated_by`.

**Card order:** each deal has a `board_position`. A dropped card takes the midpoint of its new neighbors' positions. A card at the top takes one less than the first. When two neighbors get closer than 0.000001, the server renumbers that column 1, 2, 3 and so on, in the same transaction.

### 9.5 Database

- **On Supabase,** the data lives in the Postgres database that `DATABASE_URL` points at (section 9.8). That's the shared app's database.
- **On a local copy,** it lives in one SQLite file, `data/accountable.db`. The `ACCOUNTABLE_DB` environment variable points elsewhere, and the tests use it to keep their own databases.
- The same SQLAlchemy Core queries run on both. Searches and text sorts fold case the same way on both, so they give the same results (section 4.3).
- **Migrations:** the app brings the schema up to date with its migrations when it starts, on either database. Each change to the schema comes with a new migration, made with `uv run alembic revision -m "…"`. When the tables are empty after the migrations, the app loads the sample data (section 8).
- SQLite can't add a foreign key to a table, so a migration that needs one rebuilds the table. The app runs the migrations on SQLite with foreign keys off, because dropping the old table with them on would set links to it to null and delete the activities that cascade from it. A check after the migrations, in the same transaction, makes sure every link still points at a row.
- On SQLite, foreign keys are switched on for every connection, so the delete rules in section 3.7 hold. Postgres always enforces them.
- On Postgres, every table has row-level security turned on, with no policies, so Supabase's Data API, which anyone with the publishable key can call, returns none of their rows. The backend connects as the tables' owner, which row-level security doesn't limit. A table that a later change adds needs the same.
- Timestamps are stored in UTC.
- `created_by` and `updated_by` link to the people table. People's rows are never deleted (section 2, Person).

### 9.6 Commands

- **`npm run dev`** runs `scripts/dev.mjs`, which uses only Node's own modules:
  1. It checks that Node.js 24 or later and uv are installed, and if not, says how to install them.
  2. It runs `npm install` when `node_modules/.package-lock.json` is missing or older than `package-lock.json`. It runs `uv sync` on every start.
  3. It reads `.env` when the file exists. With the Supabase settings, the app uses the team's database and Supabase sign-in, and starting it runs this branch's migrations on that database. Without them, it runs as a local copy (section 9.8).
  4. It starts the backend on `127.0.0.1:8000` and Vite on `127.0.0.1:5173`, which passes `/api` to the backend.
  5. It waits for `/api/health`, then opens the browser at the dashboard, which shows the sign-in screen first.
  6. Ctrl+C stops both servers.
  7. If a port is in use, it says "Port 5173 is in use. Is Accountable already running?".
- **`npm start`** runs the app the way Render does. It builds the frontend, then starts one server on `127.0.0.1:8000` that runs the migrations and serves the built frontend and the API. It needs all three Supabase settings in `.env`, and stops with a message that names any that's missing.
- **`npm test`** runs the frontend type check, both unit test suites and the end-to-end tests. It requires 80% line coverage in the frontend and 80% statement coverage in the backend. It attempts every check and exits nonzero if any fail. Every test run leaves the Supabase settings out of its environment, so no test touches Supabase, whether or not `.env` has them. Every unit test runs in under a second on a developer's computer. The end-to-end tests start their own servers on other ports, as a local copy with its own database.
- **`npm run check`** checks formatting, linting, types and secrets, and runs `npm test`. ESLint and Ruff limit each function's cyclomatic complexity to 15. Gitleaks scans Git history, the index and the working tree. The working-tree scan honors Git ignore rules, including the local `.env`.
- **`npm run check:quick`** runs the same checks and skips the end-to-end suite.
- **`npm run format`** applies Prettier formatting to the frontend and Ruff formatting to the backend.
- **`npm run seed`** resets a local database to the sample data. It works while the app is running, and a refresh then shows the sample data. `npm run seed -- --large` loads the performance data set instead. When `DATABASE_URL` is set, it changes nothing, says "npm run seed only resets a local database. DATABASE_URL points at the team's database on Supabase, so nothing changed.", and exits nonzero.

The first run needs an internet connection to download packages and Python. With the Supabase settings, Accountable needs one all the time. A local copy needs none after the first run.

### 9.7 Security

- **Tokens:** the browser sends its Supabase access token in the `Authorization: Bearer` header. The backend checks the token's signature with the project's public signing keys, from `SUPABASE_URL/auth/v1/.well-known/jwks.json`. It fetches them when it first needs them and keeps them, and fetches them again only when a token names a key it doesn't have, at most once a minute, so made-up keys can't flood Supabase. It also checks that the token hasn't expired, that its audience is `authenticated` and that its issuer is `SUPABASE_URL/auth/v1`. The person is the token's `sub`, with the email and name from its claims. Nothing else in a request can name or change the person.
- **Keys:** the browser holds only the publishable key, which is public by design. The database password lives only in `DATABASE_URL`, in `.env` or in Render's settings. Accountable uses no secret or service-role key.
- **Sign-ups are off** in the Supabase project, so nobody can make an account with the publishable key. People are added in Supabase's dashboard.
- **Row-level security** on every table keeps Supabase's Data API from serving the data (section 9.5).
- **Local sign-in** works only when none of the Supabase settings is set and the backend listens on `127.0.0.1`. With some of the settings but not all, the backend refuses to start (section 9.8). Local tokens are signed with a key the backend makes when it starts.
- **The built frontend's files** hold no data and load for anyone. The data comes only through the API.
- **Listening:** `npm run dev` and `npm start` listen on `127.0.0.1` only, so other computers on the network can't reach them. On Render, the server listens on the port Render gives it, behind Render's HTTPS.
- **Host header:** the backend accepts `localhost` and `127.0.0.1`, and on Render the address in `RENDER_EXTERNAL_HOSTNAME`, which Render sets.
- Application queries use SQLAlchemy with bound parameters.
- React escapes all text. Website links must be `http` or `https`, and open with `rel="noopener noreferrer"`.
- Git ignores `.env` and the local database files.

### 9.8 Settings

| Setting | Holds | Locally | On Render |
|---|---|---|---|
| `DATABASE_URL` | The connection string for Supabase's session pooler, port 5432 | `.env` | Entered in Render's dashboard |
| `SUPABASE_URL` | The project's URL | `.env` | Entered in Render's dashboard |
| `SUPABASE_PUBLISHABLE_KEY` | The project's publishable key | `.env` | Entered in Render's dashboard |
| `TZ` | The team's time zone, such as `America/New_York`, for today (section 3.8) | The computer's own | `render.yaml` |

- The person who sets up Supabase writes `.env` by hand. Nothing in the repository holds the three values.
- **The three Supabase settings go together.** With all three, Accountable runs on Supabase, with Supabase sign-in. With none, it runs as a **local copy**: a SQLite file (section 9.5), local sign-in and the made-up teammates (section 3.10). With some but not all, the backend stops when it starts and names the missing ones.
- The tests, the hands-on check and ui-check run as a local copy.

### 9.9 Deployment

- The shared app runs on Render's free plan as one web service, described in `render.yaml` at the repository root. Render builds it from the repository's `main` branch.
- **Build:** installs the npm and Python packages and builds the frontend.
- **Start:** runs the migrations, then serves the built frontend and the API from FastAPI, at the service's `onrender.com` address over HTTPS. Any address outside `/api` that isn't a file gets the app's page, so a reload on `/contacts/12` works.
- `render.yaml` sets `PYTHON_VERSION` to a 3.12 release and `TZ` to the team's time zone. It uses `/api/health` as the health check. Its region is the Render region nearest the Supabase project, since every query crosses between the two. It lists the three Supabase settings without values, so they're entered in Render's dashboard and never written in the file. It names no branch, so the service deploys the branch chosen when the Blueprint is set up.
- Render deploys `main` each time CI passes on it.
- Render reaches Supabase through its session pooler, because the direct connection is IPv6 only on Supabase's free plan.
- On the free plan, the app sleeps after 15 minutes without visits and takes about a minute to wake (section 7).
