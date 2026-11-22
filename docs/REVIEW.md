# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't.
- **Matches the spec and current change plan.** The spec is `docs/spec.md`, the summary and index, and the area files in `docs/specs/` that it lists. Check the change against `docs/spec.md`, every area file the change touches, and the current branch's `docs/changes/<branch name>/plan.md`.
  - Flag missing requirements and any code in the change that implements behavior the spec's area files don't describe.
  - Flag a change to product behavior that doesn't update every area file it affects in the same change.
  - Flag a summary or index in `docs/spec.md` that no longer matches the area files, such as a section the index doesn't list or lists in the wrong file.
- **Coding standards.** Check the change against [docs/STANDARDS.md](STANDARDS.md).

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.
