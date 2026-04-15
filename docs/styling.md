# Styling Guide

CSS conventions, design tokens, layout architecture, and responsive breakpoints for the DDO Tools frontend.

## Design Principles

- **Flat surfaces, no elevation.** No `box-shadow` anywhere — the UI is a single plane. Surface separation comes from subtle bg tint steps and hairline borders, never drop shadows. Even modals and tooltips sit flush, relying on border + bg contrast against a dimmed scrim.
- **Derive, don't duplicate.** The light theme only overrides 4 primitives: `--bg`, `--tint`, `--text`, `--accent`. Everything else — secondary/tertiary/hover bgs, borders, semantic colors — is derived via `color-mix()` or `rgb(from ... / alpha)`. Adding a new theme means picking 4 colors, not redefining the whole palette.
- **Tint, not text, is the shift direction.** Backgrounds and borders mix toward `--tint` (white in dark, black in light), not `--text`. Keeps intent clear: `--tint` is "the direction to shift for more contrast," `--text` is a content color. Adding colored text won't break surface derivations.
- **Solid vs transparent tokens serve different roles.**
  - **Solid `color-mix(tint N%, bg)`** (e.g. `--bg-secondary`, `--bg-tertiary`) — fixed colors, good for chrome surfaces where the element owns its entire visual box and doesn't need to respond to what's behind it.
  - **Transparent `rgb(from tint r g b / N)`** (e.g. `--bg-input`, `--bg-hover`) — context-responsive overlays that always appear N% brighter/darker than their parent. Use for hover states and inset elements that might appear on varying surface levels (e.g. a pip inside a hoverable row — a solid color would become invisible when the row hover matches the pip fill).
- **Accent derivatives use relative color syntax.** `rgb(from var(--accent) r g b / 0.1)` gives a true alpha variant of the accent. Avoids the `color-mix(accent N%, transparent)` pitfall where srgb mixing pulls color channels toward black (transparent is `rgba(0,0,0,0)` — mixing accent at 10% with it produces a near-black semi-transparent color, not a gold wash).
- **`color-mix` convention: `modifier <50%, base`.** The base always dominates and goes second. This makes every mix read as "take the base and add a small amount of tint/accent/danger." For strong color states, find a different base rather than flipping percentages (e.g. `--border-danger` mixes danger into border, not the other way around).
- **Active state = color + weight.** Nav items signal active via accent color + one weight-step bump (500 → 600). The character card adds an accent border + accent top divider. Active items get `cursor: default` and suppress hover background changes — clicking the already-active item is a no-op.
- **Identity vs navigation.** The character card's active state uses border + color (emphasizing identity); nav buttons use left accent bar + weight + color (standard navigation). Different element types earn different active patterns.

## Conventions

- **Plain CSS** with native nesting (no Sass/SCSS). All modern browsers support `&` nesting.
- **BEM naming**: Block-Element-Modifier. `nav-bar-btn`, `nav-bar-btn--active`, `nav-bar-build-row`. Use `--` for modifiers, `-` for multi-word blocks/elements.
- **CSS custom properties** for shared values: colors in `index.css` `:root`, component-scoped vars (e.g., `--icon-col`) at the component root.
- **Nesting**: Use native CSS nesting for states (`&:hover`, `&.active`), pseudo-elements (`&::before`), child selectors (`& > svg`), and parent-context overrides (`.app-nav-bar:not(.expanded) &`). Note: `&-suffix` concatenation is NOT supported in native CSS (that's Sass only). Use separate selectors instead.
- **Shared classes** for repeated patterns: e.g., `.nav-bar-collapsible` for all text that hides on collapse.
- **No `!important`**. Fix specificity issues with nesting or more specific selectors.
- **Co-locate CSS** with components: `AppNavBar.css` next to `AppNavBar.tsx`.

## Design Tokens

Defined in `src/index.css` on `:root` (dark) and `:root[data-theme='light']` (light). Only primitives differ between themes — derived tokens auto-resolve.

### Primitives (theme-specific)

| Token | Dark | Light | Role |
|-------|------|-------|------|
| `--bg` | `#18181b` | `#f4f4f5` | Page background |
| `--tint` | `white` | `black` | Contrast direction — color to mix INTO `--bg` for stepped surfaces |
| `--text` | `#fafafa` | `#18181b` | Primary text |
| `--accent` | `#b8962e` | `#8b7335` | Gold by default; overridden at runtime by `theme.ts` when user picks a color |
| `--danger` | `#ef4444` | `#ef4444` | Error/warning red (same in both themes) |

### Text (derived)

| Token | Formula | Role |
|-------|---------|------|
| `--text-secondary` | `color-mix(text 65%, bg)` | Secondary/subtitle text |
| `--text-muted` | `color-mix(text 45%, bg)` | Muted/placeholder text |

### Backgrounds (derived)

Solid tint-based surfaces for structural UI, plus transparent overlays for context-responsive states.

| Token | Formula | Role |
|-------|---------|------|
| `--bg-secondary` | `color-mix(tint 3%, bg)` | Chrome surfaces — nav bar, bottom bar, side panel |
| `--bg-tertiary` | `color-mix(tint 6%, bg)` | Card surfaces, tooltips, modal body |
| `--bg-hover` | `rgb(from tint r g b / 0.10)` | **Transparent.** Hover highlight that lifts ~10% over any bg |
| `--bg-input` | `rgb(from tint r g b / 0.15)` | **Transparent.** Inset elements (inputs, pips) that need to read distinct from any parent bg |
| `--bg-accent` | `color-mix(accent 3%, bg)` | Subtle accent-tinted surface (tracks theme color) |
| `--bg-accent-subtle` | `rgb(from accent r g b / 0.1)` | Active item backgrounds — transparent accent wash |
| `--bg-danger` | `rgb(from danger r g b / 0.1)` | Danger/warning state background |

### Borders (derived)

| Token | Formula | Role |
|-------|---------|------|
| `--border` | `color-mix(tint 17%, bg)` | Default borders |
| `--border-emphasis` | `color-mix(tint 25%, bg)` | Stronger neutral borders |
| `--border-accent` | `color-mix(accent 15%, border)` | Tonal accent-tinted borders |
| `--border-danger` | `color-mix(danger 60%, border)` | Danger state borders |

### Contrast scale

The `--bg-*` and `--border-*` tokens form a consistent 3% step scale from `--bg`:

| Step | Token | Typical use |
|------|-------|-------------|
| 0% | `--bg` | Page |
| 3% | `--bg-secondary` | Chrome |
| 6% | `--bg-tertiary` | Cards, panels |
| 9% | `--bg-hover` (transparent) | Hover |
| 15% | `--bg-input` (transparent) | Insets |
| 17% | `--border` | Default border |
| 25% | `--border-emphasis` | Strong border |

### Type Scale

Tailwind's default scale. Defined in `:root` (theme-independent).

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | 0.75rem (12px) | Caption, microcopy, subtitles, dense labels |
| `--text-sm` | 0.875rem (14px) | Body UI: rows, buttons, card text, nav labels |
| `--text-base` | 1rem (16px) | Emphasized body: modal titles, section text |
| `--text-lg` | 1.125rem (18px) | Nav brand, prominent labels |
| `--text-xl` | 1.25rem (20px) | View titles, section headings |
| `--text-2xl` | 1.5rem (24px) | Display, loading gate |
| `--text-3xl` | 1.875rem (30px) | h1 |

Font weights (400/500/600/700) and letter-spacing stay as raw numbers — only four distinct values, no drift, self-documenting.

### Spacing Scale

Tailwind's default scale (4px base). Defined in `:root` (theme-independent). Used for `padding`, `margin`, and `gap` only — not widths, heights, border-radius, or line-height.

| Token | Value | px |
|-------|-------|----|
| `--space-px` | 1px | 1 |
| `--space-0-5` | 0.125rem | 2 |
| `--space-1` | 0.25rem | 4 |
| `--space-1-5` | 0.375rem | 6 |
| `--space-2` | 0.5rem | 8 |
| `--space-2-5` | 0.625rem | 10 |
| `--space-3` | 0.75rem | 12 |
| `--space-3-5` | 0.875rem | 14 |
| `--space-4` | 1rem | 16 |
| `--space-5` | 1.25rem | 20 |
| `--space-6` | 1.5rem | 24 |
| `--space-7` | 1.75rem | 28 |
| `--space-8` | 2rem | 32 |

Half-step names use a `-5` suffix (`--space-1-5`, `--space-2-5`, `--space-3-5`) because CSS custom properties can't include `.`. For negative margins use `calc(-1 * var(--space-N))`.

### Transition Timing

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | 0.15s | Hover color/background shifts, icon transforms |
| `--transition-std` | 0.3s | Button transitions, tab animations, tooltip fade |

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
