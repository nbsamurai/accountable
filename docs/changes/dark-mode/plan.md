# Plan: dark mode

This is the build plan for the [dark mode intent](intent.md). It covers the files, the order of work, the risks and the tests. References such as "spec 5.2" point to sections of the [product spec](../../spec.md).

The change is frontend only. The backend and its API don't change.

## 1. Files that change

### Why the tokens change first

Every color is already a token in `styles/tokens.css`, and the charts use those tokens too. But some tokens do two jobs:

- `--ink` (Midnight) is the text color. It is also the fill behind white text on the current section, the chosen status filter, Won, the chosen date, checked boxes, the chosen activity type, tooltips and the skip link.
- `--alert-ink` and `--info-ink` are text colors. They are also the fills behind white text on the Late badge, the delete button, Negotiation and the chosen day in the date picker.
- Stage and status pills, the primary button and the wordmark use `--ink` for Midnight text on Sea Green, Marigold and Coral. Those fills stay bright in dark mode, so their text must stay Midnight.

Dark mode makes text light. If these tokens just changed value, white text would sit on light fills. So each job gets its own token first, with today's light values. Then the dark values can change one job without breaking another.

Two colors are also written outside the tokens: the delete button's hover (`#b81e4a`) and the pill count's background (`rgb(255 255 255 / 55%)`).

### New tokens

They all take today's light value, so light mode doesn't change.

| Token | Light value | Replaces | Used for |
|---|---|---|---|
| `--fill-strong` | `#073B4C` Midnight | `--ink` as a fill | The current section, the chosen status filter, Won, the chosen date, checked boxes, the chosen activity type, tooltips, the skip link |
| `--on-fill-strong` | `#FFFFFF` | `--on-dark` on those fills | Text and icons on `--fill-strong` |
| `--on-bright` | `#073B4C` Midnight | `--ink` on bright fills | Text on Sea Green, Marigold and Coral: stage and status pills, the primary button, pill counts, the wordmark's check |
| `--alert-fill` | `#D22758` | `--alert-ink` as a fill | The Late badge, the delete button |
| `--alert-fill-hover` | `#B81E4A` | The literal in `Button.module.css` | The delete button's hover |
| `--info-fill` | `#00789F` | `--info-ink` as a fill | Negotiation, the chosen day in the date picker |
| `--count-bg` | `rgb(255 255 255 / 55%)` | The literal in `Pill.module.css` | The count badge on stage pills |

A fill with no text on it, such as the probability meter, keeps `--ink`, because it should follow the text color.

### Frontend: `frontend/src/`

| File | What changes |
|---|---|
| `styles/tokens.css` (edit) | The new tokens. `color-scheme: light` on `:root`. One `:root[data-theme="dark"]` block that redefines every color token, the shadows and the backdrop, with `color-scheme: dark`. Won uses `--fill-strong`, Negotiation uses `--info-fill`, and the bright stages and statuses use `--on-bright` |
| `styles/tokens.test.ts` (new) | Contrast in both modes, every color token defined in both modes, and no colors outside `tokens.css` (section 4.1) |
| `lib/theme.ts` (new) | `Theme` (`"light"` or `"dark"`). Reads and saves the choice in `localStorage` under `accountable-theme`. Sets or removes `data-theme="dark"` on `<html>`. A `useTheme()` hook. Light when nothing is stored, when the value is unknown, or when storage is blocked |
| `lib/theme.test.ts` (new) | Section 4.1 |
| `components/ThemeToggle.tsx` and `.module.css` (new) | React Aria `ToggleButton` with a Lucide `Moon` icon. Accessible name "Dark mode", state in `aria-pressed`, and the name in a tooltip, like the other icon buttons (spec 5.6) |
| `components/ThemeToggle.test.tsx` (new) | Section 4.1 |
| `components/AppShell.tsx` (edit) | The toggle at the right end of the top bar, outside the narrow "Menu", so it shows on every page at every width. Passes the theme to Sonner's `Toaster`. The wordmark's check uses `--on-bright` |
| `components/AppShell.module.css` (edit) | Places the toggle. The current section and the skip link use `--fill-strong` |
| `main.tsx` (edit) | Applies the stored choice before the first render |
| `components/Button.module.css` (edit) | Primary text uses `--on-bright`. Delete uses `--alert-fill` and `--alert-fill-hover` |
| `components/Pill.module.css` (edit) | The count uses `--count-bg` and `--on-bright` |
| `components/LateBadge.module.css` (edit) | `--alert-fill` |
| `components/IconButton.module.css` (edit) | The tooltip uses `--fill-strong` |
| `components/DateField.module.css` (edit) | The chosen day uses `--info-fill`. The chosen date uses `--fill-strong` |
| `contacts/StatusFilter.module.css` (edit) | The chosen filter uses `--fill-strong` |
| `activities/Timeline.module.css` (edit) | Checked boxes use `--fill-strong` |
| `activities/ActivityForm.module.css` (edit) | The chosen type uses `--fill-strong` |
| `lib/stages.ts` and `lib/stages.test.ts` (edit) | Remove `STAGE_COLORS`. Only its test uses it, and it's a second copy of the stage colors that would go out of date |

**Checked, with no change expected:** `RevenueChart.tsx`, `DealsWonChart.tsx`, `Funnel.tsx` and `global.css` already use tokens, so they follow the mode. Phase 3 confirms this on screen.

### End-to-end tests: `e2e/`

| File | What changes |
|---|---|
| `fixtures.ts` (edit) | A `theme` option, light by default. When it's dark, the choice is stored before each page loads |
| `7-dark-mode.spec.ts` (new) | The toggle, the remembered choice, and charts, dialogs and messages following the mode (section 4.2) |
| `accessibility.spec.ts` (edit) | Every test runs in light and in dark mode |
| `keyboard.spec.ts` (edit) | Switch the mode with the keyboard |

### Docs

| File | What changes |
|---|---|
| `docs/spec.md` (edit) | Section 1: light and dark modes. 4.1: the toggle in the top bar, light by default, remembered per browser profile. 5.2: the new tokens, and a dark value and contrast for every token. 5.3: the dark stage and status fills. 5.5: the dark shadows and backdrop. 10.2 and 10.3: the new tests |
| `.claude/skills/brand/SKILL.md` (edit) | The dark ink shades. Spec 5.2 says the brand skill lists the same shades as the spec |
| `docs/STATUS.md` (edit) | Dark mode done |
| `docs/changes/dark-mode/*.png` (new) | `dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png` and `pipeline-dark.png` |

**No new dependencies.** React Aria's `ToggleButton`, Lucide's `Moon` and Sonner's `theme` prop are already installed. The contrast check is the WCAG formula, about 15 lines in the test.

## 2. Order of work

Four phases. The token split comes first, because it's the riskiest part for light mode and everything else builds on it. The toggle comes before the full palette, so the switch can be tested end to end with only a few dark values.

**In every phase:**

- Work in small steps, and check each one before the next.
- Before using a library API, read its current docs with Context7: React Aria `ToggleButton`, Sonner's `theme` prop and Playwright's `storageState`.
- Keep every dark color in the one `:root[data-theme="dark"]` block. No component gets its own dark-mode rule.
- End with `npm run check:quick` passing. The end of each phase is a good place to commit.

### Phase 1: Tokens by role, with light mode unchanged

**Goal:** every color comes from a token named for its job, and light mode is the same, pixel for pixel.

1. Before changing anything, take baseline screenshots of light mode with a temporary Playwright test that uses `toHaveScreenshot`. Cover every screen, a record page of each kind, an add dialog with errors, a delete dialog, the More menu, the date picker, a tooltip and a message. This test isn't committed.
2. Write `styles/tokens.test.ts` with the light contrast pairs from spec 5.2 and the check for colors outside `tokens.css`. It fails on the two literals.
3. Add the new tokens with today's values, and move each use in the table in section 1. Remove `STAGE_COLORS`.
4. Run the baseline test again.

**Done when:** the baseline shows no difference, `tokens.test.ts` passes and `npm run check:quick` passes.

### Phase 2: The toggle and the remembered choice

**Goal:** a toggle on every page switches to a first dark surface, and the choice survives a reload and a browser restart.

1. `lib/theme.ts`, test first.
2. `main.tsx` applies the stored choice before `createRoot`.
3. In `tokens.css`, add `color-scheme` and a dark block with only the brand's surfaces: page `#04232E`, black panels and Sea Mist `#CDD8DB` ink. That's enough to see and test the switch.
4. `ThemeToggle`, test first. Add it to the top bar, and pass the theme to `Toaster`.
5. `e2e/7-dark-mode.spec.ts`.
6. Run the baseline test with the toggle masked. Only the toggle is new in light mode.
7. Reload in dark mode with the network slowed down in Chrome, and look for a flash of light mode.

**Done when:** the new unit and end-to-end tests pass and light mode matches the baseline apart from the toggle.

### Phase 3: The full dark palette

**Goal:** every screen, chart, dialog, menu, tooltip and message is readable and on-brand in dark mode, and axe passes in both modes.

1. Add the `theme` option to `fixtures.ts`, and run every test in `accessibility.spec.ts` in both modes. Expect dark-mode failures at first.
2. Add the dark pairs to `tokens.test.ts`. Expect failures at first.
3. Fill in the dark block, a group at a time, until both tests pass:
   - `--ink-muted`, `--line`, `--control` and `--subtle`.
   - The ink shades, lighter to reach 4.5:1 on the dark page and black panels, as the brand skill asks. `--info-ink` is also the focus ring and the links.
   - `--fill-strong` becomes Sea Mist, with Midnight `--on-fill-strong`. Won keeps the Midnight hue in a lighter shade.
   - `--alert-fill` and `--info-fill` keep their shades if white text still reaches 4.5:1. Sea Green, Marigold and Coral stay as they are, with Midnight text.
   - The shadows and the backdrop, in black, strong enough to lift dialogs and menus off the page.
4. Look at each screen in dark mode in a Playwright screenshot:
   - The dashboard: the axes, grid, line and its fill, the bars, the funnel, the chart tooltip and the table views.
   - The pipeline: the cards, the drag shadow, the drop line, the More menu and the meter.
   - The tables: row hover and sort arrows.
   - The forms: inputs, errors, pickers and the date picker.
   - The delete dialog, the messages, the server banner, the skip link and the focus ring.
5. Add the keyboard test to `keyboard.spec.ts`.

**Done when:** axe passes in both modes, `tokens.test.ts` passes in both modes and `npm test` passes.

### Phase 4: The docs, the screenshots and the full check

1. Update `docs/spec.md` with the final values, and the brand skill with the dark ink shades.
2. Save the four screenshots, at 1,440 × 1,000 px with the sample data, to `docs/changes/dark-mode/`. Take them once with Playwright. They aren't part of the test suite, so the suite never writes into `docs/`.
3. Delete the temporary baseline test.
4. Do the hands-on check in spec 10.4 in dark mode.
5. Update `docs/STATUS.md`.
6. Run `npm run check`.

Then Deploy: the review against `docs/REVIEW.md`, the fixes, `docs/IMPROVE.md`, and the merge.

## 3. Risks

1. **Light mode drifts while the tokens split.** A missed use changes a color. *Mitigation:* the pixel baseline in phase 1, and the light contrast pairs in `tokens.test.ts` pin the spec 5.2 values.
2. **A token with two jobs breaks in dark mode.** For example, white text ends up on a light fill. *Mitigation:* phase 1 splits every job before any dark value exists, and the dark contrast pairs cover each fill with its text.
3. **A flash of light mode on reload.** *Mitigation:* `main.tsx` applies the choice before the first render. In development, Vite loads the CSS with the scripts, so nothing paints before that. Phase 2 checks this with a slow network. If a flash shows, a one-line script in `index.html` sets the attribute before the scripts load.
4. **Blocked storage.** `localStorage` can throw when site data is blocked. *Mitigation:* `theme.ts` catches it and uses light. The toggle still works until the page reloads. A unit test covers this.
5. **axe doesn't see everything.** It doesn't check hover, focus rings, drag shadows, tooltips that aren't open, or 3:1 for chart shapes, and it skips some text on overlapping layers. *Mitigation:* `tokens.test.ts` checks every token pair in both modes, and phases 3 and 4 include a look at each state.
6. **Libraries with their own colors.** Sonner's close button and icons, and the native scrollbars, have their own colors. *Mitigation:* pass the theme to `Toaster` and set `color-scheme`. Check both in phase 3.
7. **Dark shades that pass but look off-brand.** Midnight Won on a near-Midnight page, or black dialogs on a dark page, can pass the checks and still look wrong. *Mitigation:* the brand skill's surfaces and its "lighten them on dark ones" rule, and the screenshots in phase 3.
8. **False alarms in the color check.** A pattern like `#add` in a link could look like a color. *Mitigation:* the check only matches hex in color positions, `rgb(` and `hsl(`, and skips test files.
9. **A slower end-to-end suite.** The accessibility file runs twice. *Mitigation:* it's a small part of the suite, and `globalTimeout` is 15 minutes. Compare the run time before and after phase 3.
10. **Thin frontend coverage.** Lines are at 82.24%, close to the 80% limit. *Mitigation:* the new files are small and fully unit tested.

## 4. Proof

### 4.1 Frontend unit tests (Vitest)

**`lib/theme.test.ts`**

- Light when nothing is stored.
- Dark when `dark` is stored.
- Light when the stored value is unknown.
- Saving stores the choice and sets `data-theme="dark"` on `<html>`. Saving light removes it.
- Light, with no error, when reading or writing `localStorage` throws.

**`components/ThemeToggle.test.tsx`**

- A button named "Dark mode" with `aria-pressed="false"` in light mode.
- A click switches to dark: `aria-pressed="true"`, the attribute is set and the choice is stored.
- A second click switches back to light.
- Space and Enter switch it too.

**`styles/tokens.test.ts`**, for light and for dark:

- Text reaches 4.5:1. That's `--ink`, `--ink-muted` and each ink shade, on `--panel` and `--page`, and `--ink` on `--subtle` for Lost and the secondary button.
- Text on fills reaches 4.5:1:
  - `--on-bright` on `--primary`, `--primary-hover`, `--secondary` and `--tertiary`
  - `--on-dark` on `--info-fill`, `--alert-fill` and `--alert-fill-hover`
  - `--on-fill-strong` on `--fill-strong`
- Controls, the focus ring and chart shapes reach 3:1. That's `--control` on `--panel`, `--info-ink` on `--panel` and `--page`, and `--info` on `--panel`.
- The dark block defines every color token that `:root` does, so nothing falls back to a light value.
- No `.css` or `.tsx` file outside `tokens.css` has a hex, `rgb(` or `hsl(` color, or a `data-theme` selector.

**`lib/stages.test.ts`:** the `STAGE_COLORS` checks are removed, and the rest is unchanged.

### 4.2 End-to-end tests (Playwright Test, installed Chrome)

**`7-dark-mode.spec.ts`**

1. **Light by default:** in a new browser context, "Dark mode" isn't pressed, `<html>` has no `data-theme`, and the page background is `#F0F4F5`.
2. **The toggle works and is remembered after a reload:**
   - Switch to dark on the dashboard. The page background is `#04232E`.
   - Reload. It's still dark, and the toggle is still pressed.
   - Visit each of the five sections from the top bar, a record page and "Page not found". The toggle is on each one, and each stays dark.
3. **The choice survives a browser restart:** switch to dark, save the context's storage state, close the context and open a new one from that state. It opens in dark. Switch back to light and reload. It stays light.
4. **The toggle at 320 px:** it shows in the top bar, outside the "Menu".
5. **Charts, dialogs and messages follow the mode:** in dark mode, compare these with the dark token values:
   - a chart axis label's fill, against `--ink-muted`
   - the Add contact dialog's background, against `--panel`
   - the "Contact added" message's background, against `--panel`

**`accessibility.spec.ts`:** every existing test runs in light and in dark mode. That covers every screen, the charts and their tables, the board with the More menu open, and each table's form dialogs, with and without errors, and delete dialogs. axe must find no violations in either mode.

**`keyboard.spec.ts`:** Tab to "Dark mode", press Space to switch to dark, and press Space again to switch back.

The other end-to-end tests are unchanged and still pass in light mode, the default.

### 4.3 Backend unit tests (pytest)

There's no backend change. The suite runs unchanged.

### 4.4 Other proof

- **Light mode unchanged:** the temporary pixel baseline shows no difference after phase 1. After phase 2, the only difference is the toggle.
- **Screenshots:** the four PNGs in `docs/changes/dark-mode/`.
- **Hands-on check:** spec 10.4 in dark mode, with the results in `docs/STATUS.md`.

### 4.5 The success criteria

| Criterion | Proof |
|---|---|
| 1. `npm run check` passes | Phase 4, step 6 |
| 2. An end-to-end test proves the toggle works and is remembered after a reload | `7-dark-mode.spec.ts`, tests 2 and 3 |
| 3. Screenshots of the dashboard and the pipeline in both modes | The four PNGs in `docs/changes/dark-mode/` |
| 4. The full axe suite in spec 10.3 passes in both modes | `accessibility.spec.ts` in light and dark |
