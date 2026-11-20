# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Look at what went wrong on this change: the review's findings, what the person corrected and what the checks caught. Compare the work with the change's `plan.md` for steps or tests that were skipped or done differently. If you didn't build the change, ask the person what they corrected.
2. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead. To find earlier times, read the watch list below, the earlier reviews in `docs/` and the review sections of `docs/STATUS.md`. Add a mistake seen for the first time to the watch list.
3. Remove anything out of date, the watch list included.
4. Improve this file, so that the next round makes a better change. Keep this as the last step.

## Watch list

Mistakes seen once. If one happens again, follow step 2 and take it off this list.

- **Dark mode, Nov 20, 2026:** a screenshot test showed the current time, so it failed when the minute changed. Fix the time with `page.clock.setFixedTime()` in screenshot tests.
