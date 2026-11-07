# MPixel Media ERP — Design System

This document records the current styling direction and shared UI conventions. CSS custom properties in `src/index.css` are the source of truth for shared visual tokens.

## Visual direction

The application uses a predominantly black, restrained Liquid Glass treatment. Data panels and tables remain opaque enough for legibility; blur is reserved for selected floating layers such as navigation, headers, and overlays. Cyan is the primary interaction accent, not an ambient background glow. Keep dense financial information easy to scan and avoid decorative effects that compete with it.

## Color and typography

Use the CSS variables rather than introducing unrelated literal palette values.

| Token | Current purpose |
|---|---|
| `--color-background` (`#000000`) / `--color-background-secondary` (`#050505`) | Page and secondary background layers |
| `--color-surface` (`#0A0A0A`) / `--color-surface-elevated` (`#111111`) | Opaque cards and form surfaces |
| `--color-glass`, `--color-glass-elevated`, `--color-glass-border` | Neutral translucent surfaces |
| `--color-sidebar` | Sidebar surface |
| `--color-text-primary` (`#F5F5F7`), `--color-text-secondary`, `--color-text-muted` | Text hierarchy |
| `--color-text-on-accent` (`#061211`) | Text on accent controls |
| `--color-border` | Surface and control boundaries |
| `--color-accent` (`#42DED5`) / `--color-accent-hover` (`#2BC6BE`) | Primary actions, focus, and selected navigation |
| `--color-success`, `--color-warning`, `--color-error` | Semantic states |
| `--glass-blur`, `--glass-radius`, `--glass-border`, `--glass-shadow` | Shared material and elevation |

Inter is the shared typeface through `--font-sans` and `--font-serif`. Use the shared currency formatter for INR values and local-date utilities for user-facing dates where applicable.

## Surface and component conventions

- Prefer existing CSS tokens and classes in `src/index.css` before adding new styles.
- Existing surface classes include `.glass-panel`, `.liquid-glass`, `.liquid-glass-floating`, and `.liquid-glass-elevated`.
- The desktop application shell uses a compact glass icon rail; the mobile drawer expands the same grouped navigation with labels and route links.
- Use `.liquid-sidebar`, `.liquid-nav-link`, and `.liquid-nav-group` for navigation surfaces and states. Compact links must retain accessible names and tooltips.
- Use `.liquid-table-container` for dense tables and financial data; avoid applying strong blur to table rows.
- Use `.liquid-glass-button`, `.liquid-glass-input`, and `.liquid-dialog` for matching controls and overlays where appropriate.
- Use the existing shared slide-over, confirmation dialog, loading skeleton, empty state, toast, notification, and keyboard-shortcut components rather than creating duplicate patterns.
- Keep primary and secondary actions visually distinct. Apply semantic colors only when they convey status or outcome.
- Retain visible keyboard focus and clear labels for controls. The mobile navigation drawer supports Escape, focus trapping, and focus restoration; respect reduced-motion preferences.
- Keep page content fluid at narrow widths, with dashboard spacing scaling from compact mobile padding to wider desktop gutters.

## Charts

The dashboard's `GrowthChart` compares paid client receipts with paid crew payouts and logged expenses, and displays the resulting net position. This is a cashflow view, not a profit calculation. Preserve its existing data selection and calculations when styling; keep series visually distinct and provide an accessible chart label and text summaries.

## Changing styles

1. Check `src/index.css` and existing components for an established token or class.
2. Add a token only for a distinct, reusable semantic role.
3. Preserve contrast for approval, financial, and destructive states.
4. Check the affected view at narrow and wide sizes and with keyboard navigation.
