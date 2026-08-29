# SMM Ops Tool — Design System

This is the single source of truth for visual style. Do not introduce colors, fonts,
components, or patterns not listed here. If something isn't covered, ask before
inventing a new pattern — don't default to generic SaaS/dashboard conventions
(purple/indigo gradients, icon-in-colored-circle stat cards, heavy drop shadows,
pill badges everywhere).

## Visual Identity

Warm minimal editorial. Should feel like a well-designed independent studio's
internal tool — premium but not corporate-cold. Flat 2D, no glossy gradients,
no 3D renders.

## Platform target

Desktop/laptop only — this is used at a desk, not in the field on a phone.
Design for that directly rather than treating it as a scaled-down mobile
layout: denser tables are fine, hover states are expected and should be
used (row hover, tooltip-on-hover for truncated text), and screen real
estate can be spent on showing more context inline (e.g. a client's
pending-approval status right in the list row) rather than hiding it
behind taps. Don't build mobile breakpoints, a hamburger nav, or
touch-sized tap targets as a priority — optimize for mouse + keyboard on a
1280px+ viewport.

## Color Tokens

```css
:root {
  --color-background:      #FAF8F5; /* cream, not pure white */
  --color-surface:         #FFFFFF; /* cards on top of background */
  --color-sidebar:         #1A1A1A; /* charcoal, NOT purple/indigo */
  --color-text-primary:    #1A1A1A; /* charcoal ink, not pure black */
  --color-text-secondary:  #6B6459; /* muted warm gray */
  --color-text-on-dark:    #FAF8F5;
  --color-border:          #E5E0D8; /* thin warm-gray border, not harsh gray */

  --color-accent:          #D97B4F; /* terracotta — THE only accent color */
  --color-accent-hover:    #C2673D;

  --color-success:         #3D6B4F; /* muted forest green, not bright green */
  --color-error:           #B14A3D; /* muted brick red, not bright red */
  --color-warning:         #B8863F; /* muted amber, not bright yellow */
}
```

### Accent discipline (critical — most common failure mode)
Terracotta (`--color-accent`) is used ONLY for:
- Primary buttons ("Save," "Add Client," etc.)
- The active/selected sidebar nav item
- ONE key highlighted number per stat card (not every number)

Everything else — secondary numbers, links, status text, table row IDs — uses
`--color-text-primary` or `--color-text-secondary`. If more than ~15% of a
screen is orange, that's wrong — pull it back.

**Confirmed real-world failure mode (seen in an actual build, not just a
mockup):** table cells turned every client/cameraman NAME into orange
link-styled text, every icon in a stat card into orange, and every "View
all" / "Manage X" link into orange — on some screens this pushed orange
past 30% of visible content and made it impossible to tell which orange
text was actually clickable versus just styled that way. Concretely:
- Client/cameraman/shoot NAMES in a table are `--color-text-primary`
  (charcoal), NOT the accent color, even if the row is clickable. Use an
  underline-on-hover or a trailing chevron/external-link icon to signal
  "clickable," not color.
- Only ONE link per card/section may be terracotta (e.g. a single "View
  all →" per card). If a screen has more than 3–4 terracotta links total,
  that's too many — convert the rest to charcoal.
- Stat card icons are charcoal or muted gray line icons by default. Only
  the stat card representing the single most important number on that
  screen (e.g. "Net Cash Flow" on the payments screen) may use a terracotta
  icon — not every card's icon.

Do NOT invent a second accent color for charts/badges. Status indicators use
a small dot + muted gray text, not colored pill badges, unless explicitly
building a chart legend (chart legends may use a limited additional palette
of muted colors, kept OUT of the rest of the UI).

## Typography

- Headings: a distinctive serif or slab (e.g. Fraunces, Signifier). Used for
  page titles and card titles only.
- Body/data/UI: a clean grippy sans (e.g. Inter, IBM Plex Sans). Used for
  everything else — numbers, labels, table content, buttons, inputs.
- Numbers (stat card values) should feel substantial: larger size, sans,
  medium/semibold weight — not default system-font thin numerals.

```css
--font-heading: 'Fraunces', serif;
--font-body: 'Inter', sans-serif;

--text-page-title:  28px / serif / 600;
--text-card-title:  18px / serif / 600;
--text-stat-value:  32px / sans / 600;
--text-body:        14px / sans / 400;
--text-label:       12px / sans / 500 / uppercase / letter-spacing 0.04em;
--text-caption:     12px / sans / 400 / color: text-secondary;
```

## Layout

- Sidebar: dark charcoal (`--color-sidebar`), fixed width ~230px, logo + app
  name at top, nav items with icon + label, active item gets terracotta
  text/icon + subtle left accent bar (not a filled purple block).
- Content area: cream background, generous padding (24–32px).
- Cards: white surface, 1px `--color-border`, rounded corners (8–12px),
  NO heavy box-shadow at rest — flat/bordered by default. Clickable cards
  gain a soft shadow + slight lift ONLY on hover, see "Hover, focus &
  elevation" below — the shadow is earned by interaction, not present
  by default.
- Stat cards: icon (flat, no colored circle background) + label + large
  number + small delta caption below (e.g. "+2 this month").

## Components

### Buttons
- Primary: terracotta background, cream text, no gradient.
- Secondary: white/transparent background, 1px border, charcoal text.
- Ghost/text: no background or border, charcoal text, used for "Cancel."
- Never use a blue focus ring — focus states use a subtle terracotta glow.

### Tables
- Minimal gridlines (bottom border only per row, no vertical lines).
- Numbers right-aligned.
- Status shown as small dot + muted gray/charcoal text, not a loud colored
  pill, UNLESS it's a semantic financial state (paid/overdue) where muted
  green/red text is acceptable — still not a bright badge.
- Row hover: very subtle background tint, not a shadow or scale effect.

### Pending / approval-queue state
A row still awaiting founder approval must look visibly different from a
live one, right in the list — never rely on someone remembering to check
the Pending Approvals screen separately.
- Pending rows: reduced-opacity content (not greyed-out disabled-looking,
  just ~70% opacity) plus a small "Pending" text tag in muted amber
  (`--color-warning`), not the accent color.
- Sidebar nav items that have something waiting get a small unread-style
  count badge — same treatment for **Cameramen** (pending rates, see
  `DATA_MODEL.md` → "Cameraman rate assignment flow") and **Pending
  Approvals** itself, not just the notification bell. Don't make the bell
  the only place this surfaces.
- Rejected items get their own small tag (muted brick-red,
  `--color-error`) distinct from "Pending," since they need a different
  action (Edit & Resubmit) rather than just waiting.

### Instant vs. queued actions — one consistent icon convention
Some actions (mark paid, mark checked-in, delete/restore) apply
immediately; almost everything else queues for founder approval. This
distinction needs to be visually obvious in the moment, not something the
user has to infer from memory:
- A small lock/checkmark icon next to an action or its result = applied
  immediately, no approval needed (e.g. the "✓ Paid on 14 Aug 2026" locked
  summary, delete/restore confirmations).
- A small clock icon = this just went into the approval queue, not live
  yet (e.g. right after submitting a new client, before founder has acted).
- Use these two icons consistently everywhere this distinction matters —
  don't invent a third visual treatment per screen.

### Forms
- Right-side slide-over panel for "Add/Edit" flows, NOT a centered modal.
  ~420px wide, full height, white surface, soft shadow on the left edge
  separating it from the dimmed table behind it.
- Inputs: 1px charcoal-gray border, generous padding, small uppercase gray
  label above each field, terracotta border + subtle glow on focus.
- Validation errors: small muted brick-red inline message under the field,
  not just a red border.
- Panel primary action (terracotta) bottom-right; "Cancel" as ghost button
  beside it.
- Repeatable rows (e.g. cameramen on a shoot): each row is its own bordered
  block with a remove (×) icon; "+ Add another" as a text link below the
  last row, not a separate modal.

### Charts
- Line charts: terracotta solid line for primary series, dashed for
  secondary, charcoal for a neutral/net line. No area fill gradients.
- Donut/pie: limited muted palette (terracotta + forest green + tan +
  charcoal), used only within that one chart — don't reuse this palette
  as UI accent colors elsewhere.

## Modern interaction patterns

This is a daily-use internal tool for two people, not a public marketing
site — optimize for speed and repeated use over decorative polish. Avoid
the "old-school CRUD app" feel: full page reloads, spinner-then-refresh,
silent saves with no feedback, sparse card grids that waste desktop space.

- **Command palette (Cmd/Ctrl+K):** global fuzzy search across
  clients/cameramen/shoots plus quick actions ("New Shoot," "Go to
  Cameramen," "New Expense"). This is the primary way to navigate quickly
  once the person knows the tool — sidebar nav is the fallback, not the
  only path.
- **Toast notifications for action feedback**, not static banners or
  silent saves. E.g. "Client added — pending approval" as a brief toast
  in the corner, auto-dismissing after a few seconds. Every write action
  (create, edit, delete, approve, reject, mark paid) gets one.
- **Optimistic UI:** since this is built on Firestore's real-time
  listeners anyway, the UI should update immediately on action (row
  appears, status flips) rather than showing a spinner and waiting for
  the round-trip. Reconcile quietly if the write fails (toast an error,
  revert the optimistic change) — don't make the person wait to see their
  own action take effect.
- **Keyboard shortcuts** for the most frequent actions: `/` focuses
  search, `N` opens "new" for whatever list is in view (new shoot on
  Shoots, new client on Clients, etc.), `Esc` closes the open slide-over
  panel or command palette. Show shortcut hints in tooltips, not a
  separate help screen nobody opens.
- **Dense tables, not spaced-out cards.** This is desktop software used
  by people who'll be in it daily — favor showing more rows and more
  columns of real information over generous whitespace between sparse
  cards. Whitespace and warmth live in the color/type system already
  defined above, not in how much is visible per screen.
- **Skeleton loaders, not spinners.** Content-shaped gray placeholder
  blocks while data loads (a table skeleton shaped like the real table,
  a card skeleton shaped like the real card) — reads as faster and more
  polished than a spinning icon, even at identical load time.
- **Smooth, fast transitions only** — 150–200ms ease for panel
  slide-ins, dropdown opens, hover states. No bouncy/springy animation,
  no page-transition effects. Motion should be felt, not noticed.

## Hover, focus & elevation

Every interactive element should give clear, immediate feedback that it's
interactive — this is what makes the app feel responsive and polished
rather than static. Keep it subtle and fast; the goal is a tool that feels
alive under the cursor, not one full of bouncy animation.

```css
--transition-default: 150ms ease;
--shadow-hover: 0 4px 12px rgba(26, 26, 26, 0.08); /* only appears on hover — resting cards stay flat per "Cards" above */
```

- **Cards (clickable ones — e.g. a client card, a stat card that links
  somewhere):** on hover, lift slightly (`translateY(-2px)`) and fade in
  `--shadow-hover`. Resting state stays flat/bordered as already defined —
  the shadow is earned by hovering, not present by default. Transition
  both over `--transition-default`.
- **Table rows (clickable ones):** background tint on hover (already
  defined) PLUS `cursor: pointer`. For rows where only part is clickable
  (e.g. a name links to detail, but the row itself doesn't), don't tint
  the whole row — tint/underline just the clickable part, so hover
  doesn't lie about what happens on click.
- **Buttons:** background shifts to `--color-accent-hover` (already
  defined) on hover for primary buttons; secondary/ghost buttons get a
  subtle background tint. No scale or bounce — a flat color shift only,
  consistent with the flat 2D visual identity. `cursor: pointer` always;
  disabled buttons get `cursor: not-allowed` and reduced opacity, and
  skip the hover effect entirely.
- **Sidebar nav items:** subtle background tint on hover, distinct from
  (and lighter than) the active-item treatment — hovering a non-active
  item should never look like it's already selected.
- **Icon-only buttons** (bell, edit/delete icons in table actions, close
  buttons): circular background tint on hover, and a tooltip showing the
  action's label after a brief delay (~500ms) — icon-only controls should
  never rely on the user already knowing what they do.
- **Links:** underline appears on hover, not present by default (matches
  the earlier rule that clickable names in tables stay charcoal, not
  accent-colored — hover is what signals interactivity, not color alone).
- **Inputs:** a light border-color shift on hover (before focus), then
  the terracotta focus glow already defined once actually focused/active
  — gives a graduated sense of "this is about to be interactive" →
  "this is now active."
- **Truncated text** (long client names, notes cut off with ellipsis):
  show the full text in a tooltip on hover — never let content be
  permanently unreadable just because it didn't fit.
- Apply `--transition-default` consistently to every hover/focus state
  above — nothing should snap instantly or take longer than ~200ms.
  Consistency in timing matters more than the exact duration.

## Currency & Locale
- All money in ₹ (Indian Rupees), formatted with comma separators
  (e.g. ₹1,24,500 — Indian numbering, not ₹124,500).
- Dates as "14 Aug 2025" format, not ISO or US format, in the UI (ISO is
  fine internally/in Firestore).

## Explicitly avoid
- Purple/indigo gradients or any purple as primary or accent color
- Icon-in-colored-circle stat card icons
- Heavy drop shadows on every card
- Pill-shaped badges for every status
- Centered modal dialogs for forms (use slide-over instead)
- More than one accent color in the core UI (chart-only palettes excepted)
- Terracotta used for the "Pending" tag, a sidebar badge count, or any
  status/queue indicator — those are muted amber/red per "Pending /
  approval-queue state" above. With more screens now (Recycle Bin, Pending
  Approvals, notification dropdown, Cameramen pending-rate badges), it's
  easy to reach for the accent color as a generic "something's here"
  signal — don't. It stays reserved for primary actions and the one
  locked-action icon, nothing else.