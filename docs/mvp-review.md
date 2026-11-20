# Review: `mvp` branch against `main`

- **Date:** Nov 19, 2026
- **Policy:** `docs/REVIEW.md`, with its three passes: bugs, security, and a match with `docs/spec.md` and the [MVP plan](changes/mvp/plan.md)
- **Scope:** all 189 changed files, about 16,000 lines. Style nits are left out.
- **Tests:** all 196 pass. That's 99 backend (pytest), 45 frontend (Vitest, with a clean type check) and 52 end-to-end tests in Chrome. The AGENTS.md rule that `npm test` passes is met.

## Verdict

There's one Important finding: a security gap in the backend, which must be fixed before merge. The other findings don't block the merge.

## Important

### 1. The backend answers requests that carry any Host name

**Where:** `backend/app/main.py:39` (`create_app`)

Both servers listen on 127.0.0.1 only, so other computers can't reach them. But the FastAPI app on port 8000 never checks the `Host` header, which leaves it open to DNS rebinding:

1. The user visits a malicious page.
2. The page switches its own domain to point at 127.0.0.1.
3. It calls `/api/*` as if it were the same site. It can read every contact's name, email and phone, and change records.

**Evidence:** on a scratch copy of the database, a request with `Host: attacker.example` got back contact emails with status 200.

**Context:**

- The Vite server on port 5173 already rejects unknown hosts. Port 8000 doesn't.
- Chrome now asks the user before a public site reaches localhost. Firefox and Safari weren't checked, and the intent requires both.

**Why it's Important:** REVIEW.md treats a data leak as Important.

**Suggested fix:** add Starlette's `TrustedHostMiddleware`, allowing `127.0.0.1` and `localhost`. Also allow `testserver`, which the pytest client uses.

## Bugs (non-blocking)

### 2. `npm run dev` will probably run `npm install` on every start

**Where:** `scripts/dev.mjs:56`

The script decides whether to install by comparing the `node_modules` folder's modified time with `package-lock.json`'s. A folder's time only changes when an entry inside it is added or removed. npm saves `package-lock.json` and `node_modules/.package-lock.json` in place, so a no-op install leaves the folder's time as it was.

**Evidence:** `package-lock.json` is now about 1h50m newer than `node_modules`, so the next start reinstalls. Because a no-op install doesn't change the folder's time, every later start reinstalls too.

**Impact:** startup gets slower. Whether this breaks starting with no internet connection wasn't tested.

**Suggested fix:** compare against `node_modules/.package-lock.json` instead of the folder.

### 3. Deleting the last row on the last page leaves an empty page

**Where:** `frontend/src/components/DataTable.tsx:86`

Nothing moves the page back when it's past the end. On page 2 of 51 rows, deleting the one row on page 2 shows an empty table with "51–50 of 50". Only Previous recovers. The same happens with a stale `?page=` in the address.

## Matches spec.md and plan.md

### 4. A deal created straight into Won leaves its main contact as a lead

**Where:** `backend/app/deals/service.py:242` (`create`)

On create, the server applies part of spec 3.2: it sets the close date to today for Won or Lost. It doesn't make the main contact a customer.

**Evidence:** on a scratch copy of the database, a deal created at Won with a lead as its main contact left that contact a lead.

Spec 3.2 says that creating a deal at a stage isn't a change of stage, so this may be what the spec intends. But the "+" button on the Won column can now produce a Won deal whose contact isn't a customer. Spec 8 treats "every Won deal's main contact is a customer" as a rule for the sample data.

**Needs a decision:** whether creating a deal at Won makes its contact a customer. This may be a spec change rather than a code change.

### 5. The funnel's summary has no figures

**Where:** `frontend/src/dashboard/Funnel.tsx:10`

The summary always says "Value of the deals that reached each stage, Won included." Spec 4.2 and plan test 6 expect every chart's summary to state its figures and match its table. The revenue and deals-won charts do this; the funnel doesn't.

### 6. Two deliberate departures aren't in the spec or plan

Both are recorded in `docs/STATUS.md`, but the documents they depart from weren't updated:

- **`npm test` runs every suite, even after one fails, and adds a type check.** Plan §1 says the suites are joined with `&&`, so the first failure stops the run. AGENTS.md was updated to match the code; the MVP plan wasn't.
- **The add button is only in the page header.** Spec 4.3 also puts it in the table toolbar. STATUS.md gives the reason: two identical buttons would be read out twice.

**Suggested fix:** update the MVP plan and `docs/spec.md` to match.

## Still open

Intent criterion 10, the hands-on check in Chrome from spec 10.4, hasn't been done yet. `docs/STATUS.md` lists it as next. So by the spec's own definition, the MVP isn't done.
