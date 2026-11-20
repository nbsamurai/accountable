# Quality checks

Add one command that verifies frontend and backend formatting, linting, complexity, types, secrets and tests. Require at least 80% unit coverage for each part of the app. Provide a faster command for running without Chrome and a command to apply formatting.

Format staged files and run lint, type and secret checks before commits. Have Codex and Claude Code run the quick check at the end of each turn, give them one follow-up attempt on failure, and protect `.env` from agent edits.

Run the full check on GitHub Actions for every push, failing first on any leaked secret.
