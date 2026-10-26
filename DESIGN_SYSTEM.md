# MPixel Media ERP Design System

This document describes the design currently implemented in the application. The CSS custom properties in `src/index.css` are the source of truth for shared color and motion tokens.

## Visual direction

Use a premium, predominantly pure-black Liquid Glass direction. Keep the workspace black; use neutral white-grey highlights on translucent navigation, headers, metrics, and overlays. Cyan is reserved for mpixelmedia branding, the active navigation state, focus indicators, and important actions. Do not add cyan, purple, blue, or peach ambient background lighting. Use backdrop blur selectively—never on dense table rows or financial figures—and keep data easy to scan. This is a practical web interpretation of Apple's visual language, not a reproduction of its proprietary native rendering.

## Color and typography

Use CSS variables rather than introducing literal palette values. Reusable material classes define the neutral highlights and elevation; do not add cyan-tinted glass or ambient color glows.

| Token | Purpose |
| --- | --- |
| `--color-background` (`#000000`) / `--color-background-secondary` (`#050505`) | Main application background layers |
| `--color-surface` (`#0A0A0A`) / `--color-surface-elevated` (`#111111`) | Opaque panels, cards, and form surfaces |
| `--color-glass` / `--color-glass-elevated` / `--color-glass-border` | Neutral floating materials and edge highlights |
| `--color-sidebar` | Sidebar background |
| `--color-text-primary` (`#F5F5F7`) | Primary text |
| `--color-text-secondary` / `--color-text-muted` | Supporting and low-emphasis text |
| `--color-text-on-accent` (`#061211`) | Text on cyan primary controls |
| `--color-border` | Surface and control boundaries |
| `--color-accent` (`#42DED5`) / `--color-accent-hover` (`#2BC6BE`) | Primary actions and active navigation |
| `--color-success` (`#65D6A3`) / `--color-warning` (`#E8BC72`) / `--color-error` (`#FF7777`) | Semantic states |
| `--color-bg-hover` / `--color-badge-bg` | Hover and neutral badge surfaces |
| `--glass-blur` / `--glass-radius` / `--glass-border` / `--glass-shadow` | Shared glass material and depth tokens |

Inter is the shared typeface. Use the existing `--font-sans` and `--font-serif` aliases, and keep labels, table content, and controls compact and readable. Financial values should use the existing currency formatter and Indian Rupee conventions. Dates shown to users should use the shared local-date helper where applicable.

## Components and interaction

- Prefer the shared CSS-variable classes for backgrounds, borders, text, focus rings, and semantic colors.
- Reuse `.glass-panel`, `.glass-panel-subtle`, and `.glass-panel-elevated` for layered surfaces. Use `.liquid-glass`, `.liquid-glass-floating`, and `.liquid-glass-elevated` for neutral Level 1–3 material; `.liquid-sidebar`, `.liquid-header`, `.liquid-floating-control`, `.liquid-metric-card`, `.liquid-content-panel`, and `.liquid-popover` remain role-specific variants.
- Use `.liquid-panel-header` for restrained section reflections, `.liquid-glass-inner` for recessed nested metrics, `.liquid-glass-status` for compact status/control chips, and `.liquid-control-tray` for filter groups. Keep blur to outer floating layers rather than stacking it on nested components.
- Use `.liquid-table-container` for dense tabular and financial data. It keeps table content predominantly opaque, with subtle separators and hover treatment. Reserve `.liquid-dispatch-panel` and `.liquid-glass-interactive` for a few prominent interactive panels; do not animate every card.
- Use `.liquid-glass-button` for secondary floating controls, `.liquid-glass-input` for individually styled fields, and `.liquid-dialog` for elevated overlays. Shared text fields, selects, and textareas retain black inset surfaces and clear cyan focus indicators; checkboxes and radio controls remain native.
- Reserve interactive pointer lighting for the small dashboard metric cards and avoid continuous large-gradient animation.
- Use the existing slide-over pattern for create/edit forms and shared dialog components for confirmations.
- Keep primary buttons visually distinct; use subdued borders and text for secondary actions. Keep cyan for selected or important controls, never as a permanent glow.
- Respect the material hierarchy: Level 0 pure black page; Level 1 restrained opaque dashboard/data panels; Level 2 floating navigation, headers, and controls; Level 3 command palettes, popovers, and dialogs. Tables and financial values must remain legible over opaque charcoal surfaces.
- Use concise, readable status indicators. Reserve semantic colors for meaningful states; do not color every link, icon, or label as an accent.
- Preserve keyboard access and visible focus. Respect `prefers-reduced-motion`.
- Modal drawers and palettes should trap focus, restore focus to their trigger, and close with Escape. Floating controls need an accessible name and expanded state.
- Reuse shared components for empty states, loading skeletons, exports, confirmations, and keyboard shortcuts rather than recreating one-off versions.
- The `KeyboardShortcuts` component is the central place for global shortcut behavior and its in-app help reference.

## Charts

Use a restrained chart-only palette with clear distinctions between series. Maintain text contrast and provide an accessible label or equivalent summary for SVG visualizations. Do not reuse chart colors indiscriminately across unrelated interface elements.

## Adding or changing styles

1. Check `src/index.css` and existing shared components before adding a new token or pattern.
2. Prefer an existing token. Add a new token only when it represents a distinct, reusable semantic role.
3. Keep financial, approval, and destructive states visually distinct and consistent with their behavior.
4. Verify the changed view in both narrow and wide layouts and with keyboard navigation.
