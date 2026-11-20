## Coding standards

- Follow the repository’s conventions. Keep changes focused and reuse existing components and utilities when they fit.
- Prefer clear names, simple control flow, and explicit types at public boundaries where supported.
- Preserve existing behavior and public contracts unless the task calls for a change. Update affected callers when a contract changes.
- Build accessible UIs with semantic elements, keyboard support, and clear loading, empty, and error states where applicable.
- Validate untrusted input and enforce permissions on the server. Keep secrets and sensitive data out of client code, logs, and error responses.
- Add or update tests for behavior changes and bug fixes. Run the relevant formatter, linter, type checker, and tests. Report any checks you couldn’t run.
