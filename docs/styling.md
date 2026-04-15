# Styling Guide

CSS conventions, design tokens, layout architecture, and responsive breakpoints for the DDO Tools frontend.

## Design Principles

- **Flat chrome, no panel contrast.** The nav bar, bottom bar, and stats side panel use `var(--bg)` (page background) — not `--bg-panel`. They sit flush with the page. Separation is carried entirely by hairline borders (`1px solid var(--border)`). This gives a continuous canvas feel split by thin edges, rather than floating panels.
- **No shadows on coplanar surfaces.** `box-shadow` implies z-axis elevation — only use it on genuinely floating elements (tooltips, modals, popovers). A flush surface with a shadow is a visual contradiction. `--bg-panel` + `box-shadow` is reserved for elevated UI (tooltip portals, confirm modals, the bottom-bar tooltip).
- **Active state = color + weight.** Nav items signal active via accent color + one weight-step bump (500 -> 600). The character card adds an accent border + accent top divider. Active items get `cursor: default` and suppress hover background changes — clicking the already-active item is a no-op.
- **Accent derivatives use `color-mix()`.** Tokens like `--accent-bg-subtle`, `--accent-glow` are derived from `--accent` via `color-mix(in srgb, var(--accent) N%, transparent)` so they track the active accent theme automatically. Never declare accent derivatives as static `rgba()` — that freezes them to one theme.
- **Identity vs navigation.** The character card's active state uses border + weight + color (emphasizing identity); nav buttons use left accent bar + weight + color (standard navigation). Different element types earn different active patterns.

## Conventions

- **Plain CSS** with native nesting (no Sass/SCSS). All modern browsers support `&` nesting.
- **BEM naming**: Block-Element-Modifier. `nav-bar-btn`, `nav-bar-btn--active`, `nav-bar-build-row`. Use `--` for modifiers, `-` for multi-word blocks/elements.
- **CSS custom properties** for shared values: colors in `index.css` `:root`, component-scoped vars (e.g., `--icon-col`) at the component root.
- **Nesting**: Use native CSS nesting for states (`&:hover`, `&.active`), pseudo-elements (`&::before`), child selectors (`& > svg`), and parent-context overrides (`.app-nav-bar:not(.expanded) &`). Note: `&-suffix` concatenation is NOT supported in native CSS (that's Sass only). Use separate selectors instead.
- **Shared classes** for repeated patterns: e.g., `.nav-bar-collapsible` for all text that hides on collapse.
- **No `!important`**. Fix specificity issues with nesting or more specific selectors.
- **Co-locate CSS** with components: `AppNavBar.css` next to `AppNavBar.tsx`.

## Design Tokens

Defined in `src/index.css` on `:root` (dark) and `:root[data-theme='light']` (light).

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--bg` | `#18181b` | `#f4f4f5` | Page background |
| `--bg-panel` | `#27272a` | `#ffffff` | Elevated surfaces only (tooltips, modals). Chrome surfaces (nav, bottom bar, stats) use `--bg` instead. |
| `--bg-input` | `#1c1c1f` | `#e8e8eb` | Input fields |
| `--accent` | `#b8962e` | `#8b7335` | Gold accent color (matches Gold theme in `theme.ts`) |
| `--accent-hover` | `#d4ad3a` | `#6e5a28` | Accent hover state |
| `--text` | `#fafafa` | `#18181b` | Primary text |
| `--text-secondary` | `#a1a1aa` | `#52525b` | Secondary text |
| `--text-muted` | `#71717a` | `#71717a` | Muted/disabled text |
| `--border` | `#3f3f46` | `#d4d4d8` | Default borders |
| `--border-accent` | `#52525b` | `#a1a1aa` | Emphasized borders |
| `--hover-bg` | `#323236` | `#e4e4e7` | Hover backgrounds |
| `--danger` | `#ef4444` | `#ef4444` | Error/warning red |
| `--shadow-color` | `rgba(0,0,0,0.3)` | `rgba(0,0,0,0.1)` | Box shadows (elevated surfaces only — see Design Principles) |
| `--accent-glow` | `color-mix(accent 30%, transparent)` | `color-mix(accent 20%, transparent)` | Accent glow effects (button hover shadows) |
| `--accent-glow-strong` | `color-mix(accent 50%, transparent)` | `color-mix(accent 35%, transparent)` | Stronger glow (primary button hover) |
| `--accent-bg-subtle` | `color-mix(accent 10%, transparent)` | `color-mix(accent 10%, transparent)` | Active item backgrounds |

Always use tokens, never hardcode colors. Use variables for repeated dimensions (`--icon-col`), timing, and spacing. If a value appears 3+ times, extract it.

## Layout Architecture

The app uses a **3-column CSS Grid** inside a flex shell:

```
.app-shell (flex column, 100vh)
  .app (CSS grid: nav bar | content | stats)
  .bottom-bar (flex-shrink: 0)
```

Grid columns are controlled by JS-toggled classes on `.app`:

| Class | Grid columns |
|-------|-------------|
| (default) | `220px 1fr 280px` |
| `.app--nav-bar-collapsed` | `56px 1fr 280px` |
| `.app--no-stats` | `220px 1fr` |
| `.app--nav-bar-collapsed.app--no-stats` | `56px 1fr` |

- **Nav bar**: 220px expanded, 56px collapsed. Icon column = `--icon-col: 54px`.
- **Stats panel**: 280px, shown only on `build-plan` view. Plan to make collapsible later.
- **Bottom bar**: In normal document flow below the grid, `flex-shrink: 0`.

## Responsive Breakpoints

The nav bar is always in the grid flow (never fixed-position) except at `<600px` when expanded.

| Width | Nav bar default | Expanded behavior | Notes |
|-------|----------------|-------------------|-------|
| **>=900px** | Stored preference (localStorage) | Inline, pushes content (220px) | Desktop layout |
| **600-899px** | Auto-collapsed (icons only, 56px) | Inline, pushes content (220px) | Re-expands when resizing back above 900px |
| **<600px** | Auto-collapsed (icons only, 56px) | **Full-screen overlay** (`position: fixed; inset: 0`) | Auto-closes on navigate |

Key rules:
- **No media queries in App.css** -- grid columns are controlled by JS-toggled classes (`app--nav-bar-collapsed`, `app--no-stats`).
- **One media query in AppNavBar.css** -- `@media (max-width: 599px)` makes `.app-nav-bar.expanded` full-viewport via `position: fixed`.
- Auto-collapse/restore is handled by a resize listener in `App.tsx` that tracks the 900px threshold crossing.
