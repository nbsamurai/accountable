# Plan: sign-in, search and a user menu

This is the build plan for the [multi-user intent](intent.md). It covers the files, the order of work, the risks and the tests. References such as "spec 3.10" point to sections of the [product spec](../../spec.md). The area files already describe the finished change, so the plan builds what they say.

## 1. Files that change

The work comes in three phases: sign-in and the database, then search, then the user menu. A short fourth phase updates the docs and runs the full checks.

Each phase splits its files into parts. **Within a phase, no file is in two parts**, so each part can go to a different agent at the same time. Phases run one after another, so a file can come back in a later phase. The last table in this section lists those files.

Two rules keep the parts apart:

- Parts don't edit `docs/`. At the end of each phase, the lead agent updates the spec where the build departs from it, and this plan, and says why.
- Parts build against the shared names below, not against each other's code. Until another part's code is merged, a part's tests use a stand-in for it.

### Shared names

| Name | Owner | What it is |
|---|---|---|
| `people` table | Part 1, `tables.py` | `id` (text, the Supabase user id), `email`, `name`, `created_at` and `updated_at` |
| `created_by`, `updated_by` | Part 1, `tables.py` | Text columns that can be empty, on organizations, contacts, deals and activities, linked to `people.id` |
| `make_engine(url)`, `init_db(engine, load_sample)` | Part 1, `db.py` | An engine for a SQLite file or `DATABASE_URL`. The migrations, then the sample data when the tables are empty |
| `fold(column)`, `fold_text(text)` | Part 1, `lists.py` | The case fold for searches and text sorts, the same on SQLite and Postgres (spec 4.3) |
| `TEAMMATES` | Part 1, `seed/sample_data.py` | The three made-up teammates' ids, names and emails |
| `Person` | Part 2, `auth/people.py` | `id`, `email` and `name`, from the token |
| `CurrentPerson` | Part 2, `deps.py` | The dependency that checks the token and gives a route its `Person` |
| `mount_frontend(app)` | Part 5, `frontend.py` | Serves the built frontend when it exists |
| `getAccessToken()`, `useSession()`, `signOut()` | Part 4, `lib/session.ts` | The browser's session, for the API client, the gate and the user menu |
| The API | Spec 9.4 | `/auth/config`, `/auth/local`, `/me` and `/search`, and `created_by` and `updated_by` as `{ id, name }` |

### New dependencies

The intent allows a new dependency only when the plan makes the case for it. Each of these four does a job that would be risky or long to write by hand. Spec 9.2 and 9.3 already name them.

| Package | Where | The case for it |
|---|---|---|
| `@supabase/supabase-js` | Frontend | Signs in, keeps the session in the browser and renews its token before it runs out. Without it, we'd copy Supabase Auth's refresh protocol by hand |
| `alembic` | Backend | Versioned migrations that run on SQLite and Postgres. It does the table rebuild SQLite needs to add a foreign key |
| `psycopg[binary]` | Backend | SQLAlchemy needs a driver to reach Postgres. psycopg 3 is its default, and the binary wheels need no libpq on the computer |
| `pyjwt[crypto]` | Backend | Checks the token's ES256 signature and claims. Signature checks shouldn't be written by hand. The `crypto` extra brings `cryptography`, which the tests also use to make their own signing keys |

Nothing else is added:

- The npm scripts read `.env` with Node's own `util.parseEnv`, not python-dotenv.
- A hook of about 10 lines in `conftest.py` fails a slow backend test, in place of pytest-timeout. Vitest has `testTimeout` built in.
- The search box and the user menu use React Aria Components and Lucide icons, which are already installed.

### Phase 1: Sign-in and the database

#### Part 1: The database (backend)

| File | What changes |
|---|---|
| `pyproject.toml`, `uv.lock` (edit) | The three backend packages above |
| `backend/app/tables.py` (edit) | The `people` table. `created_by` and `updated_by` on the four record tables. The `done` default becomes `false()`, which Postgres accepts |
| `backend/migrations/env.py`, `script.py.mako` (new) | Alembic, run from code with the app's connection, in batch mode on SQLite |
| `backend/migrations/versions/0001_baseline.py` (new) | The schema as it is today |
| `backend/migrations/versions/0002_people.py` (new) | The people table, and the two columns on each record table. On Postgres, row-level security on every table, `alembic_version` included (spec 9.5) |
| `backend/app/db.py` (edit) | `make_engine(url)`: SQLite with today's pragmas, or Postgres through psycopg with `pool_pre_ping`. `init_db` stamps a local file from before this change at `0001`, runs the migrations, and loads the sample data when the tables are empty. `reset` works only on SQLite |
| `backend/app/lists.py` (edit) | `fold(column)`: `lower()` on SQLite and `lower(column COLLATE "C")` on Postgres, which both fold only A to Z. `fold_text` folds the search term the same way in Python. Text sorts use `fold` in place of `NOCASE` |
| `backend/app/dashboard/service.py` (edit) | Groups Won deals by month with `extract()` in place of SQLite's `strftime`. Turns sums into `int`, because Postgres returns `Decimal` |
| `backend/app/seed/__main__.py` (edit) | Refuses when `DATABASE_URL` is set, with the message in spec 9.6, and exits nonzero |
| `backend/app/seed/sample_data.py` (edit) | `TEAMMATES`: Alex Rivera, Jordan Blake and Casey Morgan, at `team.example`, with fixed ids. Each record and activity gets a `created_by` and an `updated_by` from them (spec 8) |
| `backend/app/seed/large_data.py` (edit) | The same three teammates on every row |
| `backend/tests/test_migrations.py`, `test_dialects.py`, `test_seed.py` (new) | See 4.1 |
| `backend/tests/test_sample_data.py`, and `test_lists.py` and `test_figures.py` if they need it (edit) | See 4.1 |

#### Part 2: Sign-in (backend)

| File | What changes |
|---|---|
| `backend/app/settings.py` (new) | Reads `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. An empty value counts as not set. All three or none, or it stops and names the missing ones (spec 9.8) |
| `backend/app/auth/tokens.py` (new) | Checks a Supabase token (spec 9.7): the signature against the keys at `SUPABASE_URL/auth/v1/.well-known/jwks.json`, the expiry, the audience `authenticated` and the issuer `SUPABASE_URL/auth/v1`. Accepts ES256 and RS256 only. A small key cache fetches the keys on first use, and again only for an unknown `kid`. The fetch is passed in, so tests need no network |
| `backend/app/auth/local.py` (new) | Local sign-in (spec 3.10): a signing key made when the backend starts, and HS256 tokens for the teammates that last 12 hours. Both work only on a local copy, and only on a connection to `127.0.0.1` |
| `backend/app/auth/people.py` (new) | `Person`. Makes or updates the person's row from the token. How a person shows (spec 2, Person) |
| `backend/app/auth/routes.py` (new) | `GET /auth/config`, `POST /auth/local` and `GET /me` (spec 9.4) |
| `backend/app/deps.py` (edit) | `CurrentPerson`. `get_today` gives the date in the `TZ` time zone, through a function that takes now, so tests can cross midnight UTC |
| `backend/app/main.py` (edit) | Reads the settings, and stops on a partial set. Every route but the three open ones needs `CurrentPerson`. Allows the `RENDER_EXTERNAL_HOSTNAME` host. Turns off FastAPI's `/docs` and `/openapi.json`. Calls `mount_frontend` |
| `backend/tests/conftest.py` (edit) | Clears the Supabase settings. Migrates one database per session and copies it for each test. The client is signed in as Alex Rivera on `http://127.0.0.1`, and an `as_person` fixture signs in as someone else. A hook fails any test that takes more than a second |
| `backend/tests/test_tokens.py`, `test_auth.py`, `test_people.py`, `test_settings.py`, `test_today.py` (new) | See 4.1 |
| `backend/tests/test_health.py`, and `test_persistence.py` if it needs it (edit) | See 4.1 |

#### Part 3: Who added and changed a record (backend and frontend)

| File | What changes |
|---|---|
| `backend/app/authors.py` (new) | The values that adding and changing a record set (spec 3.11). The joins that give `created_by` and `updated_by` as `{ id, name }` |
| `backend/app/organizations/`, `contacts/`, `deals/` and `activities/`: `routes.py`, `service.py` and `schemas.py`, and `activities/timelines.py` (edit) | Routes pass `CurrentPerson` to each function that adds or changes a record. A stage change, a board move, a follow-up marked done or not done, and a contact made a customer by a Won deal each set `updated_by`. A board move within a column now sets `updated_at` too. Each record's `GET` and each timeline entry include their people. The contact picker's `NOCASE` becomes `fold()` |
| `backend/tests/test_authors.py` (new) | See 4.1 |
| `backend/tests/test_records.py`, `test_activities.py`, `test_stages.py`, `test_ordering.py` and `test_deletes.py`, if they need it (edit) | Signatures that now take a person |
| `frontend/src/components/AddedBy.tsx`, `.module.css` (new) | The caption under a record's name (spec 3.11): "Added by Alex Rivera on Nov 3, 2026." and, once the record has changed, "Last changed by Jordan Blake on Nov 19, 2026." "–" for no one. 13 px in `--ink-muted` |
| `frontend/src/organizations/OrganizationPage.tsx`, `contacts/ContactPage.tsx`, `deals/DealPage.tsx` (edit) | The caption in each header |
| `frontend/src/organizations/queries.ts`, `contacts/queries.ts`, `deals/queries.ts`, `activities/queries.ts` (edit) | The `created_by` and `updated_by` types |
| `frontend/src/activities/Timeline.tsx` (edit) | "Nov 19, 2026, 2:30 PM by Alex Rivera" (spec 4.9) |
| `frontend/test/records.ts` (edit) | The test records get their people |
| `frontend/src/components/AddedBy.test.tsx` (new) | See 4.2 |

#### Part 4: Sign-in (frontend)

| File | What changes |
|---|---|
| `frontend/package.json`, `package-lock.json` (edit) | `@supabase/supabase-js` |
| `frontend/src/lib/session.ts` (new) | Asks `/api/auth/config` how to sign in. On Supabase, loads Supabase's client with the publishable key. A local copy never loads it, so it makes no request beyond `127.0.0.1`. Keeps a local token in `localStorage`. `getAccessToken()`, `useSession()`, `signIn()`, `signInLocal()`, `signOut()` with `scope: "local"`, and the ended-session message |
| `frontend/src/lib/api.ts` (edit) | Sends `Authorization: Bearer` with every request. A 401 ends the session. The unreachable message says "Check your internet connection" (spec 4.11) |
| `frontend/src/components/ServerBanner.tsx` (edit) | The same new words |
| `frontend/src/signin/SignInPage.tsx`, `.module.css` (new) | The sign-in screen and local sign-in (spec 4.13), with its page title and focus on its `h1` |
| `frontend/src/signin/signInErrors.ts` (new) | Turns Supabase's errors into the three messages in spec 4.13 |
| `frontend/src/signin/AuthGate.tsx` (new) | Shows the sign-in screen at the same address while signed out, and the app once signed in. Clears the query cache when the session ends |
| `frontend/src/App.tsx` (edit) | The gate around the router |
| `frontend/vite.config.ts` (edit) | `testTimeout: 1000` |
| `frontend/src/App.test.tsx`, `lib/api.test.ts` (edit) and `lib/session.test.ts`, `signin/SignInPage.test.tsx`, `signin/signInErrors.test.ts` (new) | See 4.2 |

#### Part 5: Running and deploying

| File | What changes |
|---|---|
| `package.json` (edit) | `npm start`, and `npm run seed` through `scripts/seed.mjs` |
| `scripts/env.mjs` (new) | Reads `.env` when it exists, with `util.parseEnv`. Used by the three scripts below |
| `scripts/dev.mjs` (edit) | Passes the settings in `.env` to the backend, and says whether it runs on Supabase or as a local copy |
| `scripts/start.mjs` (new) | `npm start` (spec 9.6): names any missing setting and stops, builds the frontend, then runs one server on `127.0.0.1:8000` |
| `scripts/seed.mjs` (new) | Runs the seed command with the settings in `.env`, so it sees a `DATABASE_URL` written there |
| `scripts/test.mjs` (edit) | Removes the three settings from every check's environment |
| `backend/app/frontend.py` (new) | `mount_frontend(app)`: serves `frontend/dist` when it's built. Any address outside `/api` that isn't a file gets `index.html` (spec 9.9) |
| `backend/tests/test_frontend.py` (new) | See 4.1 |
| `render.yaml` (new) | One web service on the free plan (spec 9.9). The build runs `uv sync` and builds the frontend. The start runs uvicorn on `$PORT`. It sets the health check to `/api/health`, and sets `PYTHON_VERSION`, `NODE_VERSION` and `TZ`, and the three settings with `sync: false` |

#### Part 6: End-to-end tests and ui-check

| File | What changes |
|---|---|
| `e2e/playwright.config.ts` (edit) | Both servers start with the three settings empty |
| `e2e/fixtures.ts` (edit) | A `person` option, Alex Rivera by default. Before each page loads, it signs in through `POST /api/auth/local` and stores the token. An `api` fixture: a request context that sends the token. The seed call clears the settings too |
| `e2e/1-start.spec.ts` to `6-dashboard.spec.ts`, `keyboard.spec.ts`, `performance.spec.ts` (edit) | Direct API calls go through the `api` fixture. `1-start` begins at the sign-in screen. `keyboard` signs in with the keyboard |
| `e2e/8-sign-in.spec.ts`, `10-who.spec.ts` (new) | See 4.3 |
| `e2e/accessibility.spec.ts` (edit) | The sign-in screen |
| `.claude/agents/ui-check.md` (edit) | Choose "Sign in as Alex Rivera" first. Check the sign-in screen too |

### Phase 2: Search

#### Part 7: Search (backend)

| File | What changes |
|---|---|
| `backend/app/search/__init__.py`, `routes.py`, `service.py` (new) | `GET /search?q` (spec 4.12 and 9.4): up to 5 organizations, 5 contacts and 5 deals whose folded names hold the folded term. Names that start with it come first, then the rest, each A to Z. Each match has its detail |
| `backend/app/main.py` (edit) | Adds the search router |
| `backend/tests/test_search.py` (new) | See 4.1 |

#### Part 8: Search (frontend)

| File | What changes |
|---|---|
| `frontend/src/search/SearchBox.tsx`, `.module.css` (new) | The search box (spec 4.12 and 5.6): a React Aria combobox inside a search landmark, with the 250 ms wait, the three groups and their details, "No matches", and a live region with the count. Escape closes the list, then clears the box. Choosing a match opens it and clears the box |
| `frontend/src/search/queries.ts` (new) | `useSearch(term)` |
| `frontend/src/components/AppShell.tsx`, `.module.css` (edit) | The box between the sections and the right end of the bar. It's 280 px wide, or 200 px when the bar is short of space, and moves into the Menu at 640 px and below |
| `frontend/src/lib/queryKeys.ts` (edit) | A search key, which every change refreshes |
| `frontend/src/search/SearchBox.test.tsx` (new) | See 4.2 |

#### Part 9: Search (end-to-end)

| File | What changes |
|---|---|
| `e2e/9-search.spec.ts` (new) | See 4.3 |
| `e2e/accessibility.spec.ts`, `keyboard.spec.ts`, `performance.spec.ts` (edit) | With search results open. Search for a deal and open it. The search time |

### Phase 3: The user menu

#### Part 10: The user menu (frontend)

| File | What changes |
|---|---|
| `frontend/src/lib/theme.ts` (edit) | `Theme` adds `system`, and a stored `light` or `dark` still works. System follows `prefers-color-scheme` and changes with it. The page still shows light or dark through `data-theme`, so `tokens.css` doesn't change |
| `frontend/index.html` (edit) | The early script applies System too, so a device set to dark never flashes light |
| `frontend/src/lib/people.ts` (new) | `useMe()` for `/api/me`. How a person shows, and their initials (spec 2, Person) |
| `frontend/src/components/UserMenu.tsx`, `.module.css` (new) | The initials button and its menu (spec 4.14 and 5.6): the name and email, the theme group with a check on the current choice, and "Sign out" |
| `frontend/src/components/AppShell.tsx`, `.module.css` (edit) | The user menu takes the toggle's place at the right end of the bar, outside the Menu at every width |
| `frontend/src/components/ThemeToggle.tsx`, `ThemeToggle.test.tsx` (delete) | The menu replaces the toggle |
| `frontend/src/lib/theme.test.ts` (edit) and `lib/people.test.ts`, `components/UserMenu.test.tsx` (new) | See 4.2 |

#### Part 11: The user menu (end-to-end)

| File | What changes |
|---|---|
| `e2e/7-dark-mode.spec.ts` (renamed `7-theme.spec.ts`, and edited) | See 4.3 |
| `e2e/8-sign-in.spec.ts` (edit) | Signing out |
| `e2e/accessibility.spec.ts`, `keyboard.spec.ts` (edit) | The user menu in place of the "Dark mode" toggle |
| `.claude/agents/ui-check.md` (edit) | Switch the theme through the user menu |

### Phase 4: Docs and the full check

| File | What changes |
|---|---|
| `docs/TECH_STACK.md` (edit) | Supabase and Render are part of the stack now, not later. The data lives in Postgres, and a local copy and the tests use SQLite |
| `docs/STATUS.md` (edit) | Setup: setting up the Supabase project (sign-ups off, asymmetric signing keys, people added, the session pooler's connection string), writing `.env`, and setting up the Render Blueprint. The results of the checks |
| `docs/spec.md`, `docs/specs/*.md` (edit, if needed) | Only where the build departs from the spec |

### Files that come back in a later phase

| File | Phases and parts |
|---|---|
| `backend/app/main.py` | 1 (part 2), 2 (part 7) |
| `frontend/src/components/AppShell.tsx`, `.module.css` | 2 (part 8), 3 (part 10) |
| `e2e/accessibility.spec.ts`, `e2e/keyboard.spec.ts` | 1 (part 6), 2 (part 9), 3 (part 11) |
| `e2e/performance.spec.ts` | 1 (part 6), 2 (part 9) |
| `e2e/8-sign-in.spec.ts`, `.claude/agents/ui-check.md` | 1 (part 6), 3 (part 11) |

**Not changed:** `.github/workflows/ci.yml`, because CI already runs `npm run check:quick` with no secrets and the tests run as a local copy. `styles/tokens.css`, because the new screens use the tokens in spec 5.2. `README.md`, the course's own guide.

## 2. Order of work

**In every phase:**

- Work in small steps, and check each one before the next. Where the spec gives a rule, write the test first.
- Before using a library API, read its current docs with Context7. Each phase lists the ones it needs.
- Parts in the same step can run at the same time, each in its own worktree. Merge them in the order listed, and run `npm run check:quick` after each merge.
- End each phase with `npm run check`. It's the only run of the end-to-end suite. The end of each phase is a good place to commit.
- Keep the Supabase settings out of `.env` until phase 1, step 4. Until then, everything runs as a local copy.

### Phase 1: Sign-in and the database

**Goal:** signed out, every page shows the sign-in screen and every API route refuses. Signed in, everything works as before, and each record and activity shows who added it. The same code runs on Supabase.

**Docs to read:** Alembic (running from code with a shared connection, batch mode and offline SQL), SQLAlchemy 2.1 (`extract`, `collate`, `on_conflict_do_nothing` and the psycopg dialect), PyJWT (`PyJWKSet` and `decode` with an audience and issuer), supabase-js (`createClient`, `signInWithPassword`, `getSession`, `onAuthStateChange` and `signOut`), FastAPI (router dependencies and `StaticFiles`) and Render Blueprints.

1. **Parts 1, 2 and 5 together.**
   - Part 1: the baseline migration first, and check that it makes exactly today's tables. Then `0002_people`, the fold, the month, the sample data and the seed command.
   - Part 2: the settings, tokens and people first, as functions with their own tests. Then `CurrentPerson`, the auth routes and `main.py`. Then `conftest.py`, so that every existing test runs signed in.
   - Part 5: `frontend.py`, `env.mjs` and `test.mjs`, then `dev.mjs`, `seed.mjs` and `start.mjs`, then `render.yaml`.
   - Merge part 1, then part 5, then part 2, because `main.py` calls `mount_frontend`. Every existing backend test passes.
2. **Parts 3 and 4 together.**
   - Part 3: `authors.py`, then one area at a time: organizations, contacts, deals, then activities. Then the caption and the timeline.
   - Part 4: `signInErrors.ts` and `session.ts`, with a stand-in for Supabase's client. Then `api.ts`, then the sign-in screen and the gate.
   - Merge part 3, then part 4.
3. **Part 6.** The fixtures first, then the existing specs, then the new ones.
4. **On Supabase, with the person who owns the account.** They set up the project as `docs/STATUS.md` will say, and write `.env`. Then:
   - `npm run dev` runs the migrations on the empty database and loads the sample data.
   - They sign in with their own password, add a record, and see their name on its page.
   - `npm start` does the same, the way Render runs it.
   - A read-only look through Supabase's MCP server checks the tables, row-level security on each one, and Supabase's security advisors.

   The migrations are final after this step. No later phase changes the schema.

**Done when:** `npm run check` passes and step 4 works.

### Phase 2: Search

**Goal:** a search box in the top bar finds any organization, contact or deal by part of its name, in any case.

**Docs to read:** React Aria `ComboBox` with sections and items from the server, and how it handles Escape.

1. **Parts 7 and 8 together.**
   - Part 7: the service and its tests, then the route.
   - Part 8: `SearchBox` against a stand-in for the API, then its place in the top bar at 1,440, 1,100, 640 and 320 px.
   - Merge part 7, then part 8.
2. **Part 9.**

**Done when:** `npm run check` passes.

### Phase 3: The user menu

**Goal:** a menu under the person's initials holds the theme, Light, Dark or System, and signing out.

**Docs to read:** React Aria `MenuTrigger`, `Menu` and `MenuSection` with `selectionMode="single"`, and `TooltipTrigger`. The `change` event on `matchMedia`. Sonner's `theme` prop.

1. **Part 10:** `people.ts`, then System in `theme.ts`, then `index.html`, then `UserMenu`, then the top bar. Delete `ThemeToggle` last.
2. **Part 11.**
3. Reload with System on a device set to dark and the network slowed down in Chrome, and look for a flash of light.

**Done when:** `npm run check` passes.

### Phase 4: Docs and the full check

1. Update `docs/TECH_STACK.md` and `docs/STATUS.md`. Bring the spec and this plan in line with anything the build changed.
2. Make a copy of the working tree without `node_modules/`, `.venv/`, `data/` or `.env`. Run `npm run check` in the working tree, with the settings in `.env`, and again in the copy, which has none.
3. Do the hands-on check in spec 10.4. First as a local copy, in the copy from step 2. Then on Supabase, with the person who owns the account.
4. Run ui-check on a local copy.
5. Record the results in `docs/STATUS.md`.

Then Deploy: the review against `docs/REVIEW.md`, the fixes, `docs/IMPROVE.md`, and the merge. The person who owns the accounts sets up the Render Blueprint from `render.yaml` and enters the three settings. Render deploys `main` once CI passes on it.

## 3. Risks

1. **The migrations and `tables.py` drift apart.** The queries use `tables.py`, and the real tables come from the migrations. *Mitigation:* a test runs the migrations on an empty SQLite file and compares the result with `tables.py`: tables, columns, foreign keys and indexes.
2. **A local database from before this change.** It has the tables but no `alembic_version`, so the baseline migration would fail on tables that already exist. *Mitigation:* `init_db` stamps such a file at `0001` before it upgrades. A test does this with a file that holds rows, and the rows survive with no one recorded.
3. **SQL that works on SQLite but not on Postgres.** No test reaches Postgres. Today's code has two cases, `strftime` in the dashboard and `NOCASE` in the contact picker. Postgres also returns `Decimal` from `SUM`. *Mitigation:* `extract()` and `fold()`, a test that no SQLite-only SQL is left outside `lists.py`, the queries compiled for Postgres in `test_dialects.py`, sums turned into `int`, and a run on Supabase at the end of phase 1, not at the end of the change.
4. **Search and sorts give different results on the two databases.** On Postgres, `lower()` folds more than A to Z, and the default collation sorts differently from SQLite. *Mitigation:* `lower(column COLLATE "C")` folds only A to Z and sorts by bytes, as `NOCASE` does. `test_dialects.py` checks the compiled SQL, and phase 1, step 4 checks the fold with one read-only query on Supabase.
5. **The tests touch Supabase.** A developer's shell or `.env` can hold the settings. *Mitigation:* `scripts/test.mjs` removes them, `conftest.py` clears them, and the Playwright servers get them empty, which the backend treats as not set. The end-to-end guard fails any request beyond `127.0.0.1`. A local copy never loads Supabase's client.
6. **Tests that take more than a second.** Running the migrations for each test, and making RSA keys, take time. Today the slowest backend test takes 0.29 s and the slowest frontend test 0.35 s. *Mitigation:* one migrated database per session, copied for each test, and keys made once per session. The hook and `testTimeout` fail any test over a second.
7. **Local sign-in where it shouldn't be.** A copy without the settings on another computer, or on Render, would offer sign-in with no password. *Mitigation:* the backend checks the address the connection arrived on, the ASGI scope's `server`, for each local sign-in and each local token. A request from another computer arrives on another address, whatever its `Host` header says. Tests cover `127.0.0.1`, `localhost` and some settings but not all.
8. **A Supabase project on the old shared secret.** It signs tokens with HS256, and its key set is empty. *Mitigation:* the backend accepts only ES256 and RS256, and the setup in `docs/STATUS.md` checks that the project uses asymmetric signing keys.
9. **Two first requests from a new person at once.** After signing in, the app sends several requests, and each would add the person's row. *Mitigation:* the insert skips a row that's already there, with `ON CONFLICT DO NOTHING` on both databases. Then it updates the email or name only when they changed.
10. **Supabase's Data API serves the data.** Anyone with the publishable key can call it. *Mitigation:* the migration turns on row-level security on every table, `alembic_version` included. Phase 1, step 4 checks it and Supabase's security advisors.
11. **A branch's migrations run on the team's database.** `npm run dev` with the settings migrates the shared database, and switching branches doesn't undo it. *Mitigation:* nobody uses the shared database before phase 1, step 4. The migrations are final after it, and later phases add none.
12. **`npm run seed` doesn't see `.env`.** The npm script runs Python, which doesn't read `.env`, so it would reset the local file while `npm run dev` uses Supabase. *Mitigation:* `scripts/seed.mjs` passes the settings in `.env` to the seed command, which then refuses.
13. **Signing out removes more than the session.** Supabase's client keeps its session in `localStorage`, next to the theme. *Mitigation:* `signOut({ scope: "local" })` ends only this browser's session. An end-to-end test checks that the theme stays on a local copy, and phase 1, step 4 and the hands-on check confirm it on Supabase.
14. **Render's build and health check.** Render's Python runtime includes Node, but maybe an older one than the Node 24 that `package.json` asks for. Its health check may also send a `Host` that the backend doesn't allow. *Mitigation:* `NODE_VERSION` in `render.yaml`, and a read of the first deploy's logs. `npm start` is the closest local copy of Render.
15. **Connections to Supabase.** The transaction pooler doesn't support prepared statements, and the pooler closes connections while the app sleeps on Render. *Mitigation:* `DATABASE_URL` uses the session pooler on port 5432 (spec 9.8), and the engine uses `pool_pre_ping`.
16. **Gitleaks flags fake secrets in the tests.** A token or key written in a test file looks like a real one. *Mitigation:* tests make their tokens and keys when they run, and use fake settings that don't look like keys, such as `test-publishable-key`.
17. **The end-to-end suite's direct API calls.** About 30 calls in eight files would get 401. *Mitigation:* the `api` fixture, in phase 1, part 6, before any new spec.
18. **FastAPI's own pages.** `/docs` and `/openapi.json` would be open, and would take the app's page from those addresses. *Mitigation:* `main.py` turns them off.
19. **Parts built in parallel don't fit together.** *Mitigation:* the shared names in section 1, a fixed merge order, and `npm run check:quick` after each merge.
20. **SQLite's table rebuild loses links.** Found while building phase 1. Batch mode rebuilds each record table to add its foreign keys, and drops the old table. With foreign keys on, as every connection has them, that drop set `contacts.organization_id` to null and deleted the activities that cascade from the table. An experiment on a file with rows showed both. *Mitigation:* `init_db` runs the migrations on SQLite with foreign keys off, then `PRAGMA foreign_key_check` in the same transaction, and turns them back on. `test_migrations.py` fails without it.

## 4. Proof

### 4.1 Backend unit tests (pytest)

**`test_migrations.py`**

- On an empty SQLite file, the migrations make the tables, columns, foreign keys and indexes that `tables.py` describes.
- A file made by the baseline, with rows, upgrades. The rows keep their data, with no one recorded.
- Running the migrations twice changes nothing.
- The sample data loads when the tables are empty, and not when they have rows.

**`test_dialects.py`**

- Compiled for Postgres, without a server, searches and text sorts use `lower(... COLLATE "C")`, and the month uses `EXTRACT`. Compiled for SQLite, they use `lower()`.
- `fold_text` changes only A to Z, so "ÉMILE" becomes "Émile".
- The migrations, as offline SQL for Postgres, turn on row-level security for every table.
- No `strftime`, `NOCASE` or `julianday` is left in `backend/app` outside `lists.py`.

**`test_seed.py`:** with `DATABASE_URL` set, the seed command changes nothing, prints the message in spec 9.6 and exits nonzero.

**`test_sample_data.py`** (added to): the three teammates, and someone recorded on every record and activity, in the sample data and in the large data set.

**`test_settings.py`**

- All three settings mean Supabase. None means a local copy. An empty value counts as none.
- One or two of them stop the backend with a message that names the missing ones.

**`test_tokens.py`**, with signing keys the test makes and a stand-in for the key fetch:

- A valid token passes. The person comes from its `sub` and `email`, and its name from `full_name`, or `name` when there's no `full_name`.
- A missing token, an expired one, a bad signature, the wrong audience, the wrong issuer, an unknown key and an HS256 token each get 401.
- The keys are fetched once and kept. A token with an unknown key fetches them again, once.

**`test_auth.py`**

- Every route in the app answers 401 without a token, apart from `/health`, `/auth/config` and `/auth/local`.
- `/auth/config` on Supabase and on a local copy.
- `/auth/local` gives a teammate a token on a local copy. It answers 404 on Supabase, and refuses on a connection that isn't to `127.0.0.1`.
- A local token is refused when the backend runs on Supabase, and after the backend starts again.
- `/me` gives the signed-in person.
- A person named in a request's body, address or other headers is ignored.

**`test_people.py`**

- The first request makes the person's row, and a token with a new name updates it.
- How a person shows: their name, or their email when they have no name.

**`test_today.py`:** with `TZ` set to `America/New_York`, 03:00 UTC on Nov 20 is still Nov 19, and 05:00 UTC is Nov 20. With `Asia/Kolkata`, 20:00 UTC on Nov 19 is already Nov 20.

**`test_health.py`** (edit): `/api/health` answers without a token, and says nothing but that the server is up.

**`test_authors.py`**

- Adding each kind of record sets both people to the signed-in person.
- An edit by another person sets `updated_by` and `updated_at`, and keeps `created_by`.
- A stage change, a board move within a column and to another, a follow-up marked done and not done, and a Won deal that makes its contact a customer each set `updated_by` on the right records. A stage change's activity names the person who moved the deal.
- Logging an activity on a record doesn't change the record.
- Deleting an organization leaves its contacts' and deals' `updated_by` alone.
- `created_by` and `updated_by` in a request body are ignored.
- A record with no one recorded gives `null` for both.

**`test_search.py`** (phase 2)

- Part of a name, in any case, finds an organization, a contact and a deal.
- Names that start with the search come first, then the rest, each A to Z.
- At most 5 of each kind.
- The details: an organization's industry, a contact's organization, and a deal's organization and stage, each empty when there's nothing.
- `%` and `_` match themselves.
- Without a token, 401.

**`test_frontend.py`**

- With a built frontend, a file loads as itself, and `/contacts/12` gets `index.html`.
- An unknown `/api` address still answers 404 in JSON.
- Without a built frontend, nothing is served outside `/api`.

**The existing tests** pass, signed in as Alex Rivera. The hook fails any test, old or new, that takes more than a second.

### 4.2 Frontend unit tests (Vitest)

**`signin/signInErrors.test.ts`:** `invalid_credentials` gives "That email and password don't match. Try again." A failed fetch gives "Can't reach the sign-in service. Check your internet connection, then try again." Too many attempts, or anything else, gives "Couldn't sign in. Try again in a few minutes."

**`signin/SignInPage.test.tsx`**, with Supabase's client replaced by a stand-in:

- Empty fields say "Enter your email." and "Enter your password." under them.
- A wrong password, no answer and too many attempts each show their message at the top of the form.
- While it waits, the button says "Signing in…" and ignores more clicks.
- Success shows the app at the same address.
- The ended-session message shows until the person signs in.
- On a local copy, the screen lists the teammates, and choosing one signs in with no password.
- The page title is "Sign in · Accountable", and focus is on the `h1`.

**`lib/session.test.ts`**

- A local copy never loads Supabase's client.
- On Supabase, the client gets the URL and publishable key from `/api/auth/config`.
- `getAccessToken()` gives the token in each mode.
- Signing out ends the session and keeps `accountable-theme`.

**`lib/api.test.ts`** (added to): every request sends the token, a 401 ends the session, and the unreachable message names the internet connection.

**`App.test.tsx`** (edit)

- It signs in through a stand-in session.
- Signed out, every address shows the sign-in screen.
- A 401 during a session shows the sign-in screen with "Your session has ended. Sign in again." Signing in returns to the same page, and its records load again.

**`components/AddedBy.test.tsx`:** "Added by … on …", then "Last changed by … on …" only once the record has changed, and "–" for no one.

**`search/SearchBox.test.tsx`** (phase 2), with fake timers:

- It waits 250 ms after typing stops.
- The groups come in order, and a group with no matches is left out.
- Each match shows its detail, or "–".
- "No matches for "zz"."
- The live region says "7 matches."
- The arrow keys move across the groups, Enter opens a match, and Escape closes the list, then clears the box.
- Choosing a match opens its page and clears the box.

**`lib/people.test.ts`** (phase 3): "Alex Rivera" gives "AR", "Cher" gives "C", `jo.lee@team.example` gives "JL", `sam@team.example` gives "S", and dashes and underscores split an email too. A person shows as their name, or their email when they have no name.

**`lib/theme.test.ts`** (phase 3, edit)

- Light, Dark and System are read, saved and shown. Light when nothing usable is stored or storage is blocked.
- System follows the device's setting, and changes with it.
- A `light` or `dark` stored before this change still works.

**`components/UserMenu.test.tsx`** (phase 3)

- The button shows the initials, and its name is "Account: Alex Rivera", or the email for a person with no name.
- The menu shows the name and email, and the email only once for a person with no name.
- The current theme has a check. Choosing a theme applies it and closes the menu.
- Each theme and "Sign out" work by mouse and by keyboard.

**`styles/tokens.test.ts`** is unchanged, and still finds no color written outside `tokens.css` in the new CSS. **`components/ThemeToggle.test.tsx`** goes with the toggle.

`testTimeout` fails any test, old or new, that takes more than a second.

### 4.3 End-to-end tests (Playwright Test, installed Chrome)

Every test runs as a local copy. It signs in as Alex Rivera through local sign-in, unless it says otherwise.

**`1-start.spec.ts`** (edit): a new browser opens on the sign-in screen. Signing in as a teammate opens the dashboard with the sample data.

**`8-sign-in.spec.ts`** (new in phase 1, with signing out added in phase 3)

1. Signed out, each address in spec 4.1 shows the sign-in screen, with no top bar, and the title "Sign in · Accountable".
2. Signed out, every API route in spec 9.4 but the three open ones answers 401.
3. Signing in at `/contacts/3` opens `/contacts/3`, with focus on its `h1`.
4. A 401 during a session, after the stored token is replaced with an old one, shows "Your session has ended. Sign in again." Signing in returns to the same page.
5. Phase 3: signing out from the user menu shows the sign-in screen with focus on its `h1`. Back shows the sign-in screen and no records, and the theme stays.

**`10-who.spec.ts`** (new)

- Alex adds an organization, and its page says "Added by Alex Rivera on" today's date. Jordan edits it, and the page adds "Last changed by Jordan Blake on" today's date.
- A call that Jordan logs shows "by Jordan Blake" in the timeline. A deal that Jordan moves on the board shows its stage change by Jordan Blake.

**`9-search.spec.ts`** (new in phase 2)

- At full width, part of an organization's, a contact's and a deal's name, each in another case, finds them. Opening each one shows its page and clears the box.
- "zz" shows "No matches for "zz"."
- At 320 px, the box is in the Menu, and the same search works.

**`7-theme.spec.ts`** (phase 3, renamed from `7-dark-mode.spec.ts`)

- Light by default.
- Light, Dark and System from the user menu, with a check on the current choice.
- System follows Chrome's emulated light and dark settings, and changes while the app is open.
- The choice is kept after a reload, after a restart from stored state, and after signing out, on the sign-in screen too.
- On every screen and at 320 px, the initials button is in the top bar, outside the Menu.
- Charts, dialogs and messages follow the theme, as they do today.

**`accessibility.spec.ts`** (edited in each phase), in light and dark mode: axe finds no violations on the sign-in screen and local sign-in (phase 1), with search results open (phase 2), and with the user menu open and the initials tooltip showing, in place of the "Dark mode" tooltip (phase 3).

**`keyboard.spec.ts`** (edited in each phase): sign in (phase 1). Search for a deal and open it (phase 2). Open the user menu, choose Dark, then Light, and sign out, in place of the "Dark mode" toggle test (phase 3).

**`performance.spec.ts`** (edit): its API calls send the token (phase 1). A search in the top bar on the large data set, less the 250 ms wait, is under the limit (phase 2).

**`2-tables.spec.ts` to `6-dashboard.spec.ts`:** the same tests, with their API calls through the `api` fixture.

### 4.4 Other proof

- **On Supabase**, with the person who owns the account, at the end of phase 1 and in the hands-on check: `npm start` runs the built app as Render does. They sign in with their own password, add a record, see their name on its page, find it with search, and sign out, and the theme stays. A read-only look through Supabase's MCP server confirms the tables, row-level security on each one, no security advisor warnings about them, and who added the new record.
- **Wrong settings:** `npm start` with a setting missing names it and stops. The backend with two of the three stops and names the third.
- **The hands-on check:** spec 10.4 as a local copy, in light and dark mode, with the results in `docs/STATUS.md`.
- **ui-check** on a local copy.
- **CI** passes `npm run check:quick` with no secrets.

### 4.5 The success criteria

| Criterion | Proof |
|---|---|
| 1. `npm run check` passes and never touches Supabase, with or without the settings in `.env` | Phase 4, step 2, run both ways. The guards in risk 5, and `test_settings.py` |
| 2. Signed out, every page shows the sign-in screen and every API route refuses. Signed in, everything works as before | `test_auth.py`, `App.test.tsx`, `8-sign-in.spec.ts`, and every existing test passing signed in |
| 3. Every record and activity shows who added it | `test_authors.py`, `test_sample_data.py`, `AddedBy.test.tsx` and `10-who.spec.ts` |
| 4. Search finds an organization, a contact and a deal by part of a name, in any case | `test_search.py`, `test_dialects.py`, `SearchBox.test.tsx` and `9-search.spec.ts` |
| 5. The menu's theme choice is remembered, and System follows the device's setting | `theme.test.ts`, `UserMenu.test.tsx` and `7-theme.spec.ts` |
| 6. The built app runs on this computer the way Render runs it, signed in against Supabase | `npm start` on Supabase, in 4.4 |

## 5. Departures from the plan

One agent built the parts one after another, in the order of section 2, so nothing was merged from worktrees. The build kept to the plan apart from these.

### Phase 1

- **Migrations on SQLite run with foreign keys off** (risk 20). The plan didn't know that SQLite's rebuild drops linked rows. `db.py` gained `_foreign_keys_off` and a `foreign_key_check`.
- **`[tool.alembic]` in `pyproject.toml`,** so `uv run alembic revision -m "…"` finds `backend/migrations` and its `script.py.mako`. `env.py` refuses to run without the app's connection, because the app runs the migrations itself.
- **The built frontend uses FastAPI's own `app.frontend(..., fallback="index.html")`,** new in FastAPI 0.165, in place of `StaticFiles` and a hand-written fallback. It sends `index.html` only to GET and HEAD requests that accept HTML. An unknown address under `/api` gets a JSON 404 from a catch-all route that `mount_frontend` adds before it.
- **`create_app` takes `settings` and `frontend`,** so tests run a local copy whatever the environment holds, and serve a built frontend only when they make one. The plan's shared names didn't list them.
- **The key fetch for an unknown `kid` runs at most once a minute.** The plan said "again only for an unknown `kid`", which would let made-up keys make the backend call Supabase on every request. A token that arrives while the keys can't be fetched gets 503, not 401, so a network blip doesn't sign anyone out. Spec 9.3 and 9.7 say so.
- **`POST /auth/local` answers 403** on a connection that isn't to `127.0.0.1`, and 422 for anyone but a teammate. Spec 9.4 says so.
- **The teammates' ids are readable,** such as `sample-alex-rivera`, so they can't clash with Supabase's UUIDs and the tests read well.
- **Small shared files the plan didn't list:** `components/Logo.tsx` (the mark, now shared by the top bar and the sign-in screen, which sits outside the router), `dayOf` in `lib/format.ts` (a timestamp's local date, for the caption), `PersonRef` and `Authored` in `lib/api.ts`, and `forgetFocusedPath` in `components/PageHeader.tsx`, so the screen that opens after signing in takes focus even at the same address.
- **The sign-in screen has a state the spec didn't describe:** when `/api/auth/config` gets no answer, it says "Can't reach Accountable. Check your internet connection, then try again." with a "Try again" button. Spec 4.13 says so.
- **The end-to-end sign-in** stores the token with an init script that runs only on a tab's first load, so a test that signs out stays signed out after a reload.
- **The caption** counts a record as changed when its `updated_at` or its `updated_by` differs from when it was added, so a sample record that one teammate added and another last changed says both.
- **Phase 1, step 4 waits for the person who owns the Supabase account.** Phases 2 and 3 change no schema, so they went ahead as local copies. `render.yaml` uses `oregon` and `America/New_York` until that person names the Supabase project's region and the team's time zone: a Render service can't change region after it's made.

### Phase 2

- **`lib/useDebounced.ts`,** a file the plan didn't list. The picker's own wait moved there, so the search box and the pickers share it.
- **axe runs without `aria-hidden-focus` while the search results are open.** While any combobox's list is open, React Aria's `useComboBox` sets `aria-hidden` on the rest of the page, with no option to use `inert`. axe then flags the links and buttons there, though focus can't reach them: Tab leaves the box and closes the list first. React Spectrum lists it as a [known false positive](https://github.com/adobe/react-spectrum/wiki/Known-accessibility-false-positives). The pickers pass only because they sit in a dialog, and axe allows hidden content while a modal is open. Moving the box to `Autocomplete`, which hides nothing, would mean writing the combobox's roles and keys by hand. So the test leaves out that one rule while the list is open, then checks what the rule guards: Tab closes the list, nothing stays hidden, and axe passes with every rule. Spec 10.3 says so.
- **Each group in the results has an `aria-label`.** Without it, VoiceOver said "Entered group , with 2 options", with no name, because React Aria reads the label for that announcement, not the group's header.
- **The performance test measures search last.** An open list hides the rest of the page from Playwright's role queries, so the board and table checks run first. It times from typing to the live region's count, which speaks only once the term's own matches arrive, not while the last term's still show.
- **A test that depended on the time of day.** `keyboard.spec.ts` expected the deal's new stage change before the sample one, but the sample one is dated today at 10:42. Before 10:42, the new one is older, and the test failed. It was there before this change. It now checks the two moves in any order.

### Phase 3

- **The initials button's accessible name adds the initials:** "Account: Alex Rivera, AR". The tooltip still says "Account: Alex Rivera". With the name alone, axe's `label-content-name-mismatch` (WCAG 2.5.3, Level A) failed, because the visible "AR" wasn't in it. Someone using speech input says what they see, so the name now holds both labels. axe drops text in parentheses, so "(AR)" wouldn't do. Spec 4.14 says so.
- **The button while the person loads, and when they can't be loaded.** A plain circle holds its place while `/api/me` loads. If it fails, the button shows a person icon and is named "Account", so signing out still works. Spec 4.14 says so.
- **The name and email sit in the popover above the menu,** as text, with a rule under them, so they aren't menu items.
- **`theme.ts` keeps the choice in memory too,** so it lasts until a reload when storage is blocked, and gains `startTheme()`, which `main.tsx` calls, and `useShownTheme()`, which gives the messages light or dark. `frontend/test/device.ts`, a stand-in for the device's setting, is shared by two tests.
- **The "Can't reach Accountable" banner no longer hides when an older request succeeds.** It showed while the last request to answer had failed. With the user menu, every screen also asks for `/api/me`, so when a screen's request failed, `/me` could answer just after and hide the banner, leaving the screen empty with no "Try again". `1-start.spec.ts` caught it, and holding `/me` back in Chrome showed the banner going as `/me` answered. Now `api.ts` numbers its requests, and only one sent after the failure clears the banner. `api.test.ts` checks it.
- **Step 3, the flash check, ran as a script in Chrome,** against the end-to-end servers, not a copy: Chrome set to dark, System chosen, and the app's script held back 3 seconds. Before the script loaded, `<html>` already had `data-theme="dark"` and `color-scheme: dark`.

### Deploy: review fixes

The reviewer subagent found nothing Important. Two of its other findings were fixed before the merge.

- **The token is checked before a database connection opens.** `get_person` asked for the connection and the token check in one function, so FastAPI opened the connection first. Every request with no token or a bad one held a pooled connection until its 401, and while the signing keys couldn't be fetched, for up to the fetch's 5 seconds. The check moved to `get_token_person` in `deps.py`, which `get_person` asks for before the connection. `test_auth.py` and `test_tokens.py` count the connections, and both failed before the fix. Spec 9.3 says so.
- **A token that Supabase can't renew keeps the session.** When the token had run out and Supabase didn't answer to renew it, `getSession()` gave no session, with a retryable error, though Supabase kept the session. `getAccessToken()` then sent no token, the API answered 401, and signing out deleted the stored session. Now `getAccessToken()` throws on that error, and `api.ts` treats it as unreachable, as it does the backend's 503. A test in `session.test.ts` failed before the fix. Spec 3.10 says so.
