# Accessibility

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 6. Accessibility

The accessibility standard is WCAG 2.2 AA across all screens. Section 10 describes how keyboard access, reflow and axe checks are verified.

- **Structure:**
  - Landmarks: header, nav, search (around the top bar's search box) and main. The sign-in screen has a main landmark only.
  - One `h1` per screen, with headings in order. The sign-in screen counts as a screen.
  - `lang="en"` on the page.
  - Real `table` elements for tables.
  - When a new screen opens, focus moves to its `h1` and the page title updates. That includes the sign-in screen, and the screen that opens after signing in. Searching, sorting and paging don't move focus.
- **Keyboard:**
  - Everything works without a mouse, in a sensible tab order.
  - Dialogs keep focus inside them, close on Escape, and return focus to what opened them.
  - Menus, pickers and radio groups use the arrow keys. The user menu is a menu, and its theme group is a single choice with `aria-checked` on the chosen item.
  - The search box is a combobox: the arrow keys move through the matches, Enter opens one, and Escape closes the list, then clears the box (section 4.12).
  - On a narrow screen, focus a control in the pipeline board or a linked table and use Left and Right to scroll the panel.
- **The board with a keyboard:**
  - Tab to a card's grip handle, and press Space or Enter to pick the card up.
  - Up and Down move it within its column, and Left and Right move it to the next column.
  - Space or Enter drops it. Escape or Tab cancels the move.
  - A live region says each step: "Picked up Website redesign, in Proposal, position 2 of 5", "Over Negotiation, position 1 of 3", "Dropped in Negotiation, position 1 of 3".
  - The "More" menu does the same moves without dragging.
- **Dragging (2.5.7):** every move a drag can make, the "More" menu can make too.
- **Focus (2.4.7 and 2.4.11):** the focus ring always shows, and the top bar never covers focused content: `scroll-padding-top` matches its height.
- **Contrast:** text is at least 4.5:1, and large text, controls and chart shapes at least 3:1, through the tokens in section 5.2. This holds in light mode and in dark mode, whichever one System picks.
- **Color:** stages, statuses, late and overdue always have text as well.
- **Reflow, zoom and spacing:** the layout works at 320 px wide and at 200% text size, and with the text spacing WCAG 1.4.12 describes. Tables and the board may scroll sideways, which WCAG allows.
- **Forms:** visible labels, errors linked to their fields, and required fields marked in text.
- **Charts:** a summary in text and a table of the same figures, as section 4.2 describes.
- **Messages:** search counts, in the tables and in the top bar, saves and moves are read out through live regions. So are sign-in errors and "Your session has ended. Sign in again."
- **Motion:** respects the system's reduced-motion setting.

React Aria Components provides the dialogs, menus, pickers, selects, radio groups, checkboxes and date pickers, so their keyboard and screen-reader behavior comes from the library.
