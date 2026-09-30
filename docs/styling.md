# Styling Guide

CSS conventions, design tokens, component recipes, layout architecture, and responsive breakpoints for the DDO Tools frontend. The visual language is the "DDO Tools" design system adopted in D1 (see `docs/roadmap.md`): a ledger for min-maxers, set like a well-typeset rulebook table rather than a fantasy poster.

## Design Principles

- **Warm slate, one accent.** Neutrals are the stone ramp (`--stone-*`, stone-touched, never blue-grey). One accent, aged gold, drives selection, the single primary action per region, and class-tree ink. Arcane blue is the secondary. Never more than one accent hue per screen region.
- **Functional color is an encoding.** Damage types (`--dmg-*`), enhancement trees (`--tree-*`) and augment-socket colors mean the same thing in every chart, pip, dot and tag. There is no rarity-tier color: DDO has no rarity tiers, and "Legendary" in an item name is just part of the name.
- **If it's a number, it's mono.** Anything a player compares — modifiers, DCs, dice, AP, ML, percentages, counts, versions — is JetBrains Mono with tabular figures (`.num` or `font-family: var(--font-mono)`), so columns line up and two builds can be read side by side.
- **Fantasy enters through type, not texture.** Cinzel is the wordmark only. Headings are bold Source Sans 3. No parchment, no gradients, no imagery, no glows.
- **Borders carry depth; shadow is for things that float.** Surfaces separate by a four-step ladder (`--bg-app` → `--bg-panel` → `--surface-card` → `--surface-raised`, with `--surface-sunken` for input wells) plus a hairline border. `--shadow-popover`, `--shadow-dialog` and `--shadow-drag` are reserved for menus, dialogs and drag ghosts. `--inset-top` puts a 5% highlight on raised chrome; `--inset-sunken` darkens wells.
- **Hover is a wash, press is a nudge.** Hover = `--surface-hover` (a white/black alpha so it works on any surface; primary buttons brighten instead). Press = 1px downward `translateY`, never a scale. Focus = `--ring-focus`. Disabled = 42% opacity. Locked things are dimmed, never hidden.
- **Motion is short and flat.** 80/120/180/260ms on `--ease-standard`; color, border and width transitions only. No bounce, spring, scale-in or entrance animation. `prefers-reduced-motion` zeroes every duration.
- **No pill shapes.** 3px inside dense grids, 5px is the workhorse, 6px for panels, 8px only for the dialog. Tags, toggles, progress tracks and swatches are square-cornered. Stylelint rejects `999px` and `50%` radii.
- **Active state = fill + mark + color + weight.** A rail row signals active with `--surface-selected`, a 2px `--accent-fill` left mark, `--text-accent` and one weight step (400 → 600). Selected list rows use the same fill with an `inset 2px 0 0 var(--accent-fill)` mark. Active items get `cursor: default` and no hover wash.
- **Accent stays user-configurable.** `--accent` is the one primitive Settings can change (pre-paint script in `index.html`, `applyAccent` in `src/lib/accent.ts`). The gold ramp derives from it in oklch, so every preset re-tints selection, links and fills consistently.

## Copy

- Sentence case for everything readable: headings, buttons, labels, rail rows ("Build plan", "Damage calc"). UPPERCASE only for 11–12px eyebrows.
- Second person for consequences; the app never says "we" or "let's".
- Numbers are exact, mono, with the unit as a suffix (`62 / 80 AP`, `DC 58`). Deltas are signed and colored, never worded.
- Middot separates facts (`Sorcerer 20 · Elf`); em dash marks an empty cell; en dash in ranges (`12–20`). No emoji.

## Icons

Use `lucide-react` for all icons. Pass the `size` prop (16 in rail rows and buttons, 12–14 inline, 18–20 for tab bars and empty states) — never CSS `width`/`height`. Icons inherit `currentColor`; control their color on the parent. The only colored icons are encodings (a damage-type glyph in its `--dmg-*`, a tree glyph in its `--tree-*`).

## Conventions

- **Plain CSS** with native nesting (no Sass). `&-suffix` concatenation is not supported natively; write separate selectors.
- **BEM naming**: `nav-bar-btn`, `nav-bar-btn--active`, `stats-panel-row`. `--` for modifiers, `-` for multi-word blocks and elements.
- **Tokens only.** Colors, fonts, radii, shadows and durations come from `src/index.css`; component-scoped custom properties (`--icon-col`) live at the component root.
- **Enforced by Stylelint** (`stylelint.config.mjs`, part of `npm run lint`): a raw color literal may appear only in a custom-property definition; `box-shadow` must be `none`, a `var(--shadow-*|--inset-*|--ring-*|--glow-*)` token, or a `0 0 0 <spread>` ring; `font-family` must be a `var(--font-*)` reference; `border-radius` may not be a pill (`999px`, `9999px`, `100vmax`, `50%`).
- **No `!important`.** Fix specificity with nesting.
- **Co-locate CSS** with components (`AppNavBar.css` next to `AppNavBar.tsx`).

## Design Tokens

Defined in `src/index.css`. Primitives are theme-independent; semantic aliases are declared once for dark on `:root` and overridden for light on `:root[data-theme='light']`.

### Primitives

| Ramp | Tokens | Role |
|---|---|---|
| Stone | `--stone-0` … `--stone-950` (0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 750, 800, 850, 900, 950) | Warm-slate neutrals |
| Gold | `--gold-100` … `--gold-700`, derived from `--accent` (`--gold-400` is `--accent` itself; lighter steps mix toward white, darker toward black, in oklch) | Accent |
| Arcane | `--arcane-100` … `--arcane-700` | Secondary (comparison build, info) |
| Moss / Amber / Rust / Violet | `--moss-400/500/600`, `--amber-400/500/600`, `--rust-400/500/600`, `--violet-400/500` | Semantic hues |
| Damage | `--dmg-physical`, `-fire`, `-cold`, `-electric`, `-acid`, `-sonic`, `-force`, `-light`, `-negative`, `-poison` | Encodings |
| Trees | `--tree-class` (gold), `--tree-racial` (moss), `--tree-universal` (arcane), `--tree-destiny` (violet) | Encodings |

### Semantic aliases

| Group | Tokens |
|---|---|
| Surfaces | `--bg-app`, `--bg-panel`, `--surface-card`, `--surface-raised`, `--surface-sunken`, `--surface-hover`, `--surface-active`, `--surface-selected`, `--scrim` |
| Text | `--text-heading`, `--text-body`, `--text-muted`, `--text-faint`, `--text-inverse`, `--text-accent`, `--text-link`, `--text-link-hover`, `--text-numeric` |
| Borders | `--border-hairline` (10%), `--border-default` (16%), `--border-strong` (28%), `--border-accent`, `--border-focus` |
| Accent | `--accent-fill`, `--accent-fill-hover`, `--accent-fill-active`, `--accent-on` (text on a gold fill), `--accent-quiet` (14% wash) |
| Secondary | `--secondary-fill`, `--secondary-quiet` |
| Status | `--status-ok`, `--status-warn`, `--status-error`, `--status-info`, each with a `-quiet` wash |

Rules of thumb: page background is `--bg-app`; the rail, stats panel and drawers are `--bg-panel`; cards are `--surface-card` with `--border-hairline`; controls on a card and popovers are `--surface-raised`; inputs and segmented-control tracks are `--surface-sunken`. Body copy is `--text-body`, secondary facts `--text-muted`, eyebrows and hints `--text-faint`, names and titles `--text-heading`.

### Fonts and type

| Token | Value |
|---|---|
| `--font-wordmark` | Cinzel (the "DDO TOOLS" wordmark only) |
| `--font-ui` | Source Sans 3 — all UI, prose and headings (`--font-display` aliases it) |
| `--font-mono` | JetBrains Mono — every compared number |

Fonts load from Google Fonts via the `<link>` in `index.html`.

| Size token | px | Use |
|---|---|---|
| `--fs-micro` | 11 | Eyebrows, table headers, hints |
| `--fs-label` | 12 | Captions, secondary facts, dense labels |
| `--fs-body-sm` | 13 | Rail rows, list rows, chips, buttons |
| `--fs-body` | 14 | Body copy |
| `--fs-h3` | 16 | Section titles, card titles |
| `--fs-h2` | 20 | View titles |
| `--fs-h1` | 26 | Page headings |
| `--fs-display` | 34 | Display |
| `--fs-stat`, `--fs-stat-lg` | 18, 30 | Mono stat callouts |

Line heights `--lh-tight/heading/body/dense`, letter-spacing `--ls-wordmark/eyebrow/heading/body/numeric`, weights `--fw-regular/medium/semibold/bold`, and composed roles `--type-wordmark/display/h1/h2/h3/body/label/eyebrow/numeric/stat` (use as `font: var(--type-body)`).

### Spacing

4px base. Used for `padding`, `margin` and `gap` only.

| Token | px |
|---|---|
| `--space-px` | 1 |
| `--space-0-5` | 2 |
| `--space-1` | 4 |
| `--space-1-5` | 6 |
| `--space-2` | 8 |
| `--space-2-5` | 10 |
| `--space-3` | 12 |
| `--space-3-5` | 14 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-7` | 28 |
| `--space-8` | 32 |

Dense grids and tables use 6/8/10; page chrome uses 16/20/24. Never invent an in-between value.

### Chrome sizes

| Token | Value |
|---|---|
| `--sidebar-w` / `--sidebar-collapsed-w` | 236px / 56px |
| `--inspector-w` | 300px (stats panel) |
| `--content-max` | 1240px |
| `--control-h-sm` / `--control-h` / `--control-h-lg` | 26px / 32px / 38px |
| `--tap-target` | 44px |

### Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 3px | Pips, chips, tags, toggles, swatches, inset row marks |
| `--radius-sm` | 5px | The workhorse: buttons, inputs, cards, popovers, tiles |
| `--radius-md` | 6px | Panels |
| `--radius-lg` | 8px | Dialog only |

### Elevation

| Token | Use |
|---|---|
| `--shadow-hairline` | 1px hairline ring |
| `--shadow-popover` | Menus, tooltips, popovers |
| `--shadow-dialog` | Modal dialog |
| `--shadow-drag` | Drag ghosts |
| `--inset-top` | Raised chrome highlight (character card, table header strip) |
| `--inset-sunken` | Input wells, segmented-control tracks |
| `--glow-accent` | Accent ring + soft glow for the one element that must attract the eye |
| `--ring-focus` | `:focus-visible` |

### Motion

| Token | Value |
|---|---|
| `--dur-instant` / `--dur-fast` / `--dur-base` / `--dur-slow` | 80 / 120 / 180 / 260ms |
| `--ease-standard` / `--ease-out` / `--ease-in` | flat cubic-beziers |
| `--transition-control` | background, border-color and color at `--dur-fast` |

### Stacking (z-index)

| Token | Value | Usage |
|---|---|---|
| `--z-local` | 1 | Positional offsets within a component |
| `--z-panel` | 10 | Stats panel |
| `--z-nav` | 20 | Rail |
| `--z-overlay` | 40 | Mobile fullscreen rail, modal backdrops |
| `--z-modal` | 100 | Dialogs, drawers, popovers, tooltips |

## Component recipes

Shared classes in `src/index.css`; shared components in `src/components/`.

- **Eyebrow** (`.section-label`): 11px, 600, `.08em`, uppercase, `--text-faint`. The one class for section labels, table headers and rail group headings.
- **Card**: `--surface-card`, 1px `--border-hairline`, `--radius-sm`, padding 12–14px. Optional header strip: `--surface-raised` + `--inset-top` + eyebrow.
- **Buttons**: `.btn-primary` (`--accent-fill` / `--accent-on`, 600, height 30, radius sm; hover brightens, press nudges 1px), `.btn-ghost` (`--surface-raised`, `--border-default`, `--text-body`). `-sm` variants are 26px.
- **Popover** (`AnchoredMenu`): `--surface-raised`, `--border-strong`, `--shadow-popover`, radius sm, 4px padding, 1px row gap; rows 12.5px with `--surface-hover` on hover and `--surface-selected` + `--text-accent` when selected; closes on outside click and Escape.
- **Underline tabs** (`.underline-tabs`): 32px, 13.5px, `--text-muted`; active = `--text-heading`, 600, 2px `--accent-fill` underline on a `--border-default` baseline.
- **Segmented control**: `--surface-sunken` track with `--border-default` and 2px padding; active segment `--surface-raised` + `--text-heading`, others `--text-faint`.
- **Filter chip**: 26px, radius xs, `--surface-card` + `--border-hairline`; selected = `--surface-selected`, `--border-accent`, `--text-accent`.
- **Ledger row** (stats panel, enchantments): 24–26px, hairline bottom border, label `--text-muted`, value mono `--text-body`, bonus type 11px `--text-faint` right-aligned.
- **Table header strip**: `--surface-raised`, `--inset-top`, eyebrow labels, `--border-default` bottom.
- **Search well**: 30px, `--surface-sunken`, `--border-default`, `--inset-sunken`, `search` glyph, shortcut hint in mono.
- **Page** (`.page`): 24px padding, `max-width: var(--content-max)`, centered. `PageSection` gives a titled, anchorable section; `WireframePlaceholder` is the dashed block used by views whose phase has not shipped.

## Layout Architecture

```
.app-shell (flex column, 100vh)
  .app (CSS grid: rail | content | stats panel)
```

Grid columns are controlled by JS-toggled classes on `.app`:

| Class | Grid columns |
|---|---|
| (default) | `var(--sidebar-w) 1fr var(--inspector-w)` |
| `.app--nav-bar-collapsed` | `var(--sidebar-collapsed-w) 1fr var(--inspector-w)` |
| `.app--no-stats` | `var(--sidebar-w) 1fr` |
| `.app--nav-bar-collapsed.app--no-stats` | `var(--sidebar-collapsed-w) 1fr` |

- **Rail** (`AppNavBar`): 236px expanded, 56px collapsed. Top to bottom: wordmark, character card (switcher, compare picker, swap), Roster / Build / Tools groups (Build plan sub-items appear only on `/build-plan`), spacer, Warnings row with popover, Collapse, hairline, Settings, Report a bug, GitHub. Eyebrows collapse to hairlines.
- **Stats panel** (`StatsPanel`): 300px, shown on routes whose `staticData.showStatsPanel` is true (`/build-plan`, `/overview`, `/gear`). Pinned / All stats / Buffs tabs.
- **There is no bottom bar.** Warnings and bug reporting live in the rail.
- Only the content column scrolls; the rail and stats panel scroll independently.

## Responsive Breakpoints

The rail is always in the grid flow (never fixed-position) except at `<600px` when expanded.

| Width | Rail default | Expanded behavior | Notes |
|---|---|---|---|
| **>=900px** | Stored preference (localStorage) | Inline, pushes content (236px) | Desktop layout |
| **600–899px** | Auto-collapsed (icons only, 56px) | Inline, pushes content (236px) | Re-expands when resizing back above 900px |
| **<600px** | Auto-collapsed (icons only, 56px) | **Full-screen overlay** (`position: fixed; inset: 0`) | Behaves as a modal: closes on navigate or Escape, background goes `inert` |

Key rules:
- **No media queries in App.css** — grid columns are controlled by JS-toggled classes.
- **One media query in AppNavBar.css** — `@media (max-width: 599px)` makes `.app-nav-bar.expanded` full-viewport. `AppLayout` mirrors the same query in JS (`useMediaQuery('(max-width: 599px)')`); the two must move together.
- **One media query in Modal.css** — `@media (max-width: 899px)` makes the `drawer-right` variant full-screen and hides its backdrop.
- Auto-collapse/restore is handled by a resize listener in `AppLayout.tsx` that tracks the 900px threshold crossing.
