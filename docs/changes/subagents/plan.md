# Subagents implementation

1. Add `.claude/hooks/reviewer-read-only.mjs`, a PreToolUse hook that denies any Bash command that isn't on its read-only list. Claude Code can't limit a subagent's Bash to some commands through its tool list. The hook still allows searches: `grep`, `rg`, `git grep` and `git show`.
2. Add `.claude/agents/reviewer.md`: Sonnet, the Read, Glob, Grep and Bash tools, and the hook on Bash. It follows `docs/REVIEW.md` and reports Important findings, other findings and at most five nits.
3. Add `.claude/agents/ui-check.md`: Sonnet, the Read, Glob and Grep tools and the Playwright tools that look and click, with the brand skill preloaded. It has no Bash, Edit or Write, and no Playwright tool that types or uploads. It checks every page in light and dark mode at 1440 × 1000 and saves its screenshots as `.playwright-mcp/ui-check-<page>-<mode>.png`.
4. Test the hook against commands it must allow and deny, and check that both agent files parse.
5. Restart Claude Code, then try ui-check on the dashboard and the pipeline, and the reviewer on the commit "Deploy: harness improved".
6. In `.github/workflows/ci.yml`, run `npm run check:quick` and take out the Playwright report upload, which only the end-to-end tests need. `check:quick` still runs the frontend type check, through the frontend's `test` script. Update the CI description in `docs/STATUS.md`, `docs/TECH_STACK.md`, `AGENTS.md` and the comment in `e2e/playwright.config.ts`.
