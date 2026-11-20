# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` from the repository root before finishing a code change. It runs the frontend type check, all frontend and backend unit tests, and all Playwright end-to-end tests in Google Chrome. It attempts each check even if an earlier one fails and exits nonzero if any check fails. Fix failures and rerun the full command.
