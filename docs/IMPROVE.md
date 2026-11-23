# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Look at what went wrong on this change: the review's findings, what the person corrected and what the checks caught. Compare the work with the change's `plan.md` for steps or tests that were skipped or done differently, and check that each test file the plan names exists, or was deleted or renamed as the plan says. If you didn't build the change, ask the person what they corrected.
2. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead. To find earlier times, read the watch list below, the earlier reviews in `docs/`, the review sections of `docs/STATUS.md` and the departures in each `docs/changes/*/plan.md`. A mistake counts each time it happens, even in a plan, and even when it was caught before the review. Add a mistake seen for the first time to the watch list.
3. Remove anything out of date, the watch list included.
4. Improve this file, so that the next round makes a better change. Keep this as the last step.

## Watch list

Mistakes seen once. If one happens again, follow step 2 and take it off this list.

- **Sign-in, Nov 23, 2026:** a request that failed the token check still opened a database connection, because FastAPI resolves a dependency's parameters before it runs the dependency. Check an untrusted request before opening anything that comes from a pool.
- **Sign-in, Nov 23, 2026:** the SQL for Postgres was compiled in tests but never run on Postgres. The plan's only run on Postgres needed the person who owns the Supabase account, and the build went on without it. A plan step that only a person can do leaves that code untested until they do it.
- **Sign-in, Nov 23, 2026:** the "Can't reach Accountable" banner followed whichever request answered last, so an older request's answer could hide it. `1-start.spec.ts` caught it. State that several requests share mustn't depend on the order their answers arrive.
