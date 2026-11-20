# Quality check implementation

1. Install and configure the frontend and backend tools with the requested lint presets and complexity limit.
2. Reuse the npm task runner to attempt every check and report failures. Scan Git history, the index and the working tree for secrets.
3. Resolve the findings and add unit tests for app behavior needed to meet the coverage threshold.
4. Document the commands and run the quick and full checks.
