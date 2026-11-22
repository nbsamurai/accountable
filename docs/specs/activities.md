# Activities and follow-ups

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 2. Records

### Activity

| Field | Type | Notes |
|---|---|---|
| type | `note`, `call`, `email` or `stage_change` | People log the first three. The app writes `stage_change` |
| contact or deal | a link to exactly one of them | Set when the activity is logged, and can't be changed |
| description | text, required | |
| occurred_at | date and time | When it happened. Now when not given |
| follow_up_date | date | Optional |
| done | yes or no | No when not given. Used only when there's a follow-up date |

The activity form supplies the current time by default. The API also defaults to the current time when the request omits it.

The person who logged an activity is its `created_by` (section 3.11). For a stage change, that's the person who moved the deal.

## 3. Rules

### 3.5 Activities and follow-ups

- Notes, calls and emails are logged on a contact's or deal's page. They can be edited or deleted from any timeline that shows them.
- `stage_change` activities can't be edited or deleted. The server refuses with 409, and the screens show no edit or delete for them.
- A follow-up is an activity with a follow-up date that isn't done.
- **Overdue:** its follow-up date is before today.
- **Upcoming:** its follow-up date is today or one of the 6 days after it. That's 7 days, today included.
- Marking a follow-up done removes it from the dashboard. It stays in the timeline, shown as done, and can be marked not done again.

### 3.6 Timelines

- **A deal's timeline:** the deal's activities, stage changes included.
- **A contact's timeline:** the contact's activities, and every activity on deals where they're the main contact today, stage changes included. Each deal entry names its deal.
- An organization has no timeline.
- Newest first, by `occurred_at`, then by `created_at`.

## 4. Screens

### 4.9 Activities and timelines

- **The log-activity form** sits above the timeline on a contact's or deal's page:
  - **Type:** Note, Call or Email, a radio group with icons. Note is chosen.
  - **Description**
  - **When:** date and time, set to now.
  - **Follow-up date:** optional.
  - **“Log activity”** saves the entry in the timeline at its occurrence time and clears the form.
- **A timeline entry** shows:
  - its type's icon and name
  - its description
  - when it happened and who logged it: "Nov 19, 2026, 2:30 PM by Alex Rivera"
  - for a deal's entry on a contact's timeline, "on Website redesign" with a link
  - any follow-up, as "Follow up Nov 24" with a "Done" checkbox, and "Overdue" in Raspberry ink when it's overdue
  - Edit and Delete buttons on notes, calls and emails. Edit opens the same fields in a dialog.
- **Stage changes** show an arrow icon and "Moved from Proposal to Negotiation", when it happened and who moved the deal, with no edit or delete.
- A timeline shows its 50 newest entries, then a "Show older" button.
- With no entries: "Nothing logged yet."
