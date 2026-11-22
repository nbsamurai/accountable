# Deals

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 2. Records

### Deal

| Field | Type | Notes |
|---|---|---|
| name | text, required | Up to 200 characters |
| organization | link to an organization | Optional |
| main contact | link to a contact | Optional. Must work at the deal's organization (section 3.4) |
| stage | `new`, `qualified`, `proposal`, `negotiation`, `won` or `lost` | New when not given |
| value | whole US dollars, 0 or more | Optional. An empty value counts as $0 in every total |
| probability | whole percent, 0 to 100 | The stage's usual probability when not given |
| close_date | date | The expected close date while open, the actual one once Won or Lost |
| board_position | number | The card's place in its pipeline column. Lower comes first |

## 3. Rules

### 3.1 Stages and probability

The stages, in pipeline order, with their usual probability of close:

| Stage | Probability | Open or closed |
|---|---|---|
| New | 10% | Open |
| Qualified | 25% | Open |
| Proposal | 50% | Open |
| Negotiation | 75% | Open |
| Won | 100% | Closed |
| Lost | 0% | Closed |

A probability set by hand is kept until the stage changes.

### 3.2 Changing a deal's stage

All stage changes go through one function on the server, whichever screen they come from. When a deal's stage changes:

1. Its probability defaults to the new stage's usual probability.
2. If the new stage is Won or Lost, its close date defaults to today.
3. If the new stage is Won and the deal has a main contact, the contact's status becomes customer.
4. A `stage_change` activity is written on the deal, such as "Moved from Proposal to Negotiation", dated now.
5. Board moves place the card according to the drop or menu action. Changes made from the deal form or stage path put the card at the top of its new column.

When a Won or Lost deal moves back to an open stage, steps 1, 4 and 5 still apply. Its close date and its contact's status stay as they are. If the close date has passed, the deal shows as late until someone sets a new one.

Moving a card within its own column changes only its place. The app logs an activity automatically only when an existing deal changes stage.

New deals go to the top of their stage's column. A new deal in Won or Lost defaults to today's close date. When a deal is created directly in Won, its main contact becomes a customer if one is set. If that changes the contact's status, the app names the contact in the confirmation message.

The board and stage path use the server defaults. When the stage changes in the deal form, the form fills in the new probability and, for Won or Lost, today's date. The salesperson can change either field before saving. The API uses explicitly supplied values in place of the defaults.

### 3.3 Late deals

A deal is late when it's open (New to Negotiation) and its close date is before today. A deal with no close date is never late.

### 3.4 A deal's organization and main contact

A deal's main contact works at the deal's organization:

- With an organization chosen, the main contact picker lists only that organization's people.
- With no organization chosen, it lists everyone, with each person's organization. Picking someone who has an organization fills it in.
- Changing the organization clears the main contact if they don't work at the new one.
- When a request sends a deal's organization or main contact, the server refuses it if the main contact's organization isn't the deal's.
- A contact with no organization can be the main contact of a deal with no organization.

If a contact later moves to another organization, their deals keep them as main contact. The deal form then shows the mismatch, with "Jane Doe now works at Brightlane", and asks for a new main contact before it can be saved.

## 4. Screens

### 4.6 Deals

- **Table columns:** Name, Organization, Main contact, Stage, Value, Probability, Expected revenue and Close date. A late deal has a "Late" badge next to its close date.
- **Search** covers name, organization name and main contact name. Sorting by Stage follows pipeline order.
- **A deal's page:**
  - **Header:** name, stage pill, late badge, and Edit and Delete buttons.
  - **Facts:** value, probability, expected revenue, close date, organization (a link) and main contact (a link).
  - **Stage path:** the six stages as a row of buttons, New to Negotiation joined left to right, then Won and Lost. The current stage is filled in its color, with a check icon. Choosing another stage with a click, Space or Enter changes it at once, following section 3.2, and a message says what changed. The arrow keys only move focus along the row, so passing a stage, such as Won on the way to Lost, never changes the deal.
  - **Below:** the log-activity form, then the timeline.
