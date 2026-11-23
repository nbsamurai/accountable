This project will use the following high level technical stack:

1. Node.js 26, the current LTS (24 or later works) / TypeScript for the frontend, using React and Vite, in `frontend/`
2. Python 3.12 for the backend using uv, with FastAPI, in `backend/`, with `pyproject.toml` and `uv.lock` at the repo root

The frontend gets its data from the backend's JSON API. The backend uses SQLAlchemy Core with no raw SQL, and Alembic migrations that run when it starts. It fills the database with the sample data when the tables are empty.

- **The team's copy** keeps its data in Postgres on Supabase, and signs people in with Supabase Auth, by email and password. `@supabase/supabase-js` keeps the session in the browser. The backend checks each token with PyJWT and reaches Postgres through psycopg 3. It runs on Render's free plan as one web service, which serves the built frontend and the API. `render.yaml` describes it.
- **A local copy,** with none of the three Supabase settings in `.env`, keeps its data in a SQLite file in `data/`, and signs in as made-up teammates with no password. The tests always run as a local copy, so they never touch Supabase.

Prefer popular, well-supported libraries to custom code, such as for the data tables, the charts and the drag-and-drop pipeline. Don't hand-roll what a mature library does well.

Commands are npm scripts in a `package.json` at the repo root, with `frontend/` as an npm workspace, so they work the same on Mac, Linux and Windows:

- `npm run dev` starts the backend and the frontend together: on Supabase when `.env` holds its settings, or as a local copy
- `npm start` builds the frontend and runs one server, as Render does
- `npm test` runs all the tests and enforces 80% unit coverage for the frontend and backend
- `npm run check` runs Prettier, ESLint, Ruff, TypeScript, ty, Gitleaks and the test suites. `npm run check:quick` skips the end-to-end suite
- `npm run format` applies Prettier and Ruff formatting
- `npm run seed` resets a local copy's database to the sample data. It refuses when `DATABASE_URL` is set, so nobody resets the team's data by accident

`docs/STATUS.md` says how to run the app. `README.md` is the course's own guide, so leave it as it is.

Testing will cover:

1. Unit tests for the frontend, using Vitest
2. Unit tests for the backend, using pytest
3. End-to-end tests of the whole app in a browser, in `e2e/`, using Playwright Test (`@playwright/test`) with the installed Google Chrome. They start the app themselves, so `npm test` needs nothing else running.

The tests use a database of their own and leave the Supabase settings out, so running them never changes your data or touches Supabase.

GitHub Actions runs `npm run check:quick` on every push to any branch, after a Gitleaks scan of the whole history. It leaves out the end-to-end tests, which run only in `npm run check` on a developer's computer.
