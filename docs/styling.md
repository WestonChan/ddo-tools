# Styling Guide

CSS conventions, design tokens, component recipes, layout architecture, and responsive breakpoints for the DDO Tools frontend. The visual language is the "DDO Tools" design system adopted in D1 (see `docs/roadmap.md`): a ledger for min-maxers, set like a well-typeset rulebook table rather than a fantasy poster.

## Design Principles

- **Warm slate, one accent.** Neutrals are the stone ramp (`--stone-*`, stone-touched, never blue-grey). One accent, aged gold, drives selection, the single primary action per region, and class-tree ink. Arcane blue is the secondary. Never more than one accent hue per screen region.
- **Functional color is an encoding.** Damage types (`--dmg-*`), enhancement trees (`--tree-*`) and augment-socket colors mean the same thing in every chart, pip, dot and tag. There is no rarity-tier color: DDO has no rarity tiers, and "Legendary" in an item name is just part of the name.
- **If it's a number, it's mono.** Anything a player compares — modifiers, DCs, dice, AP, ML, percentages, counts, versions — is JetBrains Mono with tabular figures (`.num` or `font-family: var(--font-mono)`), so columns line up and two builds can be read side by side.
- **Fantasy enters through type, not texture.** IM Fell DW Pica SC (one 400 weight, never faux-bold) is the wordmark only. Headings are bold Source Sans 3. No parchment, no gradients, no imagery, no glows.
- **Borders carry depth; shadow is for things that float.** Surfaces separate by a four-step ladder (`--bg-app` → `--bg-panel` → `--surface-card` → `--surface-raised`, with `--surface-sunken` for input wells) plus a hairline border. `--shadow-popover`, `--shadow-dialog` and `--shadow-drag` are reserved for menus, dialogs and drag ghosts. `--inset-top` puts a 5% highlight on raised chrome; `--inset-sunken` darkens wells.
- **Hover is a wash, press is a nudge.** Hover = `--surface-hover` (a white/black alpha so it works on any surface); elements that already carry a fill use `--surface-card-hover` / `--surface-raised-hover`, and primary buttons brighten instead. Press = 1px downward `translateY`, never a scale. Focus = a 2px `--border-focus` outline inset by 2px (`outline`, not `box-shadow`, so a row's own inset mark never erases it and clipping containers never hide it; `--ring-focus` stays available for elements that are not clipped). Disabled = 42% opacity. Locked things are dimmed, never hidden.
- **Motion is short and flat.** 80/120/180/260ms on `--ease-standard`; color, border and width transitions, plus the two state motions the prototype defines: a toggle knob sliding and a disclosure chevron rotating 90°. No bounce, spring, scale-in or entrance animation. `prefers-reduced-motion` zeroes every duration.
- **No pill shapes.** 3px inside dense grids, 5px is the workhorse, 6px for panels, 8px only for the dialog. Tags, toggles, progress tracks and swatches are square-cornered. Stylelint rejects `999px` and `50%` radii.
- **Active state = fill + mark + color + weight.** A rail row signals active with `--surface-selected`, a 2px `--accent-fill` left mark, `--text-accent` and one weight step (400 → 600). Selected list rows use the same fill with an `inset 2px 0 0 var(--accent-fill)` mark. Active items get `cursor: default` and no hover wash.
- **Accent is a named preset.** Settings offers Gold, Arcane, Moss, Rust and Violet, each an explicit 200–700 ramp from the design (`ACCENT_PRESETS`); `applyAccent` writes the six `--gold-*` steps plus `--accent`, and the `index.html` pre-paint script carries the same table so the first paint is right (a Vitest guard keeps the two in sync). Selection washes, links and fills follow the preset; `--tree-class` stays fixed gold and the damage, tree and augment encodings never change.

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
- **Enforced by Stylelint** (`stylelint.config.mjs`, part of `npm run lint`): a raw color literal may appear only in a custom-property definition; `box-shadow` must be `none`, a `var(--shadow-*|--inset-*|--ring-*|--glow-*)` token, or a `0 0 0 <spread>` ring; `font-family` must be a `var(--font-*)` reference; `border-radius` may not be a pill (`999px`, `9999px`, `100vmax`, `50%`); no comments (`comment-pattern`, directives excepted); no `!important`; no `outline: none` / `outline: 0` / `outline-width: 0` (the allowed suppression is `outline-color: transparent`, in two places only: a non-interactive programmatic focus target such as the modal panel, and an `<input>` inside a well whose wrapper paints the ring on `:focus-within`, because forced-colors mode still paints it); `padding`/`margin`/`gap` take `var(--space-*)`, `0`, `auto` or a `calc()` of those; `letter-spacing` takes `var(--ls-*)`, `0` or `normal`; `font-size` takes `var(--fs-*)`, `inherit` or an `em` value; `border-radius` takes `var(--radius-*)`, `0` or `inherit`; `opacity` takes `0`, `0.42` (disabled and drag sources), `1`, `inherit` or a token. `npm run lint:ignored` fails when a `.gitignore` pattern would swallow a source file.
- **No `!important`.** Fix specificity with nesting.
- **Co-locate CSS** with components (`AppNavBar.css` next to `AppNavBar.tsx`).

## Design Tokens

Defined in `src/index.css`. Primitives are theme-independent; semantic aliases are declared once for dark on `:root` and overridden for light on `:root[data-theme='light']`.

### Primitives

| Ramp | Tokens | Role |
|---|---|---|
| Stone | `--stone-0` … `--stone-950` (0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 750, 800, 850, 900, 950) | Warm-slate neutrals |
| Gold | `--gold-200` … `--gold-700`: the ramp of the chosen accent preset (Gold by default). `applyAccent` and the pre-paint script write all six steps and `--accent` (= the 400 step) from `ACCENT_PRESETS` in `src/lib/accent.ts` | Accent |
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
| `--font-wordmark` | IM Fell DW Pica SC (the "DDO TOOLS" wordmark only, weight 400) |
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
| `--shadow-popover` | Menus, hover cards, hints, popovers |
| `--shadow-dialog` | Modal dialog |
| `--shadow-drag` | Drag ghosts |
| `--inset-top` | Raised chrome highlight (character card, table header strip) |
| `--inset-sunken` | Input wells, segmented-control tracks |
| `--glow-accent` | Accent ring + soft glow for the one element that must attract the eye |
| `--ring-focus` | Opt-in box-shadow ring for elements no container clips; the default focus style is the 2px inset `outline` |

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
| `--z-modal` | 100 | Dialogs, drawers, popovers; hover cards stack above it by depth |

## Component recipes

Shared classes in `src/index.css`; shared components in `src/components/`.

- **Eyebrow** (`.section-label`): `--fs-micro`, 600, `--ls-eyebrow`, uppercase, `--text-faint`, no margins of its own. The one class for section labels, card headers, table headers, menu group labels and rail group headings; consumers add spacing, never a second eyebrow style.
- **Card** (`.card` / `.card-header`): `--surface-card`, 1px `--border-hairline`, `--radius-sm`. The optional header strip is `--surface-raised` + `--inset-top` + an eyebrow over a `--border-default` bottom edge. The landing patch-notes cards, the Characters cards and the Resources list card compose these classes.
- **Buttons**: `.btn-primary` (`--accent-fill` / `--accent-on`, 600, height `--control-h`, radius sm; hover brightens, press nudges 1px), `.btn-ghost` (`--surface-raised`, `--border-default`, `--text-body`; hover `--surface-raised-hover`). `-sm` variants are `--control-h-sm`.
- **Popover** (`AnchoredMenu`): `--surface-raised`, `--border-strong`, `--shadow-popover`, radius sm, 4px padding, 1px row gap; rows 12.5px with `--surface-hover` on hover and `--surface-selected` + `--text-accent` when selected; closes on outside click and Escape.
- **Underline tabs** (`.underline-tabs`): 32px, `--fs-body-sm`, `--text-muted`; active = `--text-heading`, 600, 2px `--accent-fill` underline on a `--border-default` baseline.
- **Segmented control** (`.segmented-control` / `.segmented-control-segment` / `--active`): `--surface-sunken` track with `--border-default`, `--inset-sunken` and 2px padding; active segment `--surface-raised` + `--text-heading`, others `--text-faint`. Used by the stats-panel tabs. The `--joined` modifier (no track padding, hairline between `--control-h-sm` segments, no inset shadow) is the Settings theme control.
- **Brand mark**: `GitHubMark` is the one inline SVG in `src/components/`, because lucide ships no brand icons. It fills with `currentColor` and takes `size` like a lucide icon.
- **Filter chip** (`.filter-chip` / `--selected`): 26px, radius xs, `--surface-card` + `--border-hairline` + `--text-muted`; open = `--surface-raised`, `--border-strong`, `--text-heading`; selected = `--surface-selected`, `--border-accent`, `--text-accent`. A chip keeps the width of its label and its text starts at the left: a set chip keeps its label and shows the selection count as a 15px accent badge at its top-right corner (mono, `--text-inverse`, a 2px ring of the panel background), "1" for a single-value chip; the ML chip shows its range ("20–32", "≥ 20") in the label's width; the values themselves live in the applied row and the chip's `data-tip`; unset chips end with a chevron, set chips with an 18px × that clears them; each carries a `data-tip` with its full state. Labels: "ML range", "Gear slot", "Enchantments", "Pack", "Raid", "Rare only", "Raid only". Used by the Resources filter row (`features/resources/filters/FilterChipRow`) and the clicky-item picker.
- **Filter row** (`FilterChipRow`): chips in groups ([ML, Gear slot, Enchantments], [Pack, Raid], [Rare only, Raid only]; 6px within, 14px between) under the search well, wrapping at narrow widths, with a 26px link-coloured "Clear filters" at the end when anything is active; a 12px faint "Show applied · N" toggle line; the applied block under a dashed hairline with eyebrow group labels (`--fs-micro`, `--ls-eyebrow`) ("ML", "Gear slot", "Enchantments", "Pack", "Raid", and "Show" for the toggles; the ML range is one pill) and 22px accent pills (× inside); then the count, right-aligned mono `--fs-label` faint with no thousands separator ("8077 results"). The empty state is a centred 14px muted line with a small ghost "Clear filters" button. Each chip opens its picker in an `AnchoredMenu`; Escape and a second click close it and return focus to the chip.
- **Combobox** (`Combobox`): the one searchable picker, single or multi. 268px on `--surface-raised`, `--border-default`, radius `--radius-sm` (the design's 5px), `--shadow-popover`; a search field in an 8px block over a hairline (28px, sunken, `--border-focus`); 28px option rows (`padding: 0 10px 0 12px`, 13px) with a 14px check square (accent fill when selected, sunken with `--border-strong` otherwise); the highlighted row is `--surface-active` with a 2px gold inset bar; an optional faint 11px caption after the label. Opening a multi picker snapshots its selection: those options come first in their normal order and keep their rows while the popover is open, with a `--border-hairline` divider (3px padding and margin) under the last of them when unselected options follow; the search filters both groups. No footer; an `extraControl` slot for a checkbox such as "Include set bonuses". Roles: combobox on the input, listbox and option on the list.
- **Ledger row** (stats panel, enchantments): 24–26px, hairline bottom border, label `--text-muted`, value mono `--text-body`, bonus type 11px `--text-faint` right-aligned.
- **Table header strip**: `--surface-raised`, `--inset-top`, eyebrow labels, `--border-default` bottom (the clicky-item picker).
- **Ledger table** (`LedgerTable`, the Resources list and the detail's enchantment table): no card; a `--border-strong` rule above and below, a header row of eyebrows closed by a `3px double var(--border-strong)` rule, rows 32px (30px `dense`) with `1px dotted var(--border-default)` dividers, selected row `--surface-selected` + `--inset-mark-accent`, highlighted rows (a filter match) tinted. Headers sort on click (each column names its first direction; numeric columns descend first; a column with `isSortable: false`, such as Raid and Rare whose fields the API cannot order by, is static text with no button or `aria-sort`), drag to reorder (`@dnd-kit`: pressing anywhere on the header cell and moving past the activation distance drags it, a plain click sorts, and a separate focusable "Move X" button, `.sr-only` until it has keyboard focus, carries the keyboard reorder path so Enter on the sort button never drags; pointer users see no handle), and resize by the full-height grip at the cell's left edge (14px hit area, 1px × 14px visual, never starts a reorder); columns can hide below a width (`hiddenBelowPx`). The body is virtualized (react-window) for long lists or plain for short ones; a virtualized body takes `onNearEnd` and calls it once per approach to the loaded end, which is how the Resources list pages; heading rows (`rowKind` 'heading') and subheading rows ('subheading', the eyebrow kind) group what follows them and stay put under sorting. The detail's set block uses them in the design's banded style: a heading band on `--bg-panel` (34px, `padding: 10px 8px 5px`, 10px above, `--border-default` below, radius 3px 3px 0 0) with the set name as a link and a far-right "Set" eyebrow, 24px tier eyebrow rows ("2 pieces"), and the tier's bonus rows on the band; no description text in the ledger (it lives in the set hover card). Keyboard: the scrolling body is the one tab stop (native PageDown and arrows scroll it); row navigation is opt-in through `navigationInputRef`: while that input (the Resources search) has focus, ArrowDown and ArrowUp move a highlighted row (clamped at the ends), Home and End jump, Enter opens it like a click and leaves the search (focus lands on the row, or on the detail heading when the detail replaced the list), and Escape first drops the highlight, then clears the text. The highlight is `--surface-active` with the 2px gold inset bar, distinct from the selected row; the input names the body in `aria-controls` and the highlighted row in `aria-activedescendant`. With focus anywhere else, arrow keys leave the list alone.
- **Hover card** (`HoverCardProvider` in the shell, `useHoverCard` on an anchor, `HintAnchor` or `data-tip` for hints): 300px on `--surface-raised`, `--border-default` (→ `--border-accent` when pinned), `--shadow-popover`, max-height 70vh, stacked at `--z-modal` plus depth. Header: an eyebrow kicker and "T to pin" (pinned: "Pinned · Esc"); then a 15px/700 title, facts, value rows (`DetailValueRow`: a label, a mono number or dice expression in the accent hue, an optional bonus type as plain `--text-muted` text (an augment card still shows it as a hued tag); "From <item>" for the hovered source's own bonus, "Damage" for dice and damage from structured modifier fields; never parsed out of description text), a definition, sections whose rows open nested cards one depth deeper and open an item when they name one, "+N more", a footer. 260ms to open from a row, 120ms from a row inside a card; an unpinned card ignores the pointer, closes only when the pointer leaves its anchor or the anchor unmounts, and survives clicks elsewhere; `T` pins the top card, `Esc` pops it, a mousedown inside a card (each carries `data-depth`) closes every card deeper than it and keeps that card and its ancestors as they were, and a mousedown outside every card clears the pinned cards. Placed below the anchor, above when there is no room, clamped to the viewport. Hints are 260px max, never pinned, never consume Escape.
- **Detail card** (`DetailCard`, `DetailCardHeader`, `DetailFact`, `DetailCardSection`, `DetailMore`, `DetailCardFooter`): the shell both the Resources detail pane and the item hover card render into. Header strip (the raised title bar) with kicker, 18px name, a row of controls and, under the name, the wrapping facts row (`gap: 10px 28px`: ML, Gear slot, Raid, Rare, Set, and on an item the Augments sockets last); then the body. An open socket's ledger of fitting augments is a full-width block that is the title bar's next sibling, above the description, so the title bar never reflows; then the description, the detail stats (`DetailStats`: the important ones as fact cells in a `repeat(auto-fill, minmax(132px, 1fr))` grid, each an 11px uppercase `--text-faint` eyebrow over a mono `--text-numeric` number or 13px body text; a weapon shows Damage, Crit range, Crit multiplier and Enhancement, armor and shields their bonus, Max Dex and Enhancement), the rest as 24px tags behind "More … details" (label part on `--surface-raised` at `--fs-detail-tag-label`, value part beside it, `--border-default` outline, radius 3; damage-reduction bypasses are one "Bypasses" tag each), the enchantment ledger and the sections with an 11px eyebrow. The pane variant paints no border, background or radius of its own: the pane (`.resources-detail-pane`) is the one card around it, while the hover variant keeps the card chrome. The Resources item card adds augment slots as hex gems (`clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)`; Blue `--arcane-400`, Red `--rust-400`, Yellow `--amber-400`, Green `--moss-400`, Purple `--violet-400`, Colorless bordered). Enchantment bonus types are plain `--text-muted` text in the pane and the item hover card; only the augment hover card keeps the hued type tags (Insight `--arcane-300`, Quality `--moss-400`, Artifact `--violet-400`, Exceptional `--amber-400`).
- **List and detail** (`.resources-body`, the Resources page): `display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr)); gap: var(--space-3); align-items: start`, so the list column and the detail pane sit side by side when the content area has room for two 480px columns; nothing is modal. The pane shows the detail card, or a dashed "Select an item" placeholder with no selection. Below that width a selected item's pane takes the list's place, full width and in flow: selecting a row pushes a history entry, so the breadcrumb's Back and the browser's Back both restore the list with its filters and scroll offset; the card's header stacks its actions under the name below 600px.
- **Visually hidden** (`.sr-only`): the one way to keep text for assistive tech only (1px box, `clip-path: inset(50%)`); never `display: none` for text a description or label points at.
- **Drag and drop** (`@dnd-kit`): grip handle `GripVertical` 12px `--text-faint` with `cursor: grab` on a real button; drop target `--border-accent` or the `--inset-drop-line` mark above the hovered row; the source dims to 42% while dragging; the `DragOverlay` ghost carries `--shadow-drag`. Pointer and keyboard sensors both work; pin buttons remain the non-drag path. Every container that can receive a drop is a droppable (group, tray, section), so only a release over the opposite half unpins a stat or clears a slot, and that outcome is announced.
- **Search well** (`.search-well`): `--control-h`, `--surface-sunken`, `--border-default`, `--inset-sunken`, `search` glyph, shortcut hint in mono ("/" focuses the Resources search from anywhere outside a text field while the list is on screen, including beside an open detail); the wrapper paints the focus ring on `:focus-within` and the input's own outline is transparent.
- **Page** (`.page`): 24px padding, `max-width: var(--content-max)`, centered. `PageSection` gives a titled, anchorable section; `WireframePlaceholder` is the dashed block used by views whose phase has not shipped.

## Recorded decisions

Reasoning that used to live in CSS comments (the repo bans comments; Stylelint's `comment-pattern` rule enforces it in CSS). Each entry names the rule it explains.

- **Modal panel is `position: fixed`** (`Modal.css`): positions against the viewport so size and placement are independent of the rail state and container width, escapes `.app-content`'s `overflow: auto` clipping, and stacks in the root context so `--z-modal` reliably beats the rail's `--z-nav`. Every rule in `Modal.css` is a single flat class so a consumer stylesheet loaded after it can override at equal specificity through the `className` prop. Width is deliberately unset; consumers size themselves. The backdrop is a real `<button>` so assistive tech can activate dismissal, while Tab stays trapped inside the panel.
- **The Resources drawer is gone (4d)**: item detail renders in the page beside the list (see "List and detail" above). `Modal` keeps only its centered variant.
- **`ErrorCard` has a `min-height`**: it replaces a variable-height entry whose height is unknown, so the floor prevents layout shift.
- **`ConfirmModal` message uses `white-space: pre-line`**: callers compose multi-paragraph messages with `\n` (the Characters apply-build warning list); collapsed whitespace ran them into one wall of text.
- **`WikiLinkIcon` rests low-key** and picks up the accent on hover, so a list of rows isn't dominated by repeated link affordances.
- **Resources key-value rows are one grid** with subgrid rows so values left-align under a consistent column edge; a flex `space-between` floated them to the container's right edge and read as a ragged column.
- **Augment gems are sized in `em`** (0.7em side, about 1em corner-to-corner after the 45° rotation) so the gem matches the cap height of the label beside it. **Sun and Moon** are Isle of Dread's day/night sockets: Sun is a warmer, paler gold than the yellow socket so the two never read as the same gem; Moon is the silver-blue of the in-game icon. Every socket is a button: clicking it opens, under the socket row, a plain `LedgerTable` of the augments that fit it (Name, ML, Slots; `/v1/augments?slot=` already answers "fits this socket", so a red socket lists red, colourless and multi-colour augments), each row with an augment hover card; there is no selection, and opening another socket closes the first.
- **Selected picker row is color plus a tinted surface**, keyed off `.active`, the same class that opts the row out of `.hoverable`'s hover wash, so one hook drives both halves of the state. Keyboard focus is the global inset outline, which the react-window shell's fixed bounds cannot clip. That shell carries only the `position`/`top`/`left`/`height`/`width` react-window injects; the button inside owns every visual.
- **Wiki access is the compare-window icon in the entity header**: the embedded preview died with ddowiki's bot protection (see `docs/ddowiki-api.md`).
- **Past-life pip states** (`CharacterView.css`): current life has the stack from history → muted hatch (visible when viewing a different life); current life has it from overrides → muted filled; character has it from history but the build doesn't need it → muted hatch (mirrors the locked style); character has it from overrides but the build doesn't need it → muted solid; build needs it but the character doesn't have it yet → red border.

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
- **Stats panel** (`StatsPanel`): 300px, shown on routes whose `staticData.shouldShowStatsPanel` is true (`/build-plan`, `/overview`, `/gear`). Stats / Buffs tabs; Stats holds drag-and-drop pinned groups over a divider, then All stats.
- **There is no bottom bar.** Warnings and bug reporting live in the rail.
- Only the content column scrolls; the rail and stats panel scroll independently.
- Below 900px the stats panel is not rendered at all (`AppLayout` applies `app--no-stats` from `useMediaQuery('(max-width: 899px)')`); Phase 6 adds a collapsed toggle strip in its place.

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
