# Visual design

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 5. Visual design

### 5.1 Approach

The interface follows the [Accountable brand guidelines](../../.claude/skills/brand/SKILL.md). White panels sit on a cool grey page with Midnight text. In dark mode, black panels sit on a deep Midnight page with Sea Mist text. Color identifies stages, statuses, alerts and the main action. Monospace figures line up, and the revenue line has a gradient fill.

### 5.2 Color tokens

The brand's colors are too light for small text on white, and two of its pairings are below WCAG AA for small text. White on Cerulean is 3.96:1, and white on Raspberry is 3.62:1, where AA needs 4.5:1. Each brand color therefore has an "ink" shade, a darker version of the same hue that reaches 4.5:1 on both white and the page background. The brand skill lists the same shades. The brand colors stay for fills with Midnight text, large shapes and chart areas. The ink shades are for text, lines, icons, and badges with white text.

All colors are CSS custom properties in `styles/tokens.css`, on `:root` for light mode. For dark mode, `:root[data-theme="dark"]` redefines every one of them, and `data-theme="dark"` on `<html>` turns it on. No other file sets a color, and a unit test checks this (section 10.2).

In dark mode the page is `#04232E` and panels are black, as the brand skill says. The ink shades are lighter there: each reaches 4.5:1 on the dark page and on black. The brand fills keep their colors in both modes.

Contrast is given on white and the light page, then on the dark page and black.

| Token | Light | Dark | Used for | Contrast (light; dark) |
|---|---|---|---|---|
| `--page` | `#F0F4F5` | `#04232E` | Page background | |
| `--panel` | `#FFFFFF` | `#000000` | Panels, cards, dialogs, menus, inputs, messages | |
| `--ink` | `#073B4C` Midnight | `#CDD8DB` Sea Mist | Text, icons, the probability meter | 12.1:1 on white, 10.9:1 on page; 11.2:1 on page, 14.4:1 on black |
| `--ink-muted` | `#456C79` | `#8AA3AB` | Secondary text, captions, axis labels | 5.7:1 on white, 5.2:1 on page; 6.2:1, 7.9:1 |
| `--line` | `#DAE2E4` | `#1E3E49` | Table dividers, chart grid lines | Decorative |
| `--control` | `#77939D` | `#5C7A84` | Input, checkbox and radio borders | 3.3:1 on white; 3.6:1 on page, 4.6:1 on black |
| `--subtle` | `#E6EBED` | `#153844` | Row hover, the Lost fill, column drop area, secondary buttons | `--ink` text 10.0:1; 8.6:1 |
| `--primary` | `#06D6A0` Sea Green | same | Primary buttons, New, Customer | Midnight text 6.4:1 |
| `--primary-hover` | `#05C291` | same | Primary button hover | Midnight text 5.2:1 |
| `--primary-ink` | `#008050` | `#06D6A0` | Sea Green text, the revenue line | 5.0:1 on white; 8.7:1 on page |
| `--secondary` | `#FFC145` Marigold | same | Qualified (stage and status) | Midnight text 7.5:1 |
| `--secondary-ink` | `#9B6200` | `#FFC145` | Marigold text | 5.1:1 on white; 10.1:1 on page |
| `--tertiary` | `#F78C6B` Coral | same | Proposal, Lead | Midnight text 5.1:1 |
| `--tertiary-ink` | `#B65132` | `#F78C6B` | Coral text | 5.0:1 on white; 6.9:1 on page |
| `--info` | `#118AB2` Cerulean | same | Chart bars, large shapes | 4.0:1 on white; 4.1:1 on page, 5.3:1 on black |
| `--info-ink` | `#00789F` | `#4BB8DF` | Links, the focus ring | 5.0:1 on white; 7.2:1 on page |
| `--alert` | `#EF476F` Raspberry | same | Large alert shapes | 3.6:1 on white; 4.5:1 on page |
| `--alert-ink` | `#D22758` | `#F4769A` | Overdue and error text, fields with errors | 5.0:1 on white; 6.2:1 on page |

Some fills have text on them. Each has its own token, so dark mode can change one without breaking another.

| Token | Light | Dark | Used for | Contrast (light; dark) |
|---|---|---|---|---|
| `--fill-strong` | `#073B4C` Midnight | `#CDD8DB` Sea Mist | The current section, the chosen status filter, Won, the chosen date, checked boxes, the chosen activity type, tooltips, the skip link | |
| `--on-fill-strong` | `#FFFFFF` | `#073B4C` | Text and icons on `--fill-strong` | 12.1:1; 8.3:1 |
| `--on-bright` | `#073B4C` | same | Text on Sea Green, Marigold and Coral, and on pill counts | See those colors |
| `--alert-fill` | `#D22758` | same | The Late badge, delete buttons | White text 5.0:1 |
| `--alert-fill-hover` | `#B81E4A` | same | Delete button hover | White text 6.3:1 |
| `--info-fill` | `#00789F` | same | Negotiation, the focused part of a date | White text 5.0:1 |
| `--on-dark` | `#FFFFFF` | same | Text on `--alert-fill` and `--info-fill` | |
| `--count-bg` | `rgb(255 255 255 / 55%)` | same | The count badge on stage pills | Midnight text 4.8:1 or more on every stage, in both modes |

### 5.3 Stage and status colors

The pipeline has six stages and the brand has five colors. The four open stages follow the brand's order. Won takes Midnight, and Lost a neutral grey. Raspberry stays free for alerts, so "late" and "overdue" never look like a stage.

| Stage | Fill | Text on it |
|---|---|---|
| New | Sea Green `--primary` | Midnight `--on-bright` |
| Qualified | Marigold `--secondary` | Midnight `--on-bright` |
| Proposal | Coral `--tertiary` | Midnight `--on-bright` |
| Negotiation | Cerulean ink `--info-fill` | White |
| Won | `--fill-strong`: Midnight, or Sea Mist in dark mode | `--on-fill-strong`: white, or Midnight in dark mode |
| Lost | Grey `--subtle` | `--ink` |

| Contact status | Fill | Text on it |
|---|---|---|
| Lead | Coral | Midnight |
| Qualified | Marigold | Midnight |
| Customer | Sea Green | Midnight |

Stages and statuses always show their name in text, so color is never the only sign. They keep their hues in dark mode. Won turns Sea Mist, a light Midnight, because a Midnight pill would almost disappear on the dark page. The late badge is `--alert-fill` with white text, a clock icon and the word "Late".

### 5.4 Type

All fonts are bundled from npm (Fontsource), so the app needs no internet connection.

- **Instrument Sans** (variable) for headings and body:
  - Page titles: 28 px, weight 600.
  - Panel titles: 18 px, weight 600.
  - Body: 15 px, line height 1.5.
  - Tables and cards: 14 px.
  - Captions: 13 px.
  - Nothing is smaller than 12 px.
- **JetBrains Mono** for numbers: money, percentages, counts and the scoreboard's figures, with tabular figures. The scoreboard's figures use 34 px, weight 500. Money in tables is right-aligned.
- **Instrument Serif,** italic, only for the dashboard's tagline (22 px).

### 5.5 Space, shape and depth

- **Spacing:** a 4 px scale of 4, 8, 12, 16, 24, 32 and 48. Panels have 24 px padding.
- **Corners:** 16 px on panels and dialogs, 12 px on cards, 10 px on buttons and inputs, and fully round on pills.
- **No outlines on panels,** and no line on just one edge of anything. White panels on the grey page give the separation.
- **Shadows:** none on panels. Board cards have `0 1px 2px rgb(7 59 76 / 8%)`. A card being dragged has `0 12px 24px rgb(7 59 76 / 18%)`. Dialogs have `0 24px 48px rgb(7 59 76 / 24%)` over a backdrop of `rgb(7 59 76 / 40%)`.
- **Shadows in dark mode** are black and stronger: `0 1px 2px rgb(0 0 0 / 40%)` on cards, and `0 12px 24px` or `0 24px 48px` at 60% when dragging and on dialogs. A black shadow doesn't show on black, so dialogs, menus, messages and a dragged card also get a faint 1 px Sea Mist edge, `rgb(205 216 219 / 16%)` (20% when dragging). The dialog backdrop is `rgb(4 35 46 / 75%)`.
- **Focus:** a 2 px `--info-ink` outline with a 2 px gap, on everything that can take focus.
- **Click targets:** at least 32 px tall for buttons and inputs, and never under 24 × 24 px.
- **Motion** uses a 150 ms ease-out transition on hover where applicable and respects the system's reduced-motion setting.

### 5.6 Components

- **Primary button:** Sea Green with Midnight text, weight 600.
- **Secondary button:** `--subtle` with Midnight text.
- **Destructive button:** `--alert-fill` with white text, and `--alert-fill-hover` on hover.
- **Icon buttons:** `--ink` icons, with a `--subtle` background on hover, a visible label in a tooltip, and the same text as their accessible name.
- **The "Dark mode" toggle:** an icon button with a Lucide moon and `aria-pressed`. The moon fills in when dark mode is on.
- **Inputs:** `--panel`, with a 1 px `--control` border and 10 px corners. Fields in an error state get an `--alert-ink` border and the error text under them.
- **Pills:** 13 px, weight 600, fully round, with the fills from section 5.3.
- **Icons:** Lucide, at 16 or 20 px.
- **Panels:** `--panel`, with 16 px corners and 24 px padding, and the title at top left.
- **Open pipeline by stage:** a 14 px bar split into the four open stages. Each part is in its stage's color and as wide as its share of the open value, with 2 px gaps and 4 px rounded outer ends. Under each part are the stage's name, with a small square in its color, and its value in JetBrains Mono. The bar itself is decoration. The names and values carry the meaning.
- **Stage pill with count:** the stage's fill and text color (section 5.3), 30 px tall, with the count in JetBrains Mono on a small white badge at 55% opacity.
- **Contact initials:** a 26 px `--subtle` circle with up to two initials, 11 px, weight 700.
- **Probability meter:** a 4 px `--subtle` track with an `--ink` fill as wide as the probability, and the percent in JetBrains Mono beside it. The meter is decoration. The percent is the text.
- **Menus:** a `--panel` panel with 12 px corners, 6 px padding and a dialog-like shadow. Items are 34 px tall, with a `--subtle` background on hover and focus. Groups are separated by a 1 px `--line` rule.

### 5.7 Charts

- **Recharts.** Each chart shows one series, so no chart needs a legend.
- **The revenue line** uses a 2 px stroke in `--primary-ink` and a Sea Green fill that fades to transparent. It labels the peak and latest values when the peak is above zero, and highlights the active point.
- **The deals-won bars:** `--info`, with the count above each bar in `--ink`.
- **The funnel bars:** centered, 30 px tall, in each stage's fill, with the figures in text on either side. Light fills always have their value in text next to them, which WCAG accepts in place of 3:1 contrast for the shape.
- **Grid lines:** horizontal only, in `--line`.
- **Axes** use 12 px `--ink-muted` labels, with money in the short form.
- **Tooltips:** a `--panel` panel with a shadow and numbers in JetBrains Mono. They can be reached with the keyboard (Recharts' accessibility layer).

### 5.8 Words

Plain business English. Short labels, sentence case, and no exclamation marks. Buttons say what they do: "Add deal", "Log activity" and "Delete contact", never "Submit" or "OK". Money always shows its currency.
