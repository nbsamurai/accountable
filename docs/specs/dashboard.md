# Dashboard

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 3. Rules

### 3.8 Figures

- **Expected revenue** of a deal is its value multiplied by its probability as a fraction (50% is 0.5). Totals add up the exact amounts and round to the dollar once.
- **Open pipeline:** the total value of open deals.
- **Won this month:** the total value and the number of Won deals with a close date in the current month.
- **Win rate:** of the deals closed in the last 12 months, the share that were Won, by count. With no closed deals it shows "–".
- **Last 12 months:** the current month and the 11 before it, by close date. Months with nothing show $0 and 0.
- **Revenue won by month** and **deals won by month:** Won deals, grouped by the month of their close date.
- **Funnel:** for each of New, Qualified, Proposal, Negotiation and Won, the total value and number of deals now at that stage or a later one. Won counts at every stage, and Lost isn't counted. Each stage also shows its value as a share of New's.
- **Board totals** include the value and expected revenue of every open deal. Each column shows the count, value and expected revenue of all eligible deals in its stage, including cards behind “Show more.” For Won and Lost, eligibility depends on the close date window in section 4.7.
- **Today** is the date in the server's time zone. That's the computer's own time zone when Accountable runs on a developer's computer, and the team's time zone on Render, set as `TZ` in `render.yaml`, because Render's clock runs on UTC.

## 4. Screens

### 4.2 Dashboard

The landing page shows how sales are going at a glance, with the day's work first. A left column, a third of the width, holds the follow-ups and recent activity. A right column, two thirds of the width, holds the figures and charts. The gaps are 24 px. Below 1,100 px wide, the columns stack, follow-ups first.

- **Header:** "Dashboard", with the tagline "Here's how sales are going." beside it in Instrument Serif, and today's date on the right.
- **Left column:**
  - **Follow-ups,** set out like a diary, with a summary such as "4 overdue and 5 due in the next 7 days." Each group has its name on the left and its follow-ups on the right:
    - **Overdue,** in Raspberry ink, with "4 to do" under it, oldest first. Each one says how late it is, after its record: "Lab results integration, 6 days overdue".
    - **One group for each day** in the next 7 days that has follow-ups due: "Today", "Tomorrow", then "Mon, Nov 23" and so on.
    - Each follow-up has a "Done" checkbox, its description, and a link to its contact or deal.
    - Overdue and the next 7 days each show up to 5 follow-ups. A "Show all 12" button opens the rest in place.
    - With none due: "Nothing overdue or due in the next 7 days."
  - **Recent activity,** under the follow-ups, as a timeline: the 10 newest activities with `occurred_at` up to now, stage changes included, joined by a grey line. Each has its type's icon in a circle (Sea Green for stage changes), its description, and then its record and when it happened: "Payments gateway, Today, 10:42 AM".
- **Right column:**
  - **The scoreboard,** one panel with the four figures side by side, each in JetBrains Mono:
    - **Open pipeline:** the total, and "16 open deals".
    - **Expected revenue:** the total, and "Value × probability of close".
    - **Won this month:** the total, and "1 deal".
    - **Win rate:** the percent, and "10 won of 14 closed in 12 months".
    - Under the figures, **Open pipeline by stage** (section 5.6), with "$612,000 in 16 deals" on the right of its heading.
  - **Revenue won by month,** a line chart across the column: 12 months, with a Sea Green line and a light Sea Green fill under it. The tooltip shows the month, the revenue and the number of deals.
  - **Sales funnel** and **Deals won by month,** side by side:
    - **Sales funnel:** one bar per stage from New to Won, centered, in its stage's color, and as wide as its share of New's value. The stage and its number of deals are on the left. Its value, in the short form, and its share are on the right.
    - **Deals won by month:** 12 Cerulean bars, with each month's count above its bar.

Every chart panel has a title, a text summary that states its key figures, and a "Show as table" button that swaps the chart for a table of the same figures. The funnel summary gives each stage's deal count, value and share.

The dashboard loads its figures in one request, and loads them again whenever it opens, so a deal just marked Won or a follow-up just added shows straight away.
