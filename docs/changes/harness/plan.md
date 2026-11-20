# Quality check implementation

1. Install and configure the frontend and backend tools with the requested lint presets and complexity limit.
2. Reuse the npm task runner to attempt every check and report failures. Scan Git history, the index and the working tree for secrets.
3. Resolve the findings and add unit tests for app behavior needed to meet the coverage threshold.
4. Document the commands and run the quick and full checks.
5. Configure Lefthook to format staged files before running lint, type and secret checks.
6. Configure and verify the Codex Stop and PreToolUse hooks and the read-only `.env` permission.
7. Configure and verify the same two hooks for Claude Code in `.claude/settings.json`.
8. Add a GitHub Actions workflow that scans for secrets, runs `npm run check` and uploads the Playwright report on failure.
9. Fix what the first CI run found: the missing `@types/node`, a search dropped by a quick sort, and the performance limit on GitHub's slower runners.
