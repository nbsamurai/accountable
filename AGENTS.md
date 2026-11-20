# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read `docs/spec.md` first. It is the source of truth for the whole product. Update it in the same change whenever product behavior changes.

Each change has a folder at `docs/changes/<branch name>/` with an `intent.md` for the proposed change and a `plan.md` for implementing it. When working on a change, read only the folder for the current branch under `docs/changes/`.

See `docs/TECH_STACK.md` for the stack and `docs/STATUS.md` for progress and setup. Update `docs/STATUS.md` when you finish a piece of work.

Follow the [coding standards](docs/STANDARDS.md) when changing code.

## Testing

Run `npm test` from the repository root before finishing a code change. It runs the frontend type check, all frontend and backend unit tests, and all Playwright end-to-end tests in Google Chrome. It attempts each check even if an earlier one fails and exits nonzero if any check fails. Fix failures and rerun the full command.
