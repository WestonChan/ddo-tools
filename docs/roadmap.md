# Frontend: Layout & Feature Architecture

## Context

The DB has 78 tables, 7,249 items, 810 feats, 3,146 enhancements, 480 spells, 25 classes, 29 races. This document defines the overall UI structure, navigation, and feature modules, and is the single source of truth for what ships and when.

**Where to start**: the **Phase status** table under `## Implementation Order` names the one phase that is next. Read that first — the sections above it are feature specs, not work orders.

---

## Layout Architecture

```
+-------------------+---------------------+---+
| [Weston: Pal 20 v]                      | S |
|-------------------|                     | t |
| [Build Overview]  |  Main Content       | a |
| v BUILD PLAN      |  (single scrollable | t |
|   [Classes/Feats] |   page for Build    | s |
|   [Skills]        |   Plan; separate    |   |
|   [Spells]        |   pages for Gear,   | P |
|   [Enhancements]  |   Overview, Debug)  | a |
|   [Reaper]        |                     | n |
|   [Destinies]     |                     | e |
| [Gear]            |                     |   |
|                   |                     |   |
| ---               |                     |   |
| v TOOLS           |                     |   |
| [Damage Calc]     |                     |   |
| [Farm Checklist]  |                     |   |
| v [Debug]         |                     |   |
|   [Items]         |                     |   |
|   [Spells]        |                     |   |
|   [Enhancements]  |                     |   |
|   [Feats]         |                     |   |
|   [Augments]      |                     |   |
|   [Sets]          |                     |   |
|                   |                     |   |
| [Settings]        |                     |   |
+-------------------+---------------------+---+
| [!] 3 warnings              (click to expand)|
+-----------------------------------------------+

Comparing active:
+-------------------+
| [Weston: Pal 20 v]
| vs Wizard TR [sw][x]
|-------------------|
| [Build Overview]  |
| v BUILD PLAN      |
| [Gear]            |
| v TOOLS           |
|   ...             |
```

**Key design decisions:**
- Nav bar is feature navigation: Build Overview, Build Plan (collapsible: classes/feats, skills, spells, enhancements, reaper, destinies), Gear, TOOLS (collapsible: Damage Calc, Farm Checklist, Debug), Settings
- **Nav bar top**: `[Weston: Pal 20 v]` dropdown for Manage Characters/Builds and Manage Gear Sets. Comparison is entered from the Characters view (click a second build) -- no picker lives in the nav bar.
- **Compare active**: Second line appears `vs Wizard TR [swap][x]`. `[swap]` flips primary/comparison. `[x]` deactivates.
- **Bottom bar**: Build warning indicator. Collapsed: `[!] 3 warnings`. Expands to show details with clickable links to the relevant feature (e.g., "2 feat slots empty (L6, L12) [Levels]"). Zero warnings: hides or shows checkmark.
- **No horizontal tab bar** -- nav bar IS the tab bar, giving full height to content.
- Clean URL routing via `@tanstack/react-router`: `/ddo-tools/characters`, `/overview`, `/build-plan`, `/gear`, `/damage-calc`, `/farm-checklist`, `/resources/$category/$id`, `/settings`. GitHub Pages SPA support via `404.html` redirect.

### Tech Stack
- React 19 + TypeScript + Vite (keep existing)
- **Zustand** -- in-memory state management. Stores are hydrated from `user.db` on load. Mutations write through to `user.db`.
- **@tanstack/react-router** -- typed route tree. Replaced the hand-rolled `useRouter` hook in Phase 1d. URLs like `/ddo-tools/build-plan`; `basePath: '/ddo-tools'` plus a `404.html` redirect for GitHub Pages SPA support. Use `scrollIntoView()` for Build Plan section navigation.
- **@dnd-kit/sortable** -- drag/drop for sortable lists (pinned stats, spell order). Handles touch, keyboard, and accessibility.
- **Base UI** (@base-ui/react) -- headless UI primitives for new components (spell picker, enhancement tooltips, gear popovers). Adopt incrementally; don't migrate existing working components.
- **react-window** -- virtual scrolling for large lists (7K+ items, 800+ feats)
- **sql.js** -- in-browser SQLite for both game data (`ddo.db`, read-only) and user data (`user.db`, read/write). Run in **Web Worker** mode to avoid blocking the UI thread during gear search queries.
- CSS modules + CSS variables (keep existing, no Tailwind)
- **Settings** includes:
  - Theme (dark/light) + accent color (existing)
  - **Owned content**: Toggle which adventure packs, races, classes you own. Affects available items (filtered by `quest_loot` -> `adventure_packs`), races (`race_type`: free/premium/iconic), and classes. Defaults to "all content" so nothing is hidden unless the user restricts it. Stored in `user.db`.

### Interaction Conventions
- **Rank-based controls** (enhancements, skills, reaper, destinies): Left-click to add/increment, right-click to remove/decrement (DDO in-game pattern). Shift+click as keyboard alternative for right-click.
- **Selection controls** (spells, gear, buffs): Toggle via click. `[x]` = selected (click to remove), `[+]` = available (click to add).
- **Sortable lists** (pinned stats, spell order): Drag via @dnd-kit/sortable. Arrow-key reorder for keyboard users.
- **Minimum touch targets**: 44x44px bounding box for all interactive elements (enhancement nodes, skill cells, etc.).
- **Tooltips**: Trigger on hover AND focus (not just hover). Base UI handles this for new components.

### Loading, Error, and Empty States

**Loading:**
- **DB initialization**: Full-page skeleton UI with progress indicator while `ddo.db` and `user.db` load via sql.js. Feature views do not render until both DBs are ready (loading gate).
- **Search queries**: Inline spinner after 150ms debounce. No full-page loading for searches.
- **Wiki preview** (Debug view): Placeholder "Loading preview..." with skeleton.

**Error:**
- **DB load failure** (WASM not supported, fetch fails): Full-page error with retry button and browser compatibility note.
- **Wiki fetch failure**: Inline "Preview unavailable" with retry link. Does not block the rest of the detail view.
- **user.db persistence failure**: Warning banner "Changes may not be saved" with option to export user.db manually.
- **404 / unknown route**: Full-page "Page not found" with link back to build plan. Router stops silently falling back to `build-plan` for invalid paths.
- **Invalid share link** (Phase 14): Dedicated error state — "This build link is invalid or corrupted" with option to go to build plan. Distinct from 404 since the `/share` route is valid but the `?b=` payload is not.
- **Build not found**: When a bookmarked build/character ID no longer exists in `user.db` (deleted or imported from another device). Redirect to Characters view with a toast.

**Empty:**
- **New character, no builds**: "Start by creating a build. Choose a race and class to begin."
- **Gear slot empty**: "Click to equip" (already specified).
- **Empty buff categories**: Hidden (don't show "Spell Buffs:" with nothing underneath).
- **Zero search results**: "No items match your filters." with suggestion to broaden search.
- **No past lives**: Show the past life grid with all stacks at 0, not an empty state.

### Responsive Behavior
- **Stats panel**: Auto-collapses to a thin toggle strip below 1200px viewport width. User can re-expand.
- **Enhancement trees**: Below 900px content width, switch to single-tree view with tab switching (instead of 7 trees side-by-side).
- **Skills grid**: Horizontal scroll with frozen first column (level numbers) and frozen header row (skill names).
- **Nav bar**: Already has collapsed mode (56px icons only). No further changes needed.

---

## Characters View (`#characters`)

Full-page management UI for characters and builds. Accessed via the nav bar top link.
- Character list with create/delete
- Selected character shows:
  - Current build summary
  - Current tomes (STR/DEX/CON/INT/WIS/CHA +1 to +8). Each life in history records what tomes it had.
  - Life history (with TR types: Heroic/Racial/Epic/Iconic/Lesser)
  - Placeholder lives (set count, click to assign past life feats by type)
  - Planned builds (renamable, not tied to character)
  - **Past Lives**: Stacking grid + reincarnation workflow (existing PastLifeStacks + LifeHistory UI). Placeholder management: set count of undetailed lives, assign past life feats by type. Placeholders show as single row "Placeholders (N lives)" in life history.
    - **Group by past-life type** (Heroic / Racial / Epic / Iconic) so the whole set stays visible on one screen without scrolling. Reference: ddo-builds.com splits these into tabs; tabs are one option but not required — side-by-side columns or collapsible groups also work and avoid hiding stacks behind a click. Whichever we pick, the constraint is: no vertical scrolling to see all past-life categories at a typical viewport.
- "Edit Build" button jumps to the Levels view for the selected build
- **Click to activate / compare**:
  - Click a build to make it the active build.
  - Click a second build while one is already active to mark it as the comparison target. A connector line is drawn from the comparison build pointing at the active build, making the direction of comparison visually explicit (deltas read "comparison -> active").
  - Clicking a selected build again deselects it. Clicking the active build while a comparison is set clears comparison mode entirely.
  - Strict 1v1: selecting a third build replaces the existing comparison target. (Swap direction via the nav bar `[swap]` button, not by re-clicking.)
- **Import/Export**:
  - **Import from DDO Builder v2**: Load `.xml` files from the legacy DDO character planner. Parses class splits, feats, enhancements, gear into our build format.
  - **Import custom format**: Load our own `.json` save format (full build state including gear, enhancements, buffs, past lives).
  - **Export**: Save current build as our custom `.json` format. Button accessible per-build.
  - Import/export buttons in the character view header or per-build action menu.
  - **Note:** If Phase 14 (Build Sharing via URL) ships successfully, per-build JSON export may be replaced by "Copy Share Link" — reassess the need for a separate `.json` format at that point.

---

## Feature Views

### Build Plan (single scrollable page with 6 sections)

Nav bar shows "BUILD PLAN" as a collapsible group with sub-items that scroll to sections within one page. Contains everything about the build's character progression. Gear and Build Overview are separate nav bar views. Past Lives managed in Characters view. Each section on the page (Classes/Feats, Skills, Spells, Enhancements, Destinies) is individually collapsible via its section header. All collapsed states (nav bar group + each section) persisted in `user.db`. **Default states**: Level Progression and Enhancements expanded; Skills, Spells, Reaper, Destinies collapsed. Each collapsed header shows a progress summary (e.g., "Skills: 0/320 allocated", "Enhancements: 42/80 AP spent").

```
+----------------------------------------------------------+
| BUILD HEADER                                              |
| Race: [Human v]              Point Buy: [36 v]           |
|                                                          |
| Base Stats:                  Tomes:                      |
| STR [16] [-][+]             STR [+8]                    |
| DEX [ 8] [-][+]             DEX [+8]                    |
| CON [16] [-][+]             CON [+8]                    |
| INT [10] [-][+]             INT [+8]                    |
| WIS [ 8] [-][+]             WIS [+8]                    |
| CHA [14] [-][+]             CHA [+8]                    |
|              Remaining: 0 pts                            |
|                                                          |
| Classes: Fighter 12 / Rogue 6 / Paladin 2                |
|----------------------------------------------------------|
| v LEVEL PROGRESSION                          (collapsible)|
|                                                          |
| Lv | Class       | Feats                                 |
|----|-------------|---------------------------------------|
|  1 | [Fighter v] | Feat: [Power Attack v]                |
|    |             | Fighter Bonus: [THF v]                |
|  2 | [Fighter v] |                                       |
|  3 | [Fighter v] | Feat: [Cleave v]                     |
|  4 | [Rogue   v] | +1 Ability: [STR v]                   |
|  5 | [Rogue   v] |                                       |
|  6 | [Fighter v] | Feat: [Imp Crit: Slash v]             |
|    |             | Fighter Bonus: [Great Cleave v]        |
| ...|             |                                       |
| 20 | [Fighter v] |                                       |
| 21 | Epic        | Epic Feat: [Overwhelming Crit v]       |
|                                                          |
| Skills (levels 1-20):                                     |
| Lv | Bal | UMD | Hid | Dis | Spt | Srch | ...  | Left  |
|----|-----|-----|-----|-----|-----|------|------|-------|
|  1 |  4  |  4  |  4  |  4  |  0  |  0   |      |  0   |
|  2 |  5  |  5  |  5  |  5  |  0  |  0   |      |  0   |
|  3 |  6  |  6  |  6  |  6  |  0  |  0   |      |  0   |
| ...|     |     |     |     |     |      |      |      |
|Rnks| 23  | 23  | 23  | 23  |  0  |  0   |      |      |
|Total| 38 | 30  | 35  | 34  |  7  |  7   |      |      |
(Total = ranks + ability mod + gear + enh + other bonuses)
|----------------------------------------------------------|
| v SPELLS                                                  |
|                                                          |
| [Wizard] (click to pick spells)            |
|                                                          |
| Lv1: [Magic Missile] [Shield] [Nightshield] [Prot Evil] |
| Lv2: [Web] [Blur] [Knock] [Resist Energy]                |
| Lv3: [Fireball] [Haste] [Displacement]                   |
| ...                                                      |
| Lv9: [Wail of Banshee] [Meteor Swarm]                    |
|                                                          |
| [Paladin] (click to pick spells)                         |
| Lv1: [Divine Favor] [Cure Light Wounds]                   |
|
|                                                          |
| Hover on [Fireball]:                                      |
| +----------------------------------+                     |
| | Fireball                          |                     |
| | Evocation / Fire                  |                     |
| | 10d6 fire (10-60, avg 35)         |                     |
| | Reflex half | SR: Yes              |                     |
| | SP: 15 | CD: 6s                    |                     |
| +----------------------------------+                     |
|----------------------------------------------------------|
| ENHANCEMENTS                 AP Spent: 42/80             |
| Trees: [Kensei] [Stalwart] [Vistani] [Harper] [+]       |
| (selected tree display with tiers and rank pips)          |
|----------------------------------------------------------|
| DESTINIES                    Active: [Legendary Dread v]  |
| Twists: [slot1] [slot2] [slot3]                          |
| (destiny tree display)                                    |
+----------------------------------------------------------+
```

#### Build Header (top of page)
- Race selector: `[Human v]`
- Point buy: `[36 v]` (28/32/36 point buy system)
- Base ability scores: STR/DEX/CON/INT/WIS/CHA with +/- buttons, remaining points shown
- Tomes: Per-ability tome values (+1 through +8). Inherited from character's current tome values; editable for planned builds.
- **Class set** (up to 3 -- DDO's per-character maximum): declare the build's classes here *before* assigning levels, e.g. `[Fighter] [Rogue] [Paladin] [+ Add class]`. This is an input, not a computed summary. Reference: ddo-builds.com.
  - Each chip shows its current level count: `Fighter 12 / Rogue 6 / Paladin 2`. Counts stay derived from the level rows.
  - **Swap a class in place**: changing a chip from Rogue to Ranger remaps *every* level assigned to Rogue in one action, instead of editing six dropdowns. This is the main thing our current builder can't do. Prompt before applying when the swap invalidates dependent choices, and list what breaks (feats losing prereqs, skills becoming cross-class, enhancement trees no longer available) rather than silently dropping them.
  - **Removing a class** with levels assigned requires resolving those levels first (reassign or delete) -- never orphan them.

#### Level Progression (collapsible, contains Classes/Feats + Skills)
- Vertical list of levels, each row showing:
  - Level number, class dropdown (heroic 1-20 only), feat slots
  - Ability score increase every 4 levels
  - Epic/Legendary levels (21+): no class, epic feat slots only
- **The class dropdown lists only the declared class set**, not all 25 classes -- picking from 3 entries is a click instead of a scroll-and-search. Offer an escape hatch ("Other class…") that opens the full list and adds it to the class set if there's room, so the filtered list never becomes a dead end.
- Data: `classes`, `feats`, `feat_prereq_*`, `class_auto_feats`, `class_bonus_feat_slots`

#### Level-Up Modal (per-level focused editor)
- Each row in the Level Progression list has a "Level Up" button. Opens a modal showing only the decisions required at that level.
- Modal contents (only the sections relevant to the level are shown):
  - **Feat slots** -- heroic feat at 1/3/6/9/12/15/18, class bonus feats per `class_bonus_feat_slots`, epic feats at 21+. Each slot is a picker filtered by prereqs.
  - **Skill points** -- ranks for skills available to the level's class, with running remaining-points counter. Cross-class skills shown dimmed.
  - **Ability score increase** -- at levels 4/8/12/16/20 (and epic ASIs). Single +1 selector across STR/DEX/CON/INT/WIS/CHA.
- **Interaction**: Left-click to add/select, right-click to remove (DDO convention, matches Skills grid below).
- **Incomplete badge**: When a level has unfilled required choices, the row shows a red dot / badge. The "Level Up" button on the next incomplete level is the page's primary call-to-action.
- Validation enforced inside the modal: feat prereqs (`feat_prereq_*`), skill pool limits (cannot go negative), ASI applied to base ability scores in the Build Header.
- Data: `feat_slots`, `class_bonus_feat_slots`, `feat_prereq_*`, `class_skills`, `skills`

#### Skills (below Classes & Feats, within same collapsible)
- Grid layout: columns = skills, rows = levels 1-20 only (no epic skill points)
- **Interaction**: Left-click cell to add 1 rank, right-click to remove 1 rank (follows DDO convention). Shift+click as keyboard alternative for right-click.
- Cross-class skills visually distinguished (dimmer background, shows "0.5" rank increments)
- Remaining points shown per level row
- Shows running total per skill at bottom (ranks + ability mod + gear + enhancement + other)
- **Sticky headers**: First column (level numbers) and header row (skill names) stay fixed during scroll
- Horizontal scroll for the 20+ skill columns
- Data: `class_skills`, `skills`

#### Spells (collapsible section)
- Organized by casting class (Wizard, Paladin, etc.). Non-casting classes noted as "no spells".
- Each class header is clickable -- opens a spell picker modal for that class.
- Below each class: spell cards grouped by spell level. Each card shows:
  - Spell name + icon
  - School / element
  - Key effect (damage range, buff value, or duration)
  - Save type + DC (computed from build stats), or "No save"
  - Spell penetration check (Yes/No SR, computed spell pen value)
  - Full description on hover tooltip
  - Drag to reorder within each spell level (order reflects selection priority)
- Spell picker modal (opened by clicking class header):

```
+------------------------------------------------------+
| WIZARD SPELLS                              [x close] |
| [Search spells...        ]                           |
| [All] [Lv1] [Lv2] [Lv3] ... [Lv9]    |
|------------------------------------------------------|
| Level 1                              4+1 slots (3 used)
|                                                      |
| [+] Burning Hands      Evo / Fire     1d4/CL        |
| [x] Magic Missile      Evo / Force    1d4+1 x5      |
| [+] Charm Person       Ench           Will neg DC 15 |
| [x] Shield             Abj            +7 AC          |
| [+] Sleep              Ench           Will neg DC 15 |
| [x] Nightshield        Abj            +4 saves       |
| ...                                                  |
|                                                      |
| Level 2                              4+1 slots (4 used)
| [x] Web                Conj           Ref neg DC 18  |
| [x] Blur               Illus          20% conceal    |
| [+] Scorching Ray      Evo / Fire     12d6 DC 28    |
| ...                                                  |
+------------------------------------------------------+
```

`[x]` = selected (click to remove), `[+]` = available (click to add). Filtered by spell level tabs. Hover on any spell shows same tooltip as main view (dice range, save, SR, SP, cooldown).
- For spontaneous casters (Sorc/Bard): limited by spells known count.
- For prepared casters (Wizard/Cleric): shows all preparable spells.
- Data: `spells`, `spell_class_levels`, `class_spell_slots`, `class_spells_known`

#### Enhancements (collapsible section)

Mirrors DDO's in-game enhancement UI layout:

```
+----------------------------------------------------------+
| v ENHANCEMENTS                                            |
|                                                          |
| +--------+--------+--------+--------+--------+          |
| | Elf    | Kensei | Stalw  | Vistani| Harper |          |
| |(racial)|(class) |(class) |(univ)  |(univ)  |          |
| |        |        |        |        |        |          |
| | Tier 5 | Tier 5 | Tier 5 | Tier 5 | Tier 5 |          |
| | [E][E] | [E][E] | [E][E] | [E][E] | [E][E] |          |
| | Tier 4 | Tier 4 | Tier 4 | Tier 4 | Tier 4 |          |
| | [E][E] | [E][E] | [E][E] | [E][E] | [E][E] |          |
| | Tier 3 | Tier 3 | Tier 3 | Tier 3 | Tier 3 |          |
| |[E][E][E|[E][E][E|[E][E][E|[E][E][E|[E][E][E|          |
| | Tier 2 | Tier 2 | Tier 2 | Tier 2 | Tier 2 |          |
| |[E][E][E|[E][E][E|[E][E][E|[E][E][E|[E][E][E|          |
| | Tier 1 | Tier 1 | Tier 1 | Tier 1 | Tier 1 |          |
| |[E][E][E|[E][E][E|[E][E][E|[E][E][E|[E][E][E|          |
| | Cores  | Cores  | Cores  | Cores  | Cores  |          |
| |[C1-C6] |[C1-C6] |[C1-C6] |[C1-C6] |[C1-C6] |          |
| | 0 AP   | 24 AP  | 8 AP   | 6 AP   | 4 AP   |  [+]    |
| +--------+--------+--------+--------+--------+          |
|                                                          |
| 10 Action Points Remaining (10 Racial) 42 Spent [Reset]  |
+----------------------------------------------------------+

Each [E]: icon + rank pips (oo. = 2/3 ranks filled)
Grayed = prereqs not met or tier locked
```

- **Up to 7 trees side by side**: 1 racial (fixed by race) + up to 6 class/universal (user-chosen). Horizontally scrollable if needed.
- **Only 1 tree can access Tier 5**: Visual indicator on which tree has T5 unlocked. Attempting T5 on a second tree shows warning.
- **Cores at bottom**: Horizontal row of 6 core abilities per tree. First core must be purchased before tier abilities.
- **Tiers bottom to top**: Tier 5 at top, Tier 1 above cores. Build upward.
- **[+] button**: Add a class or universal tree. Opens picker. Disabled when 6 class/universal slots full.
- **Remove tree**: Right-click tree header or X button (resets AP in that tree).
- **Interaction**: Left-click adds rank, right-click removes (DDO pattern). Locked abilities grayed.
- **Hover tooltip**: Name, description per rank, prereqs, AP cost.
- **Visual treatment**: Render trees natively with our own design tokens (`--accent`, tier bands, rank pips) rather than embedding wiki screenshots. Reference: ddo-builds.com's enhancement trees read as part of their site rather than as pasted images — match that. Node icons come from extracted game icons where available, falling back to a typographic/initial treatment; a screenshot of a wiki tree is never the shipped UI. Must work under any accent color and both themes.
- **AP pools**: Heroic (80 max, 4/level), Racial (up to 18 from racial TRs + tomes), Universal (up to 3 from tomes). Shown in bottom bar.
- **Tome settings**: Universal Enhancement tome (+1/+2/+3 universal AP) and Racial AP tomes editable inline next to the AP bar. Also editable on the Characters view (persists per character, inherited by builds like ability tomes).
- Data: `enhancement_trees`, `enhancements`, `enhancement_prereqs`, `enhancement_prereq_classes`, `enhancement_tree_ap_thresholds`, `enhancement_bonuses`

#### Reaper Enhancements (collapsible section)
- Same tree layout as enhancements but for the Reaper tree (`tree_type = 'reaper'`)
- Reaper AP earned from Reaper XP (separate pool from heroic/racial/universal)
- Editable reaper AP total

#### Destinies (collapsible section)
- Reuses enhancement tree components (same N-column layout, cores at bottom, tiers up)
- Destiny selector + twist-of-fate bar at top
- Filters to `tree_type = 'destiny'`
- **Destiny tome**: Editable inline (extra destiny AP from tomes). Also editable on Characters view.

### Gear (`#gear`)

Two states:

**Gear sets are independent from builds:**
- Gear sets are saved separately (named, stored in `user.db` -- see the Persistence section). Can be shared across builds.
- A build can reference multiple gear sets (e.g., "Melee set", "Casting set", "Tanking set").
- Gear set selector at top of gear view: `[Melee Set v] [Casting Set] [+ Add set]`
- Active gear set feeds into stats computation. Switching gear sets updates stats panel immediately.
- Gear sets are saved independently from builds. A build references multiple gear sets by ID.
- Gear set tab dropdown on each set: Rename, Duplicate, Delete, Remove from build.
- `[+ Add Set]` to create new or add an existing gear set to the current build.
- **Standalone gear set editing**: Accessible via "Manage Gear Sets" in the nav bar top dropdown. Opens gear set management where you can create/edit/delete gear sets using the same Gear view UI.

**Full overview (no slot selected)** -- full width, detailed per slot:
```
+----------------------------------------------------------+
| GEAR                                                      |
|                                                          |
| Head: Epic Helm of Tactics                                |
|   PRR +15 (Enh) | Stunning +10 (Ins) | [Yellow] [Blue]  |
|                                                          |
| Neck: Amulet of the Stormreaver                          |
|   CHA +8 (Enh) | Clickie: Chain Lightning | [Red]        |
|                                                          |
| Body: Legendary Slavelord's Plate                         |
|   AC +28 (Armor) | Fort +108% (Enh) | [Yellow] [Blue]   |
|                                                          |
| Ring 1: Celestial Ruby Ring                               |
|   Stunning +15 (Ins) | HP +50 (Art)                     |
| Ring 2: --empty-- (click to equip)                       |
| ...                                                      |
|                                                          |
| Active Sets: Slavelord's (3/5) +10 PRR, +10 MRR         |
| Filigrees: [1: Prowess][2: --][3: --]...[8: --]         |
|----------------------------------------------------------|
| GEAR STATS                            [+ Add stat]       |
| PRR:  15(Enh) + 8(Ins) + 5(Art) = 28  Missing: Qual,Pro |
| AC:   28(Arm) + 5(Ins) + 4(Defl)= 37  Missing: Enh,Art |
| HP:   50(Art) + 30(Enh)         = 80   Missing: Ins,Qual|
+----------------------------------------------------------+
```
- Each slot shows: item name (with wiki link icon for external detail), key bonuses with types, augment slots, set membership
- **Augments**: Click an augment slot on an equipped item to open augment picker inline (filtered by slot color)
- **Crafting**: For craftable items (Cannith, Slave Lords, etc.), crafting options shown inline below the item. Select options from dropdowns.
- **Upgrades**: For upgradeable items (heroic -> epic -> legendary tiers), upgrade selector shown inline. Switching tiers swaps to the upgraded item variant.
- Click any slot name to enter slot editor mode (search for replacement)
- Empty slots show "click to equip"
- Set bonuses at bottom with piece count + active bonus
- Filigree slots at bottom

**Slot editor (slot selected)** -- side by side:
```
+----------------------+-----------------------------------+
| GEAR                 | EDITING: Head Slot                 |
|                      |                                   |
| > Head (editing)     | EQUIPPED: Epic Helm of Tactics     |
|   Neck: Amulet...   |   PRR +15 (Enh) | Stun +10 (Ins) |
|   Body: Plate...    |   Augments: [Yellow: +8 STR] [Blue]|
|   Ring 1: Ruby...    |   Set: Slavelord's (3/5)          |
|   Ring 2: --empty--  |   Farm: Slavelord quests           |
|   ...                |-----------------------------------|
|                      | [Search...        ] ML:[1-30]     |
| Sets: Slavelord 3/5 | Rarity: [Any] Sort: [ML|Name|Stat]|
|----------------------|                                   |
| GEAR STATS           | Legendary Crown of Tactics         |
| PRR: 15(E)+8(I)+5(A)|   PRR +18 (Enh)   [^ from +15]   |
|  Missing: Qual, Pro  |   Stun +12 (Ins)  [^ from +10]   |
| AC: 28(Ar)+5(I)+4(D)|   INT +3 (Qual)   [NEW]           |
|  Missing: Enh, Art   |   [Yellow] [Blue] [Green]         |
| HP: 50(A)+30(E)      |   Auto-transfer: Yellow            |
|  Missing: Ins, Qual   |   Set: Seasons of Feywild          |
|                      |   Farm: Feywild quests             |
|                      |   [Equip]                         |
|                      |                                   |
|                      | Nightforge Helm                    |
|                      |   PRR +12 (Enh)   [wasted: +15]  |
|                      |   AC +5 (Ins)     [same]          |
|                      |   [!] No Yellow slot (augment lost)|
|                      |   [Equip]                         |
+----------------------+-----------------------------------+
```
- Overview compresses to left column (slot names + item names)
- Right panel top: currently equipped item detail (full stats, augments, set, farm source)
- Below: search/filter, candidate items with stats, equip button
- Each candidate shows bonuses, augment slots, set membership, farm source
- **Per-bonus stacking indicators**: Each bonus on a candidate item shows its status vs current gear:
  - **Upgrade** (green): higher than what you currently have for that bonus type + stat (e.g., "^ upgrade from +15")
  - **New** (blue): a bonus type + stat combo you don't currently have from any item
  - **Same** (yellow): identical to what you already have
  - **Wasted** (gray): suppressed because another equipped item has a higher bonus of the same type (e.g., "wasted: +28 from Body")
- **Augment transfer**: When equipping a new item, augments from the old item that fit compatible slots on the new item are automatically transferred. Incompatible augments shown as "lost" with a warning before confirming.
- Click a different slot on the left to switch which slot is being edited
- Click back/X to return to full overview

**Build comparison in gear**: When comparison mode active, full overview shows side-by-side:
```
+----------------------------+-----------------------------+
| YOUR GEAR                  | COMPARISON: Wizard TR       |
|                            |                             |
| Head: Epic Helm of Tactics | Head: Crown of Wizardry     |
|   PRR +15 | Stun +10      |   INT +8 | SpPwr +30        |
| Neck: Amulet of Storm     | Neck: Pendant of Arcane     |
|   CHA +8                  |   SpPwr +50 | SpLore +15    |
| ...                        | ...                         |
+----------------------------+-----------------------------+
```

**Gear Stats panel** (below slots in overview, below compressed slots in editor):
- User-configurable: `[+ Add stat]` to track specific stats
- Shows gear-only bonuses per stat with bonus types: `PRR: 15(Enh) + 8(Ins) + 5(Art) = 28`
- Shows missing bonus types per stat: `Missing: Qual, Pro`
- Hover a bonus type shows which item provides it
- Click a stat filters the gear search when in slot editor mode
- **Part of the gear set data** -- tracked stats and their config are saved per gear set (not per build). Same gear set shows same tracked stats whether viewed standalone or inside a build.

- Data: `items`, `item_bonuses`, `item_effects`, `item_augment_slots`, `augments`, `filigrees`, `set_bonus_items`, `set_bonus_bonuses`, `quest_loot`

### Build Overview (`#overview`)

The landing page for a build -- shows everything at a glance and lets you configure active abilities and buffs. Positioned first in nav bar (above Build Plan).

```
+----------------------------------------------------------+
| BUILD OVERVIEW                                            |
|----------------------------------------------------------|
| PASSIVE FEATS                                             |
| [Power Attack Lv1] [THF Lv1] [Imp Crit Ftr6] [Tough Lv3]|
| [Evasion Rog2] [Weapon Focus Ftr4]                        |
|                                                          |
| ACTIVE FEATS                                              |
| [Cleave Lv1] [Great Cleave Ftr6] [Smite Evil Pal1]       |
| [Lay Hands Pal1] [Stunning Blow Lv6]                     |
|----------------------------------------------------------|
| ABILITIES                        [+ Show hidden abilities]|
|                                                          |
| +------------------+ +------------------+ +------------- |
| | Fireball         | | Cleave           | | Smite Evil   |
| | Evo / Fire       | | Melee AoE        | | Melee Single |
| | 243 - 288        | | 42 - 68          | | 58 - 92      |
| |   avg 265        | |   avg 55         | |   avg 75     |
| | Ref DC 32 | SR   | | No save | CD: 5s | | 3/rest       |
| | SP: 15 | CD: 6s  | | No cost          | | No cost      |
| +------------------+ +------------------+ +------------- |
|                                                          |
| (click card -> Damage Calc) (x to hide) [+ Show abilities]|
|
|----------------------------------------------------------|
| BUFFS                                    [+ Add buff]    |
|                                                          |
| Spell Buffs:                                              |
| [x] Haste          [x] Displacement    [ ] Fire Shield   |
| [x] Greater Heroism [ ] Stoneskin                         |
|                                                          |
| Conditional Effects:                                      |
| [x] Sneak Attack    [ ] Blocking       [ ] In Reaper     |
| [ ] Centered        [x] Power Attack stance               |
| [x] Kinetic Charge  x3 [-][+]    (stackable)            |
|                                                          |
| Stances:                                                  |
| Power Attack:  (o) On  ( ) Off                            |
| Combat Expertise: ( ) On  (o) Off                         |
|                                                          |
| Ship Buffs:                                               |
| [x] Guild Resistance  [x] Guild Vitality                 |
|                                                          |
| External (different color):                               |
| [x] Inspire Courage  [x] Mass Haste   (from party)      |
| [x] Haste (Boots of Speed, 2 charges)  (item clickie)   |
| [ ] Fire Shield (Bluefire Necklace, 3 charges)           |
+----------------------------------------------------------+
```

**Feats:**
- Passive feats list
- Active feats list

**Abilities (card format):**
- Spells, active feat attacks, enhancement attacks/SLAs, item clickies
- Each shown as a card: name, type, min/max/avg damage, save/DC, cost, cooldown
- Click any card to open Damage Calculator (TOOLS) with that ability pre-selected for full breakdown
- All abilities shown by default. Click `[x]` on a card to hide it. Hidden abilities remembered per build in `user.db` (`ui_state`).
- **Source attribution**: Each card/pill shows where it comes from (e.g., "Fighter Lv6", "Kensei T3", "Boots of Speed clickie"). If the same ability is granted by multiple sources, show all sources with a duplicate indicator and stacking note.
- **Ability picker**: Click `[+ Show hidden abilities]` to open picker (like spell picker modal). Shows all available abilities with hidden ones marked `[+]` to re-add. Categorized by source (spells/feats/items/enhancements).

**Buffs (toggleable):**
- **Spell buffs**: Toggle self-cast buffs on/off (Haste, Displacement, etc.)
- **Conditional effects**: Toggle gear/enhancement conditionals (sneak attack active, blocking, in reaper difficulty, etc.)
- **Stacks**: Stackable buffs show a count (e.g., Rage stacks x3, Kinetic Charge x5). Adjustable with +/-.
- **Stances**: Radio groups (mutually exclusive)
- **Ship buffs / consumables**: Toggle common external buffs
- **External buffs**: `[+ Add buff]` picker to add buffs not on the character (party buffs, bard songs, etc.). Displayed in a different color/style to indicate "requires external source."
- All active toggles feed into stats computation
- Data: `spells`, `feats`, `item_spell_links`, `enhancement_spell_links`, `item_effects`, `enhancement_bonuses`

---

## Stats Panel (right, 280px)

2 tabs: **Stats | Feats**

### Stats Tab

```
+-------------------------------+
| Stats | Feats                 |
|-------------------------------|
| [Search stats...        ]     |
|-------------------------------|
| PINNED                        |
| ::: HP      420  E I A    [i]|
| ::: SpPwr   180  E I Q   [i]|
| ::: AC       85  E I D S [i]|
|-------------------------------|
| v ABILITY SCORES              |
| STR  18(+4)  E I          [i]|
| DEX  12(+1)  E            [i]|
| CON  16(+3)  E I          [i]|
| INT  10(+0)               [i]|
| WIS  14(+2)  E            [i]|
| CHA   8(-1)               [i]|
|-------------------------------|
| v DEFENSES                    |
| HP      420  E I A        [i]|
| AC       85  E I D S N    [i]|
| PRR      42  E I          [i]|
| MRR      30  E I          [i]|
| Dodge    18% E I          [i]|
| Fort   108% E             [i]|
|-------------------------------|
| > SAVES (collapsed)          |
| > COMBAT (collapsed)         |
| > SPELLCASTING (collapsed)   |
| > SKILLS (collapsed)         |
+-------------------------------+
```

- **Search field**: Filters visible stats as you type
- **Pinned section**: User-pinned stats at top. `:::` drag handle per row to reorder. Pin/unpin via icon.
- **Grouped sections** (collapsible): Ability Scores, Defenses, Saves, Combat, Spellcasting, Skills
- **Bonus type badges**: Small colored pills (E=Enhancement, I=Insightful, A=Artifact, D=Deflection, S=Shield, Q=Quality, etc.) on each row. Missing types visible by absence.
- **Compare mode**: +/- deltas shown inline (green better, red worse)
- **Stat highlight mode**: Click a stat name to highlight all sources contributing to that stat across the entire UI (gear slots, enhancement nodes, buffs, feats). Click again or another stat to change/clear.

### Stat Breakdown Popover

```
+-------------------------------+
| AC                        (85)|
|-------------------------------|
| [E] Enhancement  +15  Armor  |
| [I] Insight       +5  Ring   |
| [D] Deflection    +4  Ring   |
| [S] Shield        +8  Shield |
| [N] Natural Armor +5  Enh    |
|     Dexterity     +1  (base) |
|     Base          10         |
|-------------------------------|
| ~~ Suppressed ~~              |
| [E] Enhancement  +10  Belt   |
|-------------------------------|
| Missing: Artifact, Exceptional|
|   Profane, Quality, Festive   |
+-------------------------------+
```

- **Active bonuses**: Source name, bonus type, value. The source must name the **specific** provider — "Celestial Ruby Ring", "Kensei T3", "Greater Heroism" — not just the slot or category. The ASCII sketch above abbreviates to fit; the real popover spells the source out. This is what makes the breakdown auditable, and it comes free from the engine's `{ value, sources[] }` return shape (reference: ddo-builds.com's per-stat source breakdown).
- **Suppressed bonuses**: Same-type lower bonuses shown struck through, each naming the item that suppressed it
- **Missing bonus types**: Explicitly listed

### Compare mode in Stats Panel

```
+-------------------------------+
| PINNED                        |
| ::: HP      420  -140  E I A |
| ::: SpPwr   180  +168  E I Q|
| ::: AC       85   -43  E I D|
+-------------------------------+
```

### Feats Tab
- Active vs passive lists (from level plan)

### Panel Behavior
- **Collapsible**: Can be collapsed to a thin strip or hidden entirely. Toggle via edge button.
- **Hidden on certain views**: Stats panel hides on views that display stats themselves (e.g., Damage Calculator, Characters view). Reappears when navigating back to build features.


### Stats Computation Engine

Pipeline of pure functions, each stage memoized independently:

```
baseStats(race, pointBuy, tomes, levelUps)
  -> classFeatures(classes, levels)
  -> abilityMods(baseStats)             -- STR 18 -> +4 mod
  -> enhancementBonuses(spends, trees)  -- resolve per-rank, filter by min_rank
  -> gearBonuses(equippedItems)         -- join item_bonuses
  -> setBonuses(equippedItems, sets)    -- piece-count thresholds
  -> augmentBonuses(augments)
  -> buffBonuses(activeBuffs, stances)  -- conditional on toggle state
  -> pastLifeBonuses(pastLives)
  -> stackBonuses(allSources)           -- typed: highest wins; untyped: all stack
  -> derivedStats(stacked)              -- saves, AC, DCs, skill totals, spell power
  -> { stats, breakdowns, missing }
```

- `stackBonuses` uses `bonus_types.stacks_with_self` from DB to determine stacking rules
- Each stage returns `{ value, sources[] }` for breakdown display
- `breakdowns` tracks active + suppressed bonuses per stat
- `missing` lists bonus types not present per stat (Enhancement, Insightful, etc.)
- Target: <16ms for full recomputation (one frame budget)
- **Unit tests required** (vitest): typed stacking, untyped stacking, derived stat chains, edge cases (empty build, single class 20, all slots empty)

---

## Build Switching & Comparison

### Switching
- **Nav bar top dropdown**: `[Weston: Pal 20 v]` -- dropdown shows:
  - `Manage Characters / Builds` -- opens Characters view where you switch builds, manage characters, past lives, etc.
  - `Manage Gear Sets` -- opens gear set management (same Gear view UI, no build context)
- Build switching happens in the Characters view (click a build to make it active)
- **Unsaved build badge**: Red dot on the nav bar build label when the active build is not persisted (temporary "What if" copy or shared build opened from URL). Signals the user needs to save/import or the build will be lost. Clears when the build is saved ("Keep variant", "Save as new build", or "Import to My Builds").

### Comparison
- **Entering comparison**: Activate a build in the Characters view, then click a second build to mark it as the comparison target (see [Characters View](#characters-view-characters) > Click to activate / compare). The Characters view is the only entry point -- there is no separate nav bar picker.
- **Compare active**: Second line below the nav bar build label: `vs Wizard TR [swap][x]`.
- **Swap button** `[swap]`: Flips which build is primary (editable) and which is comparison (read-only). Nav bar label updates, stats deltas flip sign.
- **"What if" copy**: A `[Try variant]` button creates a temporary copy of the current build. Enters comparison mode with the copy as editable primary and the original as comparison target. When done: "Keep variant" (replaces original), "Save as new build" (keeps both), or "Discard" (reverts to original).
- **Compare past lives**: Comparing against a character's life inherits that character's past lives for stat calculation. Standalone planned builds default to zero past lives.
- **Past life warning**: If comparison target has different past lives than current build's character, show a warning indicator.
- **Comparison display** (only 3 views affected):
  - **Stats panel**: +/- deltas inline on each stat (green better, red worse)
  - **Build Overview**: Feats show missing/extra. Abilities present in both builds show +/- damage diff on cards. Buffs show different active states.
  - **Gear**: Side-by-side (your slots left, comparison right)
  - Other views (Level Plan, Enhancements, Destinies) are unaffected -- swap builds via nav bar to inspect those.
- **Deactivate**: Click `[x]`. If temporary copy active, prompts keep/save/discard first.

---

## Persistence (user.db -- SQLite)

All user data lives in a second SQLite database (`user.db`) managed by sql.js. The game data DB (`ddo.db`) is read-only. `user.db` is persisted to IndexedDB between sessions. Import/export = download/upload the `user.db` file.

**This section supersedes any earlier mention of localStorage for user data.** The feature specs above predate the `user.db` design; where they disagree, this section wins. localStorage remains correct only for pre-`user.db` preferences that have not migrated yet (theme, accent color).

**Schema** (relational, mirrors the game DB pattern):
```sql
-- user.db schema (versioned, migrations via SQL)
CREATE TABLE schema_version (version INTEGER);

CREATE TABLE characters (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, server TEXT,
  notes TEXT, created_at TEXT, updated_at TEXT
);
CREATE TABLE lives (
  id TEXT PRIMARY KEY, character_id TEXT REFERENCES characters(id),
  name TEXT, race TEXT, status TEXT, -- 'completed'|'current'|'planned'
  reincarnation_type TEXT, epic_feat_id TEXT, completed_at TEXT,
  sort_order INTEGER, notes TEXT
);
CREATE TABLE life_classes (
  life_id TEXT REFERENCES lives(id), class_id TEXT, levels INTEGER
);
CREATE TABLE life_feats (life_id TEXT REFERENCES lives(id), feat_id TEXT, level INTEGER);
CREATE TABLE life_skills (life_id TEXT REFERENCES lives(id), skill_id TEXT, level INTEGER, ranks INTEGER);
CREATE TABLE life_spells (life_id TEXT REFERENCES lives(id), spell_id TEXT, class_id TEXT, sort_order INTEGER);
CREATE TABLE life_enhancements (
  life_id TEXT REFERENCES lives(id), tree_id INTEGER, enhancement_id INTEGER, ranks INTEGER
);
CREATE TABLE life_destinies (
  life_id TEXT REFERENCES lives(id), tree_id INTEGER, enhancement_id INTEGER, ranks INTEGER
);
CREATE TABLE life_buffs (life_id TEXT REFERENCES lives(id), buff_id TEXT, active INTEGER, stack_count INTEGER);
CREATE TABLE life_stances (life_id TEXT REFERENCES lives(id), group_id TEXT, stance_id TEXT);
CREATE TABLE untracked_lives (character_id TEXT, category TEXT, source_id TEXT, count INTEGER);

CREATE TABLE gear_sets (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT, updated_at TEXT
);
CREATE TABLE gear_set_items (gear_set_id TEXT REFERENCES gear_sets(id), slot TEXT, item_id TEXT);
CREATE TABLE gear_set_augments (gear_set_id TEXT REFERENCES gear_sets(id), slot TEXT, augment_index INTEGER, augment_id TEXT);
CREATE TABLE gear_set_filigrees (gear_set_id TEXT REFERENCES gear_sets(id), slot_index INTEGER, filigree_id TEXT);
CREATE TABLE gear_set_tracked_stats (gear_set_id TEXT REFERENCES gear_sets(id), stat_id TEXT);
CREATE TABLE build_gear_sets (life_id TEXT REFERENCES lives(id), gear_set_id TEXT REFERENCES gear_sets(id), active INTEGER);

CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE ui_state (key TEXT PRIMARY KEY, value TEXT); -- collapsed states, pinned stats, etc.
```

**In-memory state** (Zustand stores, hydrated from `user.db` on load):
```typescript
// characterStore: characters[], selection, mutations
// buildStore: current build's level plan, enhancements, destinies, buffs
// gearStore: gear sets, equipped items, augments
// comparisonStore: comparison target, deltas
```

Zustand stores are the source of truth for rendering. On mutation, write through to `user.db` (async, debounced for rapid changes like skill allocation). On load, hydrate stores from `user.db`.

**Name limits**: Character names max 40 chars, build names max 60 chars, gear set names max 30 chars. Truncate with ellipsis in tight spaces (nav bar label, dropdowns).

---

## Future Features (TOOLS section)

### Damage Calculator
- Input: current build state (class levels, gear, enhancements, buffs)
- Simulate DPS against configurable enemy (AC, HP, resistances)
- Show breakdown by damage source
- Full formula breakdown: dice, ability mod, enhancement, power, doublestrike/doubleshot, crit profile
- **Comparison mode**: When active, show +/- deltas on each stat contributing to the calculation AND on the final damage output
- **Back navigation**: When navigated from Build Overview (via ability card click), show a "Back to Build Overview" link at the top. Browser back button must also return to Build Overview correctly (ensured by `pushState` routing). The referrer context (which view the user came from) should be passed via navigation state so the link label is contextual (e.g., "Back to Build Overview").

### Item Optimizer
- Target a stat to maximize (e.g., "maximize Spell Power")
- Suggest gear swaps from the DB that improve the target stat
- Respect set bonus interactions

### Farm Checklist
Auto-generated from ALL items in the current build (all gear sets, augments, filigrees).

**Items to acquire:**
- Every equipped item listed as a checkbox
- Each shows farm location(s) with quest wiki links (from `quest_loot`)
- Wiki link on each item name
- Check off when acquired

**Acquisition paths:**
- Each item may have multiple ways to obtain: farm (quest drop), craft, or purchase (vendor/AH)
- User selects preferred path per item (dropdown: Farm / Craft / Purchase)
- If multiple crafting recipes exist, user picks which one
- If multiple farm locations exist, all shown with wiki links
- Purchase path shows vendor/cost if known
- Selected path determines what materials are needed (if crafting) or where to go (if farming)

**DB additions needed**:
- Purchasable augments (vendor-sold augments with cost/location)
- **SLAs / Abilities table**: Enhancement and feat-granted abilities with:
  - Source (which enhancement/feat grants it)
  - Linked spell (if SLA, which spell it mimics)
  - Attack type: melee cleave, melee single, ranged, spell, SLA, toggle, etc.
  - Applicable metamagics (which metamagic feats can modify this ability)
  - Cost (SP, charges, cooldown)
  - Damage dice / effect
  - Modifiers: extra damage (e.g., +1[W]), crit multiplier override, crit threat range override
- **Metamagic applicability**: Per-spell/SLA flags for which metamagics apply (Maximize, Empower, Quicken, etc.). Extend `spell_metamagics` table to also cover SLAs.

**Materials summary:**
- All materials needed across all selected crafting paths, summed up
- Grouped by crafting system (Cannith, Slave Lords, etc.)
- Each material shows: name, total quantity needed, wiki link
- Materials from checked-off (acquired) items are deducted from the total
- Augments and filigrees included -- their crafting materials also summed

**Augments & filigrees:**
- Listed alongside gear items with sources and wiki links
- If craftable, materials included in the summary

**Data sources**: `quest_loot`, `crafting_recipes`, `crafting_recipe_ingredients`, `crafting_system_items`, `crafting_ingredients`

### Debug / Data Browser (collapsible TOOLS sub-group)
- Collapsible nav bar group under TOOLS with sub-items:
  - **Items**: Browse/search all items, view full bonuses, effects, augment slots, set membership
  - **Spells**: Browse all spells, view class levels, school, components, damage
  - **Enhancements**: Browse all trees and enhancements, view bonuses, prereqs
  - **Feats**: Browse all feats, view prereqs, bonus classes, descriptions
  - **Augments**: Browse augments by slot color, view bonuses
  - **Sets**: Browse set bonuses, view piece thresholds and bonuses
- Each sub-view is a 2-panel layout:
  - **Left panel**: Searchable/filterable picker list for that entity type
  - **Right panel**: Selected entity detail -- wiki link (opens in new tab for easy comparison), description, and all bonuses/effects this entity applies
- **Wiki compare window**: Inline embedding is impossible -- ddowiki.com put its entire origin (`api.php` included) behind AWS WAF's JS bot challenge, and only top-level navigation clears it. Superseded by the shared left-half compare window shipped in Phase 4b: every wiki click re-navigates one window, so our parsed data sits beside the wiki page for mismatch spotting. Details in [ddowiki-api.md](ddowiki-api.md).
- **Inline corrections**: When a mismatch is spotted, click "Edit" on any bonus/effect to correct it inline. Changes:
  - Applied to local DB immediately (user's copy is fixed)
  - Accumulated in a corrections log (stored in `user.db`)
  - Corrections log exportable as JSON file
  - Exported JSON matches the `overrides.json` format used by the data pipeline
  - **Submit correction button**: Per-item. Opens a pre-filled GitHub issue URL (`/issues/new?title=Data+correction:+Item+Name&body=...&labels=data-correction`). The user's own GitHub session handles auth (zero infrastructure needed). The pre-filled body includes the correction JSON and item context. GitHub Action on issue creation:
    - Checks if correction already in `overrides.json` -> closes with "Already applied"
    - Checks if duplicate open issue exists for same item -> closes with "Duplicate of #N"
    - Otherwise applies correction, merges into `overrides.json`, creates PR, closes issue

```
+-------------------------+----------------------------------+
| ITEMS                   | Legendary Crown of Tactics       |
| [Search...       ]      | [Wiki link]                      |
| Filter: ML [30] Slot [H]|                                  |
|                         | Description:                     |
| > Legendary Crown of T  | A powerful helm crafted by...    |
|   Epic Helm of Tactics  |                                  |
|   Nightforge Helm       | Bonuses:                         |
|   Crown of Wizardry     |   PRR +18 (Enhancement)          |
|   ...                   |   Stunning +12 (Insightful)      |
|                         |   INT +3 (Quality)               |
|                         |                                  |
|                         | Effects:                         |
|                         |   Ghost Touch                    |
|                         |                                  |
|                         | Augment Slots:                   |
|                         |   [Yellow] [Blue] [Green]        |
|                         |                                  |
|                         | Set: Seasons of the Feywild       |
|                         | Quest: Feywild adventures         |
+-------------------------+----------------------------------+
```

---

## File Structure

For where code lives **today**, read `.claude/rules/frontend.md` (feature-module list and dependency
direction) rather than this section — it loads automatically when editing `src/`. Listed below are
only the modules that do **not exist yet**, so this section shrinks to nothing as phases ship.

```
src/features/
  build-plan/                        -- Phase 7 (single scrollable page)
    components/ BuildPlanView, BuildHeader,
                LevelProgression, LevelRow, FeatPicker,
                SkillGrid, SpellSection, SpellPicker,
                EnhancementSection, EnhancementTree, EnhancementNode,
                ReaperSection, DestinySection, TwistOfFateBar
    hooks/ useLevelPlan, useFeats, useSpells, useEnhancementTrees, useEnhancements
    types.ts
  build-overview/                    -- Phase 12
    components/ BuildOverview, FeatList, AbilityCard, AbilityPicker,
                BuffSection, BuffToggle, StanceGroup
    hooks/ useAbilities, useBuffs
    types.ts
  stats/                             -- Phase 6 (extracted from character)
    components/ StatsPanel, StatsTab, FeatsTab,
                StatRow, StatBreakdownPopover
    engine/ computeStats.ts, bonusStacking.ts, statSources.ts
    hooks/ useStats, useCompare
    types.ts

src/stores/                          -- Phase 5 (Zustand, hydrated from user.db)
```

Existing modules that later phases extend: `features/character/` (Characters view + past lives,
Phase 5), `features/gear/` (Phase 8), `features/resources/` (Phase 4c-4g), `features/settings/`
(Phase 13). The Phase 4 Resources browser shipped as `features/resources/`, not the
`features/debug/` originally planned here.

---

## Implementation Order

### Phase status

Exactly one row is `→ NEXT`. **When a phase ships, mark it `done` and move `→ NEXT` in the same
commit** (per `CLAUDE.md`) — this table is the only place order is recorded, so it cannot contradict
itself. Branch naming: `phase-<n><letter>-<slug>` (e.g. `phase-4b-resources`).

| Phase | Status | What |
|---|---|---|
| 1 | done | Layout restructuring -- feature nav, routing, bottom bar, DB loading gate |
| 1b | done | CSS refactor -- design-system tokens |
| 1c | done | Explicit function return types (ESLint rule) |
| 1d | done | Router migration to `@tanstack/react-router` |
| 1e | done | Transparent pip fills (Character view) |
| 2 | done | Landing view + site patch notes |
| 3 | done | Error reporting & resilience -- Sentry, boundaries, `DatabaseGate` |
| 4a | done | Resources browser -- items picker + detail |
| 4b | done | Resources drawer architecture + wiki compare window |
| 4h | done | Shared-hook state cleanup -- `useTheme` to `useSyncExternalStore` |
| 4i | done | `<Modal>` primitive consolidation (+ mobile fullscreen nav modal behavior) |
| 4j | done | Licensing & attribution housekeeping -- LICENSE file, IP disclaimer, wiki credit, site-metadata footer |
| 4k | done | File-structure cleanup -- feature-layout consistency, dead icon removal |
| 4c | done | ETL template/entity normalization + rare loot (Python pipeline) |
| **4m** | **→ NEXT** | ETL data-quality: audits & investigations -- **blocks Phase 8** (see the phase entry) |
| 4l | planned | DDOBuilderV2 data cross-check utility -- diff `ddo.db` against Maetrim's XML data files |
| 4d | planned | Filter UX overhaul |
| 4e | planned | Stat DB rework -- **needs spec expansion before starting**, see the phase entry |
| 4f | planned | Categories -- feats, enhancements, bonuses, stats (requires 4e) |
| 4g | planned | Polish -- filter persistence, sortable picker table |
| 5 | planned | Characters view & build context -- `user.db`, Zustand stores |
| 5b | planned | Resource Report View -- inline corrections + issue submission (requires 5) |
| 6 | planned | Stats engine |
| 7 | planned | Build Plan (single scrollable page) |
| 8 | planned | Gear |
| 9 | planned | Comparison mode |
| 10 | planned | Farm checklist |
| 11 | planned | DB pipeline -- SLAs, abilities, purchasable augments |
| 12 | planned | Build Overview |
| 13 | planned | Settings view cleanup |
| 14 | planned | Build sharing via URL |
| 15 | planned | `.DDOBuild` import (DDOBuilderV2 desktop files) |

Phases 4h–4k are general frontend/repo cleanup rather than Resources-browser work; they sit under
Phase 4 only because they surfaced during it. Ordered first because all are small and self-contained.

**Independence and ordering notes** (the table reads as strictly serial by default, so where that
isn't true it is said here):

- **4m is a prerequisite for Phase 8**, not optional cleanup — `{{Enhancement bonus}}` is missing on
  4,037 items and a weapon's `+N` is unusable without it. It is `→ NEXT` for that reason and because
  it reuses the template module 4c just built.
- **4l can be taken in parallel with 4m** (different files: a new CLI command vs. the existing
  writers). Its scope also shrank: the manual cross-check was already run during 4c planning and its
  findings are recorded in [DB Errors.md](notes/DB%20Errors.md), so 4l is now "build the repeatable
  tool", not "discover the disagreements".
- **4d–4g remain serial** behind each other as written (4f still `requires 4e`).

### Phase 1: Layout Restructuring (done)
- Redesign nav bar as feature nav (Build Overview, Build Plan, Gear + TOOLS)
- Nav bar top build dropdown (compare-active indicator added in Phase 9)
- Clean URL routing (History API + 404.html SPA redirect) — the hand-rolled router was later replaced by `@tanstack/react-router` in Phase 1d
- Bottom warning bar (collapsed indicator)
- DB loading gate (skeleton UI until `ddo.db` ready)
- Service worker for `ddo.db` caching (stale-while-revalidate)

### Phase 1b: CSS Refactor (done)
Companion to Phase 1 — design-system token infrastructure.

- `color-mix()` derivatives: `--accent-glow`, `--accent-bg-subtle` track `--accent` on theme switch
- Flush panel chrome: nav bar, bottom bar, stats panel use `--bg` + hairline border (no `--bg-panel`, no shadow)
- Active state polish: `cursor: default`, hover suppression, weight bump on active nav items + card border accent
- Typography tokens (`--text-xs` through `--text-3xl`): Tailwind default scale, migrated across all CSS files
- Spacing tokens (`--space-px` through `--space-8`): Tailwind default scale, migrated padding/margin/gap
- Align default `--accent` with Gold theme
- **Post-merge: verify `docs/styling.md` token table and Design Principles section match the code.** The styling guide was updated on `navigation-refactor` to describe the target state (flat chrome, color-mix, etc.) before the css-refactor code landed — confirm no drift.

### Phase 1c: Explicit Return Types (done)
Enable `@typescript-eslint/explicit-function-return-type` ESLint rule with `allowExpressions`, `allowTypedFunctionExpressions`, and `allowHigherOrderFunctions`. Fix all existing violations across `src/` and `e2e/`.

### Phase 1d: Router Migration (done)
Replace custom `useRouter` hook with `@tanstack/react-router`. Needed before Phase 3+ which require sub-paths, search params, and navigation state.

- Install `@tanstack/react-router` + `@tanstack/react-router-devtools`
- Define route tree with typed routes for all existing views + `not-found`
- Migrate `App.tsx` view switching to route-based rendering
- Migrate `AppNavBar` and `BottomBar` navigation from `navigate(view)` to router `Link`/`useNavigate`
- Configure `basePath: '/ddo-tools'` for GitHub Pages
- Update `404.html` SPA redirect if needed
- Remove `src/hooks/useRouter.ts` and `useRouter.test.ts`
- Verify all Playwright e2e tests pass (URL assertions, navigation, view switching)

### Phase 1e: Transparent pip fills (Character View) (done)
Follow-up from `css-refactor-v2`. The `.stack-pip` variants in `CharacterView.css` use solid `color-mix(accent N%, bg-tertiary)` fills, plus a solid `--accent` for `.filled`. When the enclosing `.stack-row.hoverable` lifts to `--bg-subtle` on hover, the pip colors stay anchored to the unhovered row bg and read as disconnected — the "muted" pip colors were tuned against `--bg-tertiary`, not the composited hover surface underneath.

- Migrate `.stack-pip.filled`, `.current-has`, `.current-has-filled`, `.locked`, and the `.pip-has-*` overlay variants to transparent accent overlays (e.g. `rgb(from var(--accent) r g b / 0.4)`) so pip colors composite over whatever row bg is currently painted — hovered or not.
- Keep the `.filled` state readable: may need a higher alpha (0.85+) or stay solid if contrast drops too far on hover.
- Verify the repeating-linear-gradient hatched variants still read clearly once transparent; swap the "bg-tertiary band" stops to `transparent` so the row bg shows through between stripes.
- Visual QA on both themes (dark + light) + with non-default accent colors.

### Phase 2: Index / Landing View (done)
- Dedicated `LandingView` at `/ddo-tools/` — ampersand hero mark, active character card, site patch notes, DDO Wiki link-out. The nav bar brand doubles as a Home link (ampersand mark visible when collapsed).
- Site patch notes in `src/features/landing/data/sitePatchNotes.ts`. Each entry is one ship date with a bulleted list of imperative changes — no titles, no versions. **Upkeep**: when merging a PR to `main`, either add a new dated entry or append bullets to today's entry if one already exists. Keep change bullets terse and imperative (match commit-subject voice).
- DDO game patch notes: v1 is a link-out to DDO Wiki's `Updates` page. The planned v2 (embed the latest update summary via MediaWiki `action=parse`) is **blocked indefinitely** — AWS WAF fronts the whole ddowiki origin including `api.php`, so no cross-origin fetch can pass. Revisit only if API access is restored (see [docs/notes/To Do.md](notes/To%20Do.md)).

### Phase 3: Error Reporting & Resilience (done)
Infrastructure for per-view error handling. Built early so every subsequent phase gets error boundaries from day one. Sentry adopted for automatic background capture (with Session Replay); a single static "Report a bug" button in the bottom bar covers all user-initiated reports (technical, data-quality, UX feedback) via pre-filled GitHub issues. See [docs/sentry.md](sentry.md) for setup.

- ErrorBoundary infrastructure via the `react-error-boundary` npm package: root `<ErrorBoundary>` in `main.tsx` (catch-all 500 page renders `<ErrorScreen>`), view boundary around `<Outlet />` in `AppLayout` with `resetKeys={[pathname]}`, chrome boundary around `<BottomBar />` so the static Report button stays reachable when other shell elements crash. All boundaries forward to Sentry via the `captureBoundary` adapter, which preserves the React component stack.
- Per-view DB loading via `<DatabaseGate>`: top-level `LoadingGate` removed. Views that need `ddo.db` opt into the wrapper; Settings, Characters, and Landing render instantly. `DatabaseGate` shows a skeleton during load and a categorized `<ErrorScreen>` on failure with Retry + Clear-Cached buttons. After 3 retries (sessionStorage) Retry escalates and disables; the counter resets on successful load.
- `<ErrorScreen>` + `<ErrorCard>` components: full-page and compact inline error displays with `tone='error' | 'info'` variants, focus-on-mount + `role="alert"` (ErrorScreen), `role="status" aria-live="polite"` (ErrorCard). Used by all four boundary tiers + DatabaseGate + NotFoundView.
- Bottom-bar "Report a bug" button: replaces nothing — `BuildInfo` stays on the left (load-bearing on tablet/mobile where the nav collapses); the button sits on the right clustered next to `WarningStatus`. lucide `Bug` icon, mobile collapse to icon-only, `aria-label="Report a bug — opens GitHub issue"`. Click opens a pre-filled GitHub issue in a new tab with sanitized URL + UA + (when Sentry is configured) most-recent event ID + replay correlation.
- GitHub issue helper at `src/lib/githubIssue.ts`: `REPO_URL`, `buildIssueUrls(error?, labels?, contextTitle?, sentryContext?)`, `sanitizeUrl()` (strips query + hash). Per-source labels: `db-loading`, `runtime`, `not-found`. Body template prompts users with "What did you notice / What were you doing / Expected vs actual" so reports come back with usable context.
- `NotFoundView`: 404 page for unknown routes — TanStack Router already routes unknown paths here; this phase upgrades the visual chrome to `<ErrorScreen tone='info'>` with the sanitized attempted path, "Go to landing", and "Report broken link" actions. Empty-path fallback when sanitized pathname is `/`.

### Phase 4: Resources Browser

Originally a single "Debug / Data Browser" deliverable; expanded into sub-phases as the design clarified. The route is `/resources` with a "Debug" nav label (the list is power-user-leaning but useful for any player verifying parsed data against the wiki).

#### Phase 4a — Items browser (done)
- 2-panel browser (picker + detail) for items only as MVP. Picker has Fuse-fuzzy search, virtualized list (react-window), and a filter row (slot, rarity-Rare, raid, stat multi-select, ML range). Detail panel renders weapon/armor stats, augment slot gems, enchantments (bonuses + effects merged), spells, upgrades, quest sources.
- Embedded wiki preview via MediaWiki `action=parse&prop=text`, with DOMPurify sanitizing and a health pill in the header. **Entirely removed in Phase 4b** — ddowiki went behind AWS WAF. Recorded here only so the compare-window decision has context; do not reinstate.

#### Phase 4b — Drawer architecture + wiki compare window (done)
Detail: [docs/notes/Resource View.md](notes/Resource%20View.md).
- Detail-to-detail navigation with an in-memory back stack. Hybrid URL strategy: only depth-1 changes the URL; deeper navigation is in-memory; `closeDrawer` uses `replace` to avoid history pollution. Browser back at any depth dismisses the drawer (modal-like at depth 2+).
- DetailBar component: back arrow (hidden at depth 1), breadcrumb (clickable to jump levels), copy-link button (shares the current top of stack — which may differ from the address bar URL at depth 2+), close-all button.
- `ResourceDetailView` component: composes `useDetailStack` + `DetailBar` + parsed-detail body. Reusable inline by future views (gear/build) without a drawer wrapper.
- `DetailNavContext` lets per-category detail components push cross-links onto the stack without prop-drilling.
- **Wiki preview → compare window.** ddowiki.com put its entire origin (api.php included) behind AWS WAF's JS bot challenge; no embed or cross-origin fetch can pass — only top-level navigation clears it (details: [docs/ddowiki-api.md](ddowiki-api.md)). The embedded preview pane, health pill, and `pingWiki` machinery are removed; wiki links now open a shared left-half compare window (`openCompareWindow` in `src/lib/wiki/client.ts` — one window that every wiki click re-navigates), and the wiki icon sits next to the item name in `EntityHeader`. Restoring API access is an admin ask tracked in [docs/notes/To Do.md](notes/To%20Do.md).
- **Post-review fixes** (same phase, from the branch review):
  - The Raid filter silently hid 262 items (347 → 609): the frontend matched a hardcoded list of raid quest names, 5 of which matched no `quests` row, and several raids were missing outright. Fixed the names, then removed the mechanism — raid-ness now lives in `quest_loot.loot_type` and the frontend just queries it (see the Phase 4c entry, which stays open pending an authoritative scrape). `raidLoot.test.ts` guards the new failure mode: a DB shipped with the column empty.
  - Negative bonus magnitudes rendered as `+-2` (20 bonuses across 54 items — cursed gear). `formatSigned` in `EnchantmentList` now signs only positives.
  - Picker rows were `<div onClick>`: unreachable by keyboard and carrying `aria-selected` on react-window's `role="listitem"` (invalid). Rows are real `<button>`s using `aria-current`, with a focus ring.
  - The `/` and Escape shortcuts were bound to the view root, so they never fired when focus sat outside it (nav-bar click, deep link). Moved to `document`; the drawer now takes focus on open and restores it on close, and carries `aria-modal` plus an `aria-labelledby` pointing at the item heading.
  - Dead code removed: `utils.ts` (duplicate of `isCategory` + an unused `assertNever`), a second divergent `ItemRow` in `types.ts`, `rowsToObjects`/`firstRow`/`escapeLike` in `sqlHelpers.ts`, `EnchantmentLine.statName`, and the unused `level`/`base_value`/`icon` columns in `getItemDetail`.

#### Phase 4c — ETL template/entity normalization + rare loot (done)

Frontend workarounds kept accumulating because the scraper stored half-processed strings. The
2026-07-28 investigation found most of the phase's bullets shared **one root cause**: the pipeline
treated MediaWiki templates as *noise to strip* rather than *structure to expand*, and never
normalized strings where rows are written. Full evidence, with counts and reproduce queries, is in
[DB Errors.md](notes/DB%20Errors.md) (the "systematic audit" section) and
[Item DB Errors.md](notes/Item%20DB%20Errors.md).

**What shipped:**

- **Offline page enumeration.** `build-db` fetched page *wikitext* through the disk cache but
  enumerated page *titles* through the API — and ddowiki's AWS WAF returns HTTP 202 with an empty
  body to every non-browser client, so the pipeline could not run at all. `WikiClient` now derives
  titles from `.wiki-cache/*.json`, falling back to the API when it is reachable.
- **`wiki/templates.py`** — one module owning template → (display text, structured fields),
  replacing three naive `re.sub(r'\{\{[^{}]*\}\}','')` sites plus a copy of the same regex that had
  been ported into TypeScript.
- **Writer-boundary string normalization** — HTML entities (96 rows across 7 columns and 5 different
  parsers, which is why it belongs at the writer), markup in `name` columns (310 rows), and
  case/punctuation name variants (65 groups: `Clicky`/`clicky`, `Armor-Piercing`/`ArmorPiercing`,
  `STR`/`Str`, …).
- **Parser fixes** — item names (`{{Item|X}} (level 12)` was stripped to `(level 12)`, 7 items);
  the `{{Effect|magnitude|bonus-type}}` grammar (153 `effects` rows, 658 `item_effects`, so `Incite`
  now carries `Insightful` instead of `"59"`); nested-template extraction; malformed `+-N` names;
  and `{{Save|Spell|N}}` resolving to stat 21 `Spell Resistance` instead of stat 177 `Spell Save`
  (19 rows — two different game mechanics, which is why the name appeared in both tables).
- **`unique_enchantments`** (762 rows from the cached `{{Unique enchantment}}` pages) with nullable
  FKs from both `bonuses` and `effects`. This is the shared identity the schema previously lost:
  `Deception`'s page carries the sneak-attack text that `Deception +7` alone cannot express. Gives
  the per-row wiki-link tooltip a real target and a URL.
- **Rare loot.** No `rarity` field exists in the item infobox as originally assumed — the sources
  are the infobox `| rare =` field plus `Category:Rare Loot List items` (browser-captured, since the
  WAF blocks clients; see `wiki/rare_loot_items.py`, on the `raid_quests.py` stopgap model). Landed
  as `items.rarity` (139), `augments.is_rare` (79 — the Lunar/Solar Gems live there, not in `items`)
  and `quest_loot.is_rare` (139 mappings). The picker's "Rare only" toggle, which had been silently
  filtering nothing, now works, and drop locations show `(rare)`.
- **Seven validation assertions** in `db/validate.py` (A1–A6 plus A3b), wired to `ddo-data
  validate-db`, each with a test that it *fires* on crafted bad data rather than only passing on
  good data. A1 carries an allowlist with a recorded reason per entry.
- **Writer idempotency.** Because the WAF makes `build-db` an in-place updater, idempotency is a
  correctness property. Four tables were appending a fresh copy of their scrape on every run
  (`crafting_options` +701/run, `crafting_option_bonuses` +349, `crafting_recipes` +127,
  `crafting_recipe_ingredients` +234, `schema_version` +1), and `collapse_value_variants` /
  `renormalize_bonus_names` were mutually recursive with disagreeing rules, flipping 18 negative
  bonuses to positive on every build while row counts stayed stable. Both fixed and pinned by
  `test_writer_idempotency.py`.
- Deleted the frontend `cleanDescription` workaround, whose whole reason to exist was this gap.

**Architectural fact recorded by this phase:** while the WAF stands, `build-db` is an **in-place
updater**, not a rebuild. Anything expecting a clean rebuild — a schema change needing backfill, a
row deletion — needs a repair pass like `repair_stored_rows`. Cache-derived *category* membership is
not a workaround: only 167 of 810 feat pages and 0 enhancement-tree pages are recoverable from
`[[Category:]]` links.

#### Phase 4m — ETL data-quality: audits & investigations

The 2026-07-28 audit swept all 78 tables and found far more than Phase 4c could absorb. **This phase
is a Phase 8 prerequisite**, not optional cleanup. Every item below has counts and a reproduce query
in [DB Errors.md](notes/DB%20Errors.md); this entry deliberately links out rather than duplicating.

Large enough that it should be split when picked up — suggested slices, in order:

1. **The two big recoveries** (highest value; reuse 4c's `wiki/templates.py` while it is fresh):
   - ✅ **`{{Enhancement bonus}}` — shipped 2026-07-30 as slice 1a.** 8,989 rows recovered across
     5,239 occurrences; **Phase 8 is unblocked.** The template turned out to define *nine* kinds,
     not the two the notes recorded, and one invocation can mean up to four rows across two tables
     — full grammar, measured outcome and residuals in [DB Errors.md](notes/DB%20Errors.md).
     `items.enhancement_bonus` was removed from the schema rather than populated. Three follow-ups
     it surfaced (orb energy resistances, `insert_augments`, multi-template bullets) are logged
     there against this phase.
   - ✅ **Augment slots — shipped 2026-08-03 as slice 1b.** 2,444 slots recovered (7,054 → 9,498
     rows): five template families plus a sixth loss the census missed (`{{Augment|X|nocat=…}}`,
     ~578 occurrences the old regex could not cross). The open schema question resolved as a
     **definitions table**: `augments.slot_color` already speaks a compound-label vocabulary
     (`lamordia: miserable (weapon)`), and those labels became `augment_slot_types(id, label
     UNIQUE, family, variant, qualifier)` with `slot_id` FKs on both sides — so
     slot → candidate-augments is an FK join and family is a column, not a parse — which powers
     a candidate dropdown
     on family and Sun/Moon sockets in item detail. `UpgradeableAugment` routes to the effects
     path as the potential effect `Upgradeable Augment` (it marks an upgrade, not a socket).
     Also fixed en route: `insert_augments` skipped its whole enchantment loop for already-stored
     augments (+146 `augment_bonuses` rows when unblocked), and the 102 misrouted junk
     `item_effects` rows are repaired away. Measured outcome and residuals in
     [DB Errors.md](notes/DB%20Errors.md).
   - **Per-system crafting modeling — design decided 2026-08-03, implementation is future
     slices.** All systems stay in the one `crafting_systems` registry with one mechanics shape —
     **slot types → option pools → recipes** — differing per system only in scraper code; a new
     `crafting_slot_types.socket_label` bridges system pools to the `item_augment_slots`
     vocabulary; the prose-scraped `crafting_*` content is rebuilt per system rather than
     repaired (absorbing the 4×-duplication and prose-name bullets); deterministic upgrades
     (`UpgradeableAugment`, `UpgradeableItem`, `VaultsOfTheArtificersUpgrade`) model as systems
     with recipes, and upgrade states are **never synthesized as `items` rows**; the 109
     dual-magnitude augments split rows by relaxing `idx_augments_name` to `(name, min_level)`.
     Full decisions (D-CS1–10), current-state map, and the suggested order (Slave Lords first —
     its sockets already exist and its dropdowns are empty) in
     [Crafting Systems](notes/Crafting%20Systems.md). Frontend deliverable riding the same work:
     **show craftable things (bonuses, augments, slot grants, etc.) on the Resources page** as
     each system's data lands — labeled as craftable, never merged into innate rows (D-CS8) —
     and update the detail-view styling to carry the growing socket/candidate/crafting surface.
2. **Maetrim-fed fixes** (small, high-certainty; these retire a stopgap):
   - 4 missing `bonus_types` rows (`Legendary`, `Penalty`, `Orb`, `Vitality`) account for ~44 NULL
     `bonus_type_id` values outright — `Legendary` is 14/14.
   - `bonus_types` id 3 is named `Insight`; DDO calls it `Insightful`, and our own scraped data
     agrees with DDO (301 vs 289). User-visible in every bonus-type badge.
   - `Quests.xml` flags `IsRaid` on exactly 41 quests — the same count as the wiki's Raids page — so
     `game_data/raid_quests.py` can be **deleted and replaced** rather than waiting for the WAF. It
     also fills 12 of the 13 NULL-`pack_id` raid quests and both quests missing from `quests`.
3. **Audits and verdicts:**
   - 31 columns 100% NULL and 8 under 5% — each needs "populate or drop". (Was 32;
     `items.enhancement_bonus` was dropped outright in slice 1a once bonus rows proved to be the
     only shape Phase 8 needs.) Two need a decision first:
     `item_augment_slots.augment_id` (6,887 rows — what is socketed is a *build* choice, so it may
     belong in `user.db`; decide before Phase 8) and the `weapon_proficiencies` model (3 rows backing
     three all-NULL FK columns; relevant to Phase 7).
   - **`quests` conflates quests with other loot sources** — `insert_quest_loot` auto-creates a
     `quests` row for every loot category it discovers, so the table holds expansions
     (`Magic of Myth Drannor`, 205 items), wilderness areas, crafting stations (`Ritual Table`),
     taverns (`Blue Water Inn`, 160) and loot categories. 121 of the 122 pack-less rows have pack,
     patron, level *and* zone all NULL because **no pack applies**. User-visible: **1,995 of 4,797
     items with a drop location (42%) show no pack on any of them**, and the detail view labels a
     crafting altar the same as a raid. Needs a loot-source **type** (or those rows moved out of
     `quests`), not a pack backfill — inventing a pack for a crafting station would be wrong. Also
     blocks Phase 4d's "Content you own" filter, which gates on pack ownership.
   - Content gaps: 830 items with no bonus or effect (391 with nothing at all), 242/680 quests with
     no loot rows, 430/1,279 augments with no bonuses, `filigrees.icon` 0/365.
   - 198 orphaned `bonuses` and 137 orphaned `effects` — audit before deleting, since an orphan may
     mean a *consumer* table is incomplete rather than the row being junk. (Now 73/15 after 4c's
     dedupe; that is the recorded A6 warning baseline.)
   - **Crafting-table duplication is a bug, not data:** `crafting_options` holds exactly 4 identical
     copies of each of 1,119 options, and `crafting_recipes` 4 × 127 — four historical build runs.
     4c stopped the growth but left the copies. The structural fix is a `UNIQUE INDEX` matching this
     repo's convention elsewhere, which cannot be created until the copies are merged (their
     `crafting_option_bonuses` / `crafting_recipe_ingredients` children need merging too).
   - Modelling decisions: `{{SpellPower|potency}}`'s 773-row fan-out across 11 elemental stats vs one
     `Universal Spell Power` row (**needed before Phase 6** — it changes what the engine sums);
     `{{HELstats}}` multi-stat loss; `Clicky` (232 rows) duplicating `item_spell_links`
     (**before Phase 12**); set bonuses needing the item router's three-way routing so a named
     *effect* conferred by a set has somewhere to go other than `bonuses`; the 12 named tables with
     no `wiki_url` column.
   - Remaining markup: `crafting_options.description` (344 HTML-tag rows) and `feats.note` (137 wiki
     list markers) — 4c fixed only the columns the Resources view renders. Also ~9
     `crafting_options.name` rows holding whole paragraphs.
   - `items.minimum_level = 0` on items that should be ML 1, plus 315 ML disagreements with Maetrim.
   - The 87 `wiki_url IS NULL` + 60 `dat_id` non-named-item audit; 25 binary `augment_bonuses` rows;
     the 25 zero-magnitude `{{Absorption|X|0|N}}` rows; item 2396's upgrade edge.
   - **Decide whether to recommit a rebuilt `ddo.db`.** The committed database is not a build output:
     one `build-db` run from it adds ~752 items from the cache and raises a new
     `items_have_equipment_slot` warning. 4c deliberately shipped the smaller, reviewed delta.

#### Phase 4d — Filter UX overhaul

Filters today are scattered across the top bar (Slot select, Pack select, Stats multi-select, ML range inputs, Rare/Raid toggles). Each new filter we add (and Phase 4d/4f bring more) makes the bar wider and harder to scan. Four changes together fix this:

- **Unified filter UI.** Replace the strip of disparate controls with a single filter surface (popover or inline panel) that lists every available filter in one place. Active filters render as removable chips above the result list — visible at a glance, one-click clear. Removes the "where's the rare toggle vs the slot select" cognitive split.
- **Tiered visibility for rarely-used filters.** Some filters (Slot, Pack, Stats, ML) get used constantly; others (per-stat to-hit, per-stat to-damage, weapon proficiency, material, binding, augment-slot color, future power-user fields) are useful occasionally and would clutter the primary surface. The unified UI groups filters into "common" (always visible) and "more" (collapsed behind a disclosure or secondary tab) so adding new filters doesn't degrade the day-to-day view. Goal: every filter we'd reasonably want is *available*, not *visible*.
- **Searchable selects.** The Pack dropdown already has 50+ options and will grow; Stats, future Bonus-type, and future Patron filters have similar shapes. Replace the native `<select>` with a typeahead-style combobox so users can find an option by typing instead of scrolling. Build it as a **shared primitive in `src/components/`** serving every filter dropdown alike — Pack, Stats, per-raid, future Bonus-type/Patron — with `StatsMultiSelect` migrating onto it (preserve its capture-phase Escape precedence over modal dismissal; see `useModalBehavior`'s bubble-phase contract). Deliberately *not* built on the Phase 4i `<Modal>` — combobox popovers are non-modal anatomy (no backdrop, no inert, focus stays in the trigger's flow). Library research (2026-07-26): **Base UI**'s `Combobox` (`multiple` + filtering; headless, token-friendly; MUI + ex-Radix team; 1.0.0-rc, pushed daily, 439k wk downloads) is the best fit and matches the tech-stack section's existing Base UI earmark; runner-up downshift (hooks-only, 4.2M wk). Radix has no combobox; react-select drags in emotion; Headless UI assumes Tailwind. Re-verify Base UI has reached 1.0 stable when this phase starts.
- **Per-raid filter.** Today "Raid" is a boolean toggle (any raid) and pack is a separate dropdown — neither lets the user filter to a *specific* raid. Add a Raid filter (combobox listing the entries in `KNOWN_RAID_QUESTS`, or the `is_raid` quests once the Phase 4c migration lands) so "show me items that drop from Tower of the Twelve" works directly. The boolean "any raid" toggle can stay as a quick-access shortcut alongside the per-raid select, or fold into "Raid: Any" inside the unified UI.
- **"Content you own" filter** — items whose source quests the user can actually run, from an account-type setting (F2P/Premium/VIP) + owned packs/expansions + an "apply free code" shortcut for the recurring pack-giveaway codes. Needs spec expansion before starting; ownership model, wiki sources, and data prerequisites are in [docs/notes/Resource View.md](notes/Resource%20View.md).

Concrete rarely-used filters to seed the "more" group with at launch:
- **To-hit by stat** — "show items that grant a to-hit bonus from <Stat>". Useful for builds that swap which stat drives weapon attack rolls (e.g. Finesse builds wanting Dex-based to-hit gear). Backing data lives in `bonuses` rows scoped to the to-hit stat-mod.
- **To-damage by stat** — same shape, different relation. "Items that grant to-damage from <Stat>" for stat-swapped damage builds.
- Materials/binding/augment-slot color filters can fold into the same group as they ship.

Out of scope: filter persistence (that's Phase 4g), saving named filter presets (later).

#### Phase 4e — Stat DB Rework

> **Needs spec expansion before an agent can start.** The bullet below says bonuses "currently live
> as denormalized fields per item/feat/etc.", but `ddo.db` already has a populated `bonuses` table
> (4,948 rows) alongside `item_bonuses` / `enhancement_bonuses`. What "promote to their own table"
> means relative to those three existing tables is unresolved. Write out current schema -> target
> schema, and what `bonus_alias` keys off, before picking this up.

Detail: [docs/notes/Stat DB Rework.md](notes/Stat%20DB%20Rework.md). Promotes each bonus to a first-class DB row and adds a `bonus_alias` table so user input (typos, alternate names) can resolve to canonical stats. Required before Phase 4f Categories ships a first-class stats category, and before Phase 5+ Resource Report View can offer alias-aware search in the bonus editor.
- Promote bonuses to their own table so each bonus is a queryable row (see the blocker above -- reconcile with the existing `bonuses` / `item_bonuses` / `enhancement_bonuses` tables first)
- Add `bonus_alias` table mapping freeform aliases (typos, alternate spellings, common shorthand) to canonical bonus rows; powers fuzzy search in user-facing bonus selectors

#### Phase 4f — Categories
- Wire feats, enhancements, a new bonuses category, and a new stats category into the picker. Each gets its own query layer + detail component. Bonuses category surfaces backlinks to items/augments/enhancements/sets that apply them. Once stats are a first-class category, swap the bonus-row wiki-link icon (currently `<a target="_blank">` opening ddowiki) to call `pushDetail({ category: 'stats', id })` so the inspector navigates *inside* our app — keeps users in the same view, builds the same cross-link affordance bonuses already have between items/feats/etc.

#### Phase 4g — Polish
- Filter persistence per category via `useLocalStorage`. Expand Fuse search to material/binding/item_category.
- **Improve the visual treatment of the Raid and Rare indicators.** Phase 4c extracted `ResourceChip` so the picker list and the item-detail "Drops from" line render the same fact identically, but the styling is inherited rather than designed: `raid` is accent-tinted and `rare` is neutral (`--text-secondary` / `--border` / `--bg-subtle`), which was a picker-local choice made when raid was the only notable property. Open questions for a proper pass — should rarity get its own hue (the genre convention is gold/amber) rather than borrowing the accent or a neutral; should the two chips read as the same *kind* of thing at all, given one is a drop-source property and the other a loot-list property; and do they belong as chips, as a column in the Phase 4g sortable table (see below), or as inline name decorations. Note that no shipped item is currently both raid *and* rare, so the side-by-side case is untested against real data. Detail: [docs/notes/Resource View.md](notes/Resource%20View.md).
- **Suppress the empty metadata line under "Drops from".** When a drop location has no pack, patron, zone, npc or level, `ItemDetail` still renders the `·`-joined meta span and leaves a blank line (visible on item 3179). Mostly a symptom of the loot-source problem in Phase 4m, but the guard is worth having regardless.
- **Item icons in the picker list.** Show each item's icon beside its name so the list is scannable by shape/colour rather than by reading every row (reference: ddo-builds.com's item list). Blocked on an icon-asset source — see the image-extraction item in [docs/notes/To Do.md](notes/To%20Do.md); resolve that first, then wire icons into both the stacked-list and sortable-table picker modes. Needs a placeholder for items with no icon and must not shift row height (virtualized list assumes fixed rows).
- **Promote the wiki compare window to a first-class "linked window" feature.** Have the window follow the selected resource automatically (not just explicit link clicks), and give both the picker list and the detail view a pair of buttons — one that drives the linked window, one that opens a plain new tab in the current window. Detail: [docs/notes/Resource View.md](notes/Resource%20View.md).
- **Convert the picker to a true sortable table.** Today's picker is a virtualized stacked list: each row shows the name on top and meta fields (`ML · Slot · Pack`) inline below. That works at narrow widths but can't be sorted or column-aligned. Phase 4g reshapes it into a virtualized table with explicit columns (Name, ML, Slot, Pack, Rarity-or-Raid chip, etc.) and clickable column headers that toggle ascending/descending sort. Browse mode (wider picker) is the right home for this since the table needs horizontal space the drawer-sliver doesn't have. Stacked-list view stays as the narrow-mode fallback. The current chips (Raid/Rare) collapse into either a dedicated column or remain as inline name decorations — decide when implementing.

#### Phase 4h — Shared-hook state cleanup (done)

`useTheme` ([../src/hooks/useTheme.ts](../src/hooks/useTheme.ts)) used the
`useState + useEffect` anti-pattern for shared state: each consumer held its
own copy, so `toggle()` only updated the caller and every other consumer kept
rendering the stale value until an unrelated re-render. Latent rather than
visible, because `SettingsView` was the only consumer and most theme reaction
runs through CSS `[data-theme]` selectors.

- Refactored to `useSyncExternalStore` against a module-level store, matching
  `useDatabase` / `useModalActive` (pattern: [state-management.md](state-management.md)).
  Public API `{theme, toggle}` unchanged — no call-site edits.
- The `data-theme` attribute write moved from the consumer effect into a
  single `applyTheme` function that both the init path and the `setTheme`
  mutator go through, so the document can never disagree with the store.
  Init is lazy (first read, not import time) so it can't snapshot
  localStorage/matchMedia before callers or tests stage them.
- **Bug caught in review, fixed in this phase:** the first cut wrote
  `data-theme` only in the mutator. Because the store resolves lazily and
  `SettingsView` is the sole consumer, the inputs could move between page
  load and the first Settings visit (OS light/dark schedule flipping, or
  another tab toggling and writing localStorage). The store then resolved to
  a theme the page wasn't rendering, Settings highlighted the wrong button,
  and clicking the right one did nothing — its handler only calls `toggle()`
  when the value differs. Applying on init closes it.
- Init deliberately does **not** persist to localStorage, so a theme the user
  never chose isn't latched — they keep following their OS until they pick a
  side. (The old mount effect latched it on the first Settings visit.)
- `useTheme.test.ts` covers initialization precedence (stored value > system
  preference), DOM/localStorage sync on toggle, the store/document agreement
  above, and the cross-consumer propagation that the old shape failed.
  `_resetThemeForTests()` clears the module cache between cases.
- `src/hooks/theme.ts` (accent helpers — not a hook) was left in place;
  the move to `src/lib/` is deferred to Phase 4k with the other file moves.

Audited and deliberately left alone: `useFaviconAccent` owns no
consumer-facing state (pure DOM-side-effect manager via MutationObserver).
`useWikiHealth` no longer exists — Phase 4b removed the health pill and
`pingWiki` machinery entirely.

#### Phase 4i — `<Modal>` primitive consolidation (done)

**Shipped 2026-07-26** on `phase-4i-modal-primitive`. As specced below, plus scope added
mid-phase: the behavioral core landed as a shared `useModalBehavior` hook
(`src/hooks/useModalBehavior.ts` — Escape, focus save/restore, Tab trap, `useModalActive`
opt-in) with `<Modal>` (`src/components/Modal.tsx`, variants `centered`/`drawer-right`) as a
thin shell over it, and the **mobile fullscreen nav** (<600px) adopted the hook directly
(`registerActive: false` — it *is* the chrome the refcount inerts; AppLayout wires background
`inert` from a new `useMediaQuery` hook instead). The drawer's box-shadow was dropped per the
no-shadow design principle, and ConfirmModal's `\n` message collapse was fixed
(`white-space: pre-line`). Notable post-review fix: focus restore under `<StrictMode>`'s
double-invoked effects (restore target read into a closure local at effect setup, never nulled).

Original spec follows.

Modal-shape UI is currently hand-rolled in two places that should share
one base component:

- **Resources drawer** ([ResourcesView.tsx](../src/features/resources/ResourcesView.tsx) + [ResourcesView.css](../src/features/resources/ResourcesView.css))
  — drawer panel, backdrop element, Escape/backdrop-click handlers, and
  the `useModalActive(id !== null)` opt-in are all inline.
- **`ConfirmModal`** ([../src/components/ConfirmModal.tsx](../src/components/ConfirmModal.tsx))
  — likely has its own backdrop + dismissal logic since it predates the
  drawer. Audit needed to confirm what's there.

What `useModalActive` solved was *one half* of the modal contract:
background-inert via refcount + `useSyncExternalStore`. The *other half*
— backdrop, positioning, dismissal handlers, focus trap — is still
copy-pasted per modal. Each future overlay (gear comparison sheet,
settings modal, etc.) would re-roll the same chrome.

**Goal:** extract a `<Modal>` (or `<Overlay>`/`<Sheet>`) primitive that
packages:

- `useModalActive(open)` automatic opt-in while open.
- Backdrop element with click-to-dismiss (callable `onClose`).
- Escape-key handler for dismiss.
- Z-index from `--z-overlay` / `--z-modal` tokens.
- Optional focus trap (Tab cycles inside; restore focus on close). Can
  skip the third-party `focus-trap-react` for now and do a minimal
  implementation — first/last focusable element references + a Tab
  handler that wraps.
- Slot props for header / body / footer or generic `children`.
- Position variant prop: `centered` (ConfirmModal style), `drawer-right`
  (resources style), `sheet-bottom` (mobile, future).

**Migration scope** (in this same phase):

- Audit `ConfirmModal` to identify the duplicated chrome.
- Extract the primitive in `src/components/Modal.tsx` (or similar).
- Re-implement `ConfirmModal` on top of the primitive — should drop
  ~50 lines of chrome and inherit dismissal/inert for free.
- Re-implement the resources drawer on top of the primitive (variant:
  `drawer-right`). Drops the `.resources-drawer*` CSS and the inline
  Escape/backdrop handlers from ResourcesView.
- The picker's local `inert` stays (it's a sibling of the drawer in the
  same view, not chrome outside the modal).

**Out of scope:**
- Animation library / portal-based render-to-body. Drawer is already
  position: fixed; portal is incremental, not load-bearing for behavior.
- Specialized focus management library — minimal in-tree Tab-trap is
  enough for the immediate use cases.

#### Phase 4j — Licensing & attribution housekeeping (done)

**Shipped 2026-07-27** on `phase-4j-licensing`. As specced below.

README/repo gaps found while surveying comparable sites (2026-07-24), expanded 2026-07-27 to add
site metadata (version, last release date, GitHub link) modeled on ddo-builds.com's main page.

- **Add a `LICENSE` file.** README says "MIT" but no license text exists in the repo — a stated license with no license file is legally ineffective.
- **Add an IP / fan-project disclaimer** to the README: DDO is © Standing Stone Games; game content, names, and assets belong to their owners; this is an unaffiliated fan tool. We publish a site built on data extracted from game files and scraped wiki content — currently with no such notice.
- **Credit DDO Wiki in the README Credits section.** We scrape it heavily (`ddo-data scrape`, `.wiki-cache/`, [ddowiki-api.md](ddowiki-api.md)); wiki content is typically CC-BY-SA, so attribution is a requirement, not a courtesy.
- **Add a short Deployment section** to the README: push to `main` → GitHub Actions → GitHub Pages (~5 lines).
- **Landing-page footer with site metadata** (reference: ddo-builds.com): version number, last-updated date (newest [sitePatchNotes.ts](../src/features/landing/data/sitePatchNotes.ts) entry), and a GitHub link (reuse `REPO_URL` from [../src/lib/githubIssue.ts](../src/lib/githubIssue.ts)). Version injected at build time via a Vite `define` reading `package.json`.
- **Versioning convention.** `package.json` starts at `0.0.0`; **patch-bump on every push to `main`** (a step in the weston-git merge workflow, recorded as a repo gate in `CLAUDE.md`). **The major version stays 0 until the developer explicitly declares the site fully released**; minor/major bumps happen only on explicit instruction.
- **Package metadata**: `license`/`repository`/`homepage` in `package.json`, `license` in `scripts/pyproject.toml`, auto-updating badges (version, last commit, license, CI) in the README.

#### Phase 4k — File-structure cleanup (done)

**Shipped 2026-07-28** on `phase-4k-file-structure`. Findings from the 2026-07-24 structure audit,
re-verified against the tree before implementing — which corrected two of them.

- `CharacterView.tsx` + `.css` moved from `character/components/` to the `character/` feature root,
  matching `LandingView` / `ResourcesView` / `SettingsView`.
- `character/contexts/` created, holding `characterContext.ts` (the context object + its value type)
  and `CharacterProvider.tsx` (the provider component), mirroring `resources/contexts/`. Both files
  were renamed from `context.ts` / `CharacterContext.tsx` — see the case-collision note below.
- `src/test-utils/` merged into `src/test/`; `renderWithRouter` had one consumer. This also closed a
  gap where `tsconfig.app.json` excluded `src/test` from the app typecheck but not `src/test-utils`.
- `src/components/Icons.tsx` deleted outright, along with the 29-name re-export block in the
  components barrel. **The original bullet's premise was wrong on all three counts** and is recorded
  here so nobody re-derives it: there were 29 exports, not 28; *all 29* were dead, not 26; and no
  lucide swap was needed. `AppNavBar` declares its own local `SkillsIcon` wrapping lucide's
  `TableProperties` — a name collision, not an import — and `ChevronRightIcon`'s only importer,
  `CollapsibleSection`, had itself been orphaned since `fdfe9ab` (2026-04-11) replaced hash routing
  with real routes. Lesson: dead-code audits must resolve import edges, not match identifiers.
- `CollapsibleSection` (`.tsx` + `.css`) deleted — dead since April. Prior art recorded on Phase 7,
  which is the phase that wants the concept back.
- `src/hooks/theme.ts` moved to `src/lib/accent.ts` — it holds zero React (data + DOM/localStorage
  accent helpers). Renamed from `theme.ts` on the way because it collided semantically with
  `hooks/useTheme.ts`, which owns light/dark; the moved module owns the accent palette and every
  function in it is `*Accent`. `THEMES` became `ACCENT_PRESETS`. The `src/hooks` barrel dropped the
  re-export rather than pointing it at `../lib` — a barrel re-exporting a sibling directory's module
  misreports what it owns. `SettingsView` imports it directly, matching `sentry` / `githubIssue` /
  `wiki/client`, none of which have a barrel.
- `useDebouncedValue` added to the `src/hooks` barrel; it was a real hook with a real consumer that
  the barrel omitted, so `PickerPanel` reached it by direct path.
- **Bug found and fixed in review, then a second half of it found by hand:** `SettingsView` had a
  private `getActiveAccent()` that parsed only the legacy `{accent, hover}` JSON, while `applyAccent`
  writes a plain string — so `JSON.parse('#b8962e')` threw, the catch swallowed it, and *no accent
  swatch showed as selected after a page reload*. The accent itself still applied, so only the
  indicator was dead. The first fix routed both formats through one parser but still returned `null`
  for "nothing stored", while `restoreAccent` *applied* `ACCENT_PRESETS[0]` in that same case — so a
  fresh visitor saw Gold applied and Gold unselected. `src/lib/accent.ts` now exports
  `resolveActiveAccent()` as the single answer to "what accent is in effect" (stored when usable,
  default otherwise) and `restoreAccent` is one line over it, so the applied value and the selected
  swatch cannot disagree. `readStoredAccent` went back to being module-private — with the resolver
  public it had no callers, and an exported raw-null reader is what let a consumer invent its own
  fallback in the first place.
- **Then a third case, found by hand after both fixes:** a legacy entry whose color is not in
  `ACCENT_PRESETS` (e.g. the old `#d4af37` gold) parses fine, so it was neither absent nor unusable —
  it applied a color no swatch could represent, leaving the grid with nothing selected and no way to
  get back to it. `resolveActiveAccent` now resolves against the preset list itself (case-insensitively,
  returning the preset's own casing), so absent, unreadable, and off-palette all collapse to the
  default. **Trade-off, deliberate:** this discards a stored off-palette color on next load rather than
  keeping it applied-but-unselectable. The grid is the only way to choose an accent, so a color outside
  it is stale data from an older palette, not a preference a user could have expressed.
- **Lesson worth more than the fix, and it repeated three times:** every wrong state here was *pinned
  by a passing test*. `selects no swatch when nothing is stored` asserted the first divergence as
  intended behavior — the three-way split read as deliberate because it was commented as deliberate,
  and writing the test against the comment's claim rather than against the other half of the module
  made it permanent. The off-palette case survived because *every* test seeded `localStorage` with a
  value taken from `ACCENT_PRESETS`, so the data could not fail to match; the round trip was verified
  against the test's own assumption instead of the app's. The older cases were worse — they asserted
  the module round-trips arbitrary hexes like `#246810`, a state unreachable through the UI, pinning a
  contract nothing depends on while the reachable failure went uncovered. Three fixes now stand on two
  invariant tests rather than more case tests: `resolveActiveAccent` agrees with `restoreAccent` across
  every storage state, and Settings always applies an accent exactly one swatch reports as selected —
  the latter being the only assertion that can catch "applied a color the grid does not contain",
  since that failure has no expected swatch to name. Recorded as a Test completeness rule in
  [`.claude/skills/weston-workflow/SKILL.md`](../.claude/skills/weston-workflow/SKILL.md).
- **Dropped as stale:** the original bullet to delete empty `src/assets/` and
  `src/features/gear/components/`. Neither path existed.
- **macOS case-collision, worth knowing:** `characterContext.ts` and `CharacterContext.tsx` cannot
  coexist in one directory. Vite resolves `./CharacterContext` by trying `.ts` before `.tsx`, and on
  a case-insensitive filesystem `./CharacterContext.ts` matches `characterContext.ts` — so the
  barrel's provider export silently resolved to the context-object module (16 tests failed with
  `Element type is invalid`). `tsc -b` did **not** catch it. Hence `CharacterProvider.tsx`. Recorded
  as a rule in [`.claude/rules/frontend.md`](../.claude/rules/frontend.md).

#### Phase 4l — DDOBuilderV2 data cross-check utility

[Maetrim's DDOBuilderV2](https://github.com/Maetrim/DDOBuilderV2) — the dominant desktop planner —
ships its game data in its repo. That's an independent, well-maintained dataset covering the same
entities as `ddo.db`, which makes it a free correctness oracle: anywhere the two disagree, one of us
is wrong, and each disagreement is either a bug to fix or a gap to fill.

**Permission and attribution.** The author has granted permission to use this data. The repo carries
**no LICENSE file** (GitHub reports `license: None`), so the grant is the only basis for use — record
who granted it, when, and in what form alongside this entry, and **credit Maetrim in
[README.md](../README.md)** when anything sourced from it ships. This supersedes the earlier
"do not vendor their XML into this repo" rule, which assumed no permission existed.

**What the dataset actually contains** (enumerated 2026-07-28 — the earlier "ships its game data as
XML files" undersold it):

- **`Output/DataFiles/Items/` — 8,511 `.item` files, 13.2 MB**, each with an explicit `<BonusType>`
  per `<Buff>`. That is precisely the field NULL on 782 of our `bonuses` rows. Top `<Buff><Type>`
  values: `WeaponEnchantment` 3,569, `AbilityBonus` 1,405, `SkillBonus` 979, `ArmorEnchantment` 958,
  `SpellcastingImplement` 755, `Fortification` 509.
- **`Quests.xml` — 569 quests** with `Patron`, `AdventurePack`, `Levels`, per-difficulty XP, and
  `IsRaid` on exactly 41 (matching the wiki's Raids page).
- **`Output/DataFiles/ItemImages/` — 8,644 PNGs**, a candidate answer to the icon-asset question
  blocking Phase 4g and the image-extraction item in [To Do.md](notes/To%20Do.md).
- 115 enhancement trees, 32 augment files, 28 classes, 30 races, 65 filigree sets, `SetBonuses.xml`,
  `BonusTypes.xml`, `Spells.xml`, `Feats.xml`.

**Name mapping is much easier than this entry originally feared.** Normalizing to `[a-z0-9]` maps
**6,928 of our 7,246 distinct item names (95.6%)** and 543 of 679 quests. The "surface unmappable
entries as their own report section" design is still right, but that section will be short.

- **New `ddo-data` CLI command** (e.g. `ddo-data compare-ddobuilder <path-to-checkout>`) that diffs
  `ddo.db` against a local checkout. A sparse clone of `Output/DataFiles` is 85 MB, so the command
  should keep taking a path rather than vendoring.
- **Report shape**: entities present in one dataset but not the other, and field mismatches (ML,
  bonus values, augment slots) where entities map by name.
- **The oracle is not infallible.** `'+1 Starter Docent'` has `DropLocation = 'Enhancement bonus'`, a
  field mix-up on his side. Findings are leads to verify against the wiki, not truth to import.
- **Scope note: the manual pass is already done.** The cross-check was run by hand during Phase 4c
  planning and its findings are recorded in [DB Errors.md](notes/DB%20Errors.md) — including that his
  `DropLocation` could fill 2,162 of our 2,452 loot-less items, and that the "1,582 items he has that
  we don't" is mostly 1,314 level-variant pages (he stores one row per ML tier where we store one per
  item) rather than missing data. So 4l is now **"build the repeatable tool"**, not "discover the
  disagreements", and can be taken in parallel with 4m.
- **Findings feed the existing error logs** ([DB Errors.md](notes/DB%20Errors.md),
  [Item DB Errors.md](notes/Item%20DB%20Errors.md)) with evidence + reproduce queries, and get fixed
  Phase 4m-style.

#### Phase 5b — Resource Report View

Split out of Phase 4 because both items need `user.db`. Runs after Phase 5; blocked until then.
Detail: [docs/notes/Resource Report View.md](notes/Resource%20Report%20View.md).

- Inline correction system (local overrides stored in `user.db`, auto-cleanup on DB update) — depends on Phase 5's `user.db`.
- GitHub issue submission with duplicate detection. Depends on Phase 4e (Stat DB Rework) for the bonus-alias search inside the editor, and Phase 5 (`user.db`) for local override storage.

### Phase 5: Characters View & Build Context

Detail: [docs/notes/Characters View.md](notes/Characters%20View.md) (reincarnation-button bug + flow copy pass).

**Persistence stack (build first):**
- `user.db` schema via sql.js + `initUserDb()`
- IndexedDB round-trip: `db.export()` to Uint8Array, debounced write-through (~200ms)
- `VACUUM` after schema changes or bulk imports
- Zustand stores (`characterStore`, `buildStore`, `gearStore`, `uiStore`) hydrated from `user.db`. Move nav bar expanded state + resize logic from `App.tsx` into `uiStore` so both App (grid columns) and AppNavBar (CSS class) read from the same source.

**Features:**
- Character/build management, switching
- Past lives (stacking, placeholders, reincarnation)
- Tomes, import/export (export = download raw `user.db` file)
- Gear set management section
- Owned content settings

### Phase 6: Stats Engine
- Stats pipeline: `computeStats.ts`, `bonusStacking.ts`, `statSources.ts`
- `StatsPanel.tsx` replacing `BuildSidePanel.tsx`
- Breakdown popover, search, pin, stat highlight
- Vitest unit tests for stats engine (typed/untyped stacking, derived stats, edge cases)

**Rules reference** (applies to Phases 6–8): the game's stacking/effect-resolution rules are documented in [stacking-rules.md](stacking-rules.md) (extracted 2026-07-25 from DDOBuilderV2's model via [ddo-builds.com's open-source TS port](https://github.com/johngalt316/ddo-builds)) — read it before designing the engine. Consult their `src/engine/` only as *documentation of the game's rules* — don't copy code or data verbatim: the repo is MIT-labeled, but it's a port of DDOBuilderV2, which has **no license** (all rights reserved), so the MIT grant is only as solid as its unlicensed upstream. Game mechanics themselves are facts and not copyrightable; implement independently against our own SQLite data. Credit both repos in the README when the engine ships. Open design decision recorded in stacking-rules.md: whether to mirror DDOBuilderV2's item-vs-non-item competition split or apply type competition uniformly.

### Phase 7: Build Plan (single scrollable page)
- Build header (race, point buy, base stats, tomes, class set)
- Class set: declare up to 3 classes, per-level dropdown filtered to that set, and bulk class swap (remap every level of one class to another in a single action, with a warning listing dependent choices that break)
- Level progression (classes/feats + skills)
- Level-Up modal (per-level feat picker, skill allocator, ability score increase) with prereq + pool validation and incomplete-level badges on the level row.
- Spells (card display + picker modal)
- Enhancements (N-tree side-by-side, DDO layout)
- Reaper enhancements
- Destinies (destiny selector + twist bar)
- Wire nav bar Build Plan sub-items to `scrollIntoView()` anchors for each section (Level Plan, Skills, Spells, Enhancements, Reaper, Destinies). Active sub-item tracks scroll position.
- **Collapsible-section primitive — prior art.** The per-section collapse specced above needs a shared
  component. One existed (`src/components/CollapsibleSection.tsx`) and was deleted in Phase 4k as dead
  code; recover it with `git show 8f1f648:src/components/CollapsibleSection.tsx` (and `.css`). Worth
  reusing: its `grid-template-rows: 0fr → 1fr` expand, which animates to true content height without a
  hardcoded `max-height` — but add the `transition` property it never had, so it animates instead of
  snapping. Worth rewriting: its state model. It was uncontrolled (`useState(defaultExpanded)`), where
  this phase needs collapse state persisted in `user.db` — so controlled `expanded` / `onToggle` — plus
  a `summary` slot in the header for the collapsed progress text ("Skills: 0/320 allocated"). Two other
  chevron-expand idioms exist to reconcile against: `SitePatchNotes.tsx` rotates a chevron via an
  `is-open` class, `PastLifeStacks.tsx` swaps `ChevronDown`/`ChevronRight`.

### Phase 8: Gear
Detail: [docs/notes/Gear View.md](notes/Gear%20View.md) (gear-mechanics bullets).
- Full overview + side-by-side slot editor
- Item search with stacking indicators
- Augment/filigree/crafting/upgrade inline
- Gear stats panel (bonus type tracking)
- Gear set management (per-build + standalone)

### Phase 9: Comparison Mode
Detail: [docs/notes/Gear View.md](notes/Gear%20View.md) (comparison-view bullets).
- Click-to-compare in Characters view (connector line from comparison -> active build) + nav bar `vs X [swap][x]` indicator
- Comparison display for stats panel, build overview, and gear
- Swap button + "What if" copy workflow
- Unsaved build badge (red dot on nav bar build label for temp copies; reused by Phase 14 for shared builds)
- Past life warning for comparison
- Build warning calculation + bottom bar

### Phase 10: Farm Checklist
- Item acquisition list from all gear sets (checkboxes, farm locations, wiki links)
- Acquisition path selector per item (farm / craft / purchase)
- Materials summary (summed across all crafting paths, deducted when acquired)
- Purchasable augments (DB pipeline addition)

### Phase 11: DB Pipeline -- SLAs, Abilities, Purchasable Augments
- Schema: abilities table (source, linked spell, attack type, cost, damage, modifiers)
- Schema: metamagic applicability for SLAs
- Schema: purchasable augments (vendor, cost, location)
- Wiki scraper for SLA/ability data from enhancement + feat descriptions
- Populate via `build_db` pipeline

### Phase 12: Build Overview
- Feats (passive + active with sources)
- Ability cards (min/max/avg, click -> damage calc)
- Buffs (spell buffs, conditionals, stances, external, stacks)

### Phase 13: Settings View Cleanup
Currently a minimal placeholder (theme + accent picker). Belongs late because knowing what *needs* a setting depends on what features exist.

- Restructure into sections: Display, Game Content, Data Management, About
- Wire to Zustand stores (replace direct localStorage access)
- Owned content settings (adventure packs / expansions)
- Data management (export/import `user.db`, reset, storage usage)
- About / metadata (version, build commit, GitHub links)
- Responsive layout (current `max-width: 400px` is too narrow)
- Audit against design-system tokens (post-css-refactor merge)
- **Dedupe accent parsing between `index.html` and `src/lib/accent.ts`.** The pre-paint inline script
  (`index.html` lines 15-30) re-implements both the legacy-`{accent, hover}`-JSON and plain-string
  branches so the accent applies before first paint. Phase 4k gave `accent.ts` test coverage pinning
  that behavior; the inline copy is now the untested twin, and nothing catches it drifting. Any fix has
  to keep the pre-paint guarantee — inlining a built module, or accepting a flash of the default accent.
  The same script also duplicates `useTheme`'s light/dark resolution, so both halves are in scope.
  The rule it has to match is now explicit: absent or unusable resolves to `ACCENT_PRESETS[0]`, same as
  `resolveActiveAccent`. The inline copy instead leaves `:root` standing, which is invisible only
  because `:root` is Gold — the exact coincidence that hid this phase's swatch bug.

### Phase 14: Build Sharing

Share builds via URL links without a backend. Complement to the file-based import/export in Phase 5.

**Share codec** (`shareCodec.ts`):
- Encode/decode builds to URL-safe compressed strings using lz-string (`compressToEncodedURIComponent`)
- Before committing to lz-string, evaluate native `CompressionStream('deflate-raw')` + base64url: zero dependencies, and deflate typically compresses JSON better. lz-string's edge is synchronous API + directly URL-safe output; lz-string last published 2023-03 (stable/finished, not abandoned)
- Use numeric DB IDs (integer PKs from `ddo.db`) instead of string slugs for compactness
- Version prefix (`v1:`) for future format evolution
- Core build fields: race, class split, feats (with level slots), enhancements, destinies, ability scores
- Optional tier: gear set (items + augments + filigrees) — included when total URL stays under safe limits (~2,000 chars)

**Share route & view**:
- `/ddo-tools/share?b=<compressed>` route handled by router
- Read-only build summary (ShareView) with "Import to My Builds" action — shared build shows unsaved badge (from step 47) until imported
- Graceful error state for invalid/corrupted/truncated links

**UI**:
- "Copy Share Link" button in build overview or build plan view
- Feedback on copy success (toast or inline confirmation)

**Size budget & hosting gate**: If full builds (including gear) consistently exceed ~2,000 chars after compression, explore hosting:
- Self-hosted paste endpoint (Cloudflare Workers / Vercel serverless — free tier)
- GitHub Gist API (requires user auth for creation)
- Evaluate whether static GitHub Pages is still sufficient or if a minimal backend is warranted
- **Empirical data point** (2026-07-24): ddo-builds.com — same domain, comparable build payload — ships lz-string URL-hash sharing *and* a Cloudflare Worker share API (`shareApi.ts`) side by side, suggesting URL-only wasn't sufficient for full builds there. Plan for the gate to trigger.

---

### Phase 15: `.DDOBuild` Import

Import build files from [Maetrim's DDOBuilderV2](https://github.com/Maetrim/DDOBuilderV2), the dominant desktop build planner. Strong acquisition path: existing users arrive with builds already made. Both comparable sites (ddo-builds.com, ddobuildhub.com) support it. Requires Phase 7's build structures; complements Phase 5's file-based import and Phase 14's URL sharing.

- Parse the `.DDOBuild` XML save format (active life/build, per-level classes, ability scores, tomes, feats, past lives, enhancement spends, gear/augments/filigrees, stances) with native `DOMParser` — no XML library. ddo-builds.com's `src/utils/ddoBuildParser.ts` demonstrates the approach and doubles as format documentation; ddobuildhub.com ships `xmlbuilder2` (~374 KB chunk) for the same job — avoid that.
- Map DDOBuilderV2's string identifiers onto our `ddo.db` IDs; surface unmapped entries as import warnings rather than failing the whole import.
- Drag-and-drop + file-picker entry points; imported build lands as unsaved (red-dot badge, Phase 5/14 convention) until the user keeps it.

---

## Verification

A phase is **done** when all of the following hold. Anything less stays `→ NEXT` in the status table.

- `npx vitest run` + `pytest scripts/` -- all pass (both, regardless of which side you touched)
- `npm run lint` + `npm run build` -- no errors
- `npm run dev` -- layout renders correctly; browser-tool screenshot verification per `.claude/rules/frontend.md`
- Feature-specific: can interact with the new UI (click, search, equip)
- **Status table updated in the same commit** -- phase marked `done`, `→ NEXT` moved to the next
  phase, and any `docs/notes/` bullets it shipped marked `✅` or deleted. This step is the one that
  has drifted before; treat it as part of the work, not cleanup.

**Unit tests** (vitest) required for pure logic, by phase: `user.db` migrations (Phase 5), stats
engine (Phase 6), AP validation + feat prereqs (Phase 7), gear stacking (Phase 8), share codec
round-trip (Phase 14). Phase 4c shipped its ETL regression spot-check as
`src/features/resources/queries/etlRegression.test.ts`, which asserts against the real
`public/data/ddo.db` rather than a fixture — a hand-written fixture cannot catch an ETL regression,
because the fixture is whatever we typed rather than whatever the pipeline produced. Extend it
whenever a pipeline invariant gains a user-visible consequence.
