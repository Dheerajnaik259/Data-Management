# MPixel Media ERP — Design System

This document describes the styling conventions currently present in the app. CSS custom properties and reusable styles in `src/index.css` are the source of truth.

## Visual direction

The interface uses a dark, restrained Liquid Glass-inspired treatment: translucent surfaces, blur/saturation, fine highlights, and restrained color. Keep financial data legible and avoid decorative effects that compete with content.

## Tokens

Use the existing CSS variables instead of introducing unrelated hard-coded palette values.

| Token | Current purpose |
|---|---|
| `--color-background`, `--color-background-secondary` | Page backgrounds |
| `--color-surface`, `--color-surface-elevated` | Opaque surfaces |
| `--color-glass`, `--color-glass-elevated`, `--color-glass-border` | Translucent surfaces and edges |
| `--color-sidebar` | Navigation background |
| `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` | Text hierarchy |
| `--color-text-on-accent` | Text on accent controls |
| `--color-border` | Control and surface boundaries |
| `--color-accent`, `--color-accent-hover` | Primary actions and selected states |
| `--color-success`, `--color-warning`, `--color-error` | Semantic outcomes |
| `--glass-blur`, `--glass-radius`, `--glass-border`, `--glass-shadow` | Shared glass material |
| `--transition-fast`, `--transition-normal`, `--motion-glass` | Motion timing and easing |

Both `--font-sans` and `--font-serif` currently resolve to Inter with system fallbacks. Dates and currency should use shared utilities; currency is displayed in INR.

## Components and layout

- Check `src/index.css` and existing components before adding a token, class, or parallel UI pattern.
- Existing surfaces include `.glass-panel`, `.liquid-glass`, `.liquid-glass-floating`, and `.liquid-glass-elevated`.
- Use `.liquid-sidebar`, `.liquid-nav-link`, and `.liquid-nav-group` for navigation.
- Use `.liquid-table-container` for dense tables; prioritize legibility over strong blur.
- Reuse the shared dialogs, slide-overs, loading/empty states, toast and notification UI, and keyboard-shortcut components.
- The desktop shell uses compact navigation; mobile navigation expands to labeled grouped links. Retain accessible names and tooltips for icon-only controls.
- The calendar must remain usable with touch and keyboard as well as a pointer.
- Horizontal trackpad history navigation is centralized in the app shell. Avoid page-specific handlers that compete with it; horizontally scrollable regions and editable controls are excluded.
- Preserve visible keyboard focus, clear labels, adequate contrast, and semantic colors that communicate a meaningful state.
- Respect reduced-motion preferences. Do not rely on animation alone to communicate state.

## Charts and financial information

The dashboard chart compares paid client receipts with paid crew payouts and logged expenses, and presents net position. This is a cashflow view, not profit. Keep series distinct and retain an accessible label and text summaries when changing chart presentation.

## Updating the design

1. Inspect the existing token/class and the target component.
2. Add a token only for a distinct, reusable semantic role.
3. Keep responsive behavior and role-based content intact.
4. Verify the affected view at narrow and wide sizes and with keyboard navigation.
