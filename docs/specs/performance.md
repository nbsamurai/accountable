# Performance

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 7. Performance

Every screen opens in under a second with about 1,000 organizations, 5,000 contacts, 2,000 deals and 20,000 activities.

- **Tables** search, sort and page on the server, 50 rows at a time. Each table has indexes on its links and the columns it sorts by.
- **The dashboard** works out its figures in SQL and sends them in one response.
- **The board** loads the cards and totals in one request. It renders up to 50 cards per column initially, as described in section 4.7.
- **Timelines** load 50 entries at a time.
- **Pickers** ask for 20 matches at a time.
- **SQLite** runs in WAL mode, with foreign keys on.

**How it's measured:** the performance test loads the large data set into its own database. For each screen (the dashboard, the three tables, a record's page of each kind, and the pipeline), it times from the start of navigation to the screen's main content showing, in Chrome, after one warm-up load. Every screen must be under 1,000 ms on a developer's computer. On GitHub's runners, which load the dev server's modules more slowly, the limit is 4,000 ms, and the test gets three times its usual time.
