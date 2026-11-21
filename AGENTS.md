# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read `docs/spec.md` first. It is the source of truth for the whole product. Update it in the same change whenever product behavior changes.

Each change has a folder at `docs/changes/<branch name>/` with an `intent.md` for the proposed change and a `plan.md` for implementing it. When working on a change, read only the folder for the current branch under `docs/changes/`. If the work departs from `plan.md`, update `plan.md` in the same change and say why. A note in `docs/STATUS.md` isn't enough.

See `docs/TECH_STACK.md` for the stack and `docs/STATUS.md` for progress and setup. Update `docs/STATUS.md` when you finish a piece of work.

Follow the [coding standards](docs/STANDARDS.md) when changing code.

At Deploy, after the review fixes and before the merge, follow [Improve the harness](docs/IMPROVE.md).

## Testing

Run `npm run check` from the repository root before finishing a code change. It checks formatting, linting, cyclomatic complexity (maximum 15 per function), types and secrets, then runs `npm test`. The test command enforces at least 80% unit coverage in both the frontend and backend and runs the Playwright end-to-end tests in Google Chrome. The checks continue after a failure and the command exits nonzero if any check fails. Fix failures and rerun the full command.

Before you report a change as done, do the hands-on check in spec 10.4 yourself, in desktop Chrome, through a browser tool such as Claude in Chrome. Run it from a copy of the working tree without `node_modules/`, `.venv/` or `data/`, so the user's database isn't touched. Read values from the page, not from a scaled-down screenshot. Before you report a bug, reproduce it with the element in view. If you can't control a browser, say that the check is still open.

Use `npm run check:quick` during development to skip the end-to-end suite. CI runs only `npm run check:quick`, so your `npm run check` is the only run of the end-to-end suite. Use `npm run format` to apply Prettier and Ruff formatting.

Leave `.env` for the user to manage. The Codex and Claude Code Stop hooks run `npm run check:quick` and give the agent one follow-up attempt if it fails. See the [hook setup](docs/STATUS.md#development-hooks).
