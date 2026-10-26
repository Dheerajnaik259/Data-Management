# MPixel Media ERP Design System

This document describes the design currently implemented in the application. The CSS custom properties in `src/index.css` are the source of truth for shared color and motion tokens.

## Visual direction

Use a dark, understated production workspace with a charcoal base, cyan as the main interactive accent, and mint and peach as limited supporting colors. Keep data dense and easy to scan. Avoid decorative gradients on controls, excessive blur, oversized empty cards, and colors that do not communicate a clear purpose.

## Color and typography

Use CSS variables rather than introducing literal palette values:

| Token | Purpose |
| --- | --- |
| `--color-bg` (`#07090B`) | Main charcoal application background |
| `--color-surface` (`#14171A`) | Panels, cards, drawers, and dialogs |
| `--color-sidebar` | Sidebar background |
| `--color-text` (`#F5F5F2`) | Primary text |
| `--color-text-secondary` / `--color-text-muted` | Supporting and low-emphasis text |
| `--color-text-on-accent` (`#061211`) | Text on cyan primary controls |
| `--color-border` | Surface and control boundaries |
| `--color-accent` (`#42DED5`) / `--color-accent-hover` (`#2BC6BE`) | Primary actions and active navigation |
| `--color-accent-mint` (`#9DEFD7`) / `--color-accent-peach` (`#FFB88E`) | Limited supporting accents, including charts |
| `--color-success` (`#53C99A`) / `--color-warning` (`#E8B65C`) / `--color-error` (`#F07070`) | Semantic states |
| `--color-bg-hover` / `--color-badge-bg` | Hover and neutral badge surfaces |

Inter is the shared typeface. Use the existing `--font-sans` and `--font-serif` aliases, and keep labels, table content, and controls compact and readable. Financial values should use the existing currency formatter and Indian Rupee conventions. Dates shown to users should use the shared local-date helper where applicable.

## Components and interaction

- Prefer the shared CSS-variable classes for backgrounds, borders, text, focus rings, and semantic colors.
- Use the existing slide-over pattern for create/edit forms and shared dialog components for confirmations.
- Keep primary buttons visually distinct; use subdued borders and text for secondary actions.
- Use concise, readable status indicators. Reserve semantic colors for meaningful states; do not color every link, icon, or label as an accent.
- Preserve keyboard access and visible focus. Respect `prefers-reduced-motion`.
- Reuse shared components for empty states, loading skeletons, exports, confirmations, and keyboard shortcuts rather than recreating one-off versions.
- The `KeyboardShortcuts` component is the central place for global shortcut behavior and its in-app help reference.

## Charts

Use a restrained chart-only palette with clear distinctions between series. Maintain text contrast and provide an accessible label or equivalent summary for SVG visualizations. Do not reuse chart colors indiscriminately across unrelated interface elements.

## Adding or changing styles

1. Check `src/index.css` and existing shared components before adding a new token or pattern.
2. Prefer an existing token. Add a new token only when it represents a distinct, reusable semantic role.
3. Keep financial, approval, and destructive states visually distinct and consistent with their behavior.
4. Verify the changed view in both narrow and wide layouts and with keyboard navigation.
