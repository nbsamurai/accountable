# Pipeline

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 4. Screens

### 4.7 Pipeline

- **Header:** "Pipeline", with "Add deal" on the right.
- **Summary panel:** open pipeline, expected revenue and open deals, in JetBrains Mono. Beside them is the same open-pipeline-by-stage bar as the dashboard's, headed "By stage".
- **Board:** six columns side by side, in stage order. Each is at least 200 px wide and they share the width equally. If the window is too narrow, the board scrolls sideways inside its area.
- **Columns** sit on the page background with no panel. Each column header has:
  - a stage pill (section 5.6) with the stage's name and its card count
  - a "+" button labelled "Add deal to Proposal"
  - under them, the column's value, and "Expected" with its expected revenue
  - for Won and Lost, "Closed in the last 30 days". These two columns show only deals with a close date from 30 days ago to today.
- **Card visibility.** Each column initially displays up to 50 cards. “Show N more” reveals the remaining cards in that column. Dropping below the last visible card inserts the moved card before any hidden cards.
- **Cards** are white. From top to bottom, each one has:
  - a grip handle button ("Move Website redesign"), the deal name, which links to the deal, and a "More" menu button
  - the organization
  - the value in JetBrains Mono, with the main contact's initials in a circle on the right. The contact's full name is the circle's tooltip and accessible name. A deal with no main contact has no circle.
  - a probability meter (section 5.6), with the percent beside it
  - the close date with a calendar icon, or the late badge and the date
- **Dragging:** a card can be dragged by the card or its handle to any column, and to any place in a column. A drop line shows where it will land. When it's dropped:
  - the card stays where it was dropped
  - the totals change straight away
  - the server saves the move
  - if the save fails, the card goes back and a message says so
- **Moving to Won:** the message says "Website redesign moved to Won. Jane Doe is now a customer." when the contact's status changed.
- **The "More" menu** opens under its button. It has three groups:
  - "Move to", then each other stage, each with a small square in its color.
  - "Move up" and "Move down".
  - "Open" and "Edit".

  The menu gives a way to make every move without dragging, for keyboard users, screen-reader users and people who can't drag. A card moved to another stage from the menu goes to the top of that column. After a move, focus returns to the moved card's More button.
- **Keyboard dragging:** see section 6.
- **Adding:** a deal added from a column starts at that stage, at the top of the column. A deal added from the header starts at New.
