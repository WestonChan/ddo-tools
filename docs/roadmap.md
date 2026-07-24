# Frontend: Layout & Feature Architecture

## Context

All 5 pre-frontend gate audits are complete. The DB has 78 tables, 9,452 items, 810 feats, 3,146 enhancements, 480 spells, 25 classes, 29 races. The existing frontend has solid character/past-life management but gear, enhancements, destinies, level planning, and stats computation are all placeholders. This plan defines the overall UI structure, navigation, and feature modules.

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
- Clean URL routing (History API): `/ddo-tools/characters`, `/overview`, `/build-plan`, `/gear`, `/damage-calc`, `/farm-checklist`, `/debug/:entity`, `/settings`. GitHub Pages SPA support via `404.html` redirect.

### Tech Stack
- React 19 + TypeScript + Vite (keep existing)
- **Zustand** -- in-memory state management. Stores are hydrated from `user.db` on load. Mutations write through to `user.db`.
- **Clean URL routing** -- History API (`pushState` / `popstate`), no library. URLs like `/ddo-tools/build-plan`. GitHub Pages SPA support via `404.html` redirect. Use `scrollIntoView()` for Build Plan section navigation.
- **@dnd-kit/sortable** -- drag/drop for sortable lists (pinned stats, spell order). Handles touch, keyboard, and accessibility.
- **Base UI** (@base-ui/react) -- headless UI primitives for new components (spell picker, enhancement tooltips, gear popovers). Adopt incrementally; don't migrate existing working components.
- **@tanstack/react-virtual** -- virtual scrolling for large lists (9K+ items, 800+ feats)
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
- Class split summary: `Fighter 12 / Rogue 6 / Paladin 2`

#### Level Progression (collapsible, contains Classes/Feats + Skills)
- Vertical list of levels, each row showing:
  - Level number, class dropdown (heroic 1-20 only), feat slots
  - Ability score increase every 4 levels
  - Epic/Legendary levels (21+): no class, epic feat slots only
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
- Gear sets are saved separately (named, stored in localStorage). Can be shared across builds.
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
- All abilities shown by default. Click `[x]` on a card to hide it. Hidden abilities remembered per build in localStorage.
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

- **Active bonuses**: Source name, bonus type, value
- **Suppressed bonuses**: Same-type lower bonuses shown struck through
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
- **Wiki preview**: Right panel embeds the wiki page content inline (fetched via MediaWiki API `action=parse`). Our parsed data shown above, wiki content below -- makes mismatch spotting trivial. Also has "Open wiki in new tab" link.
- **Inline corrections**: When a mismatch is spotted, click "Edit" on any bonus/effect to correct it inline. Changes:
  - Applied to local DB immediately (user's copy is fixed)
  - Accumulated in a corrections log (stored in localStorage)
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

```
src/
  app/
    App.tsx, AppNavBar.tsx           -- modified (feature nav bar)
  features/
    character/                       -- EXISTING (enhance for Characters view + past lives)
    build-plan/                      -- NEW (single scrollable page)
      components/ BuildPlanView, BuildHeader,
                  LevelProgression, LevelRow, FeatPicker,
                  SkillGrid, SpellSection, SpellPicker,
                  EnhancementSection, EnhancementTree, EnhancementNode,
                  ReaperSection, DestinySection, TwistOfFateBar
      hooks/ useLevelPlan, useFeats, useSpells, useEnhancementTrees, useEnhancements
      types.ts
    build-overview/                  -- NEW
      components/ BuildOverview, FeatList, AbilityCard, AbilityPicker,
                  BuffSection, BuffToggle, StanceGroup
      hooks/ useAbilities, useBuffs
      types.ts
    gear/                            -- EXTEND existing
      components/ GearView, GearOverview, GearSlot, SlotEditor,
                  ItemSearchPanel, ItemRow, ItemDetail,
                  AugmentPicker, FiligreePicker, SetBonusDisplay, GearStatsPanel
      hooks/ useItems, useAugments, useFiligrees, useSetBonuses, useGear
      types.ts
    stats/                           -- NEW (extracted from character)
      components/ StatsPanel, StatsTab, FeatsTab,
                  StatRow, StatBreakdownPopover
      engine/ computeStats.ts, bonusStacking.ts, statSources.ts
      hooks/ useStats, useCompare
      types.ts
    debug/                           -- NEW
      components/ DebugView, EntityPicker, EntityDetail, WikiPreview,
                  InlineEditor, CorrectionLog
      hooks/ useEntitySearch, useWikiPreview, useCorrections
      types.ts
    build/                           -- NEW (cross-cutting build state)
      BuildContext.tsx
      types.ts
```

---

## Implementation Order

### Phase 1: Layout Restructuring (done)
1. Redesign nav bar as feature nav (Build Overview, Build Plan, Gear + TOOLS)
2. Nav bar top build dropdown (compare-active indicator added in Phase 9)
3. Clean URL routing (History API + 404.html SPA redirect)
4. Bottom warning bar (collapsed indicator)
5. DB loading gate (skeleton UI until `ddo.db` ready)
6. Service worker for `ddo.db` caching (stale-while-revalidate)

### Phase 1b: CSS Refactor (branch: `css-refactor`)
Companion to Phase 1 — design-system token infrastructure. Can merge independently.

- `color-mix()` derivatives: `--accent-glow`, `--accent-bg-subtle` track `--accent` on theme switch
- Flush panel chrome: nav bar, bottom bar, stats panel use `--bg` + hairline border (no `--bg-panel`, no shadow)
- Active state polish: `cursor: default`, hover suppression, weight bump on active nav items + card border accent
- Typography tokens (`--text-xs` through `--text-3xl`): Tailwind default scale, migrated across all CSS files
- Spacing tokens (`--space-px` through `--space-8`): Tailwind default scale, migrated padding/margin/gap
- Align default `--accent` with Gold theme
- **Post-merge: verify `docs/styling.md` token table and Design Principles section match the code.** The styling guide was updated on `navigation-refactor` to describe the target state (flat chrome, color-mix, etc.) before the css-refactor code landed — confirm no drift.

### Phase 1c: Explicit Return Types (branch off `main`)
Enable `@typescript-eslint/explicit-function-return-type` ESLint rule with `allowExpressions`, `allowTypedFunctionExpressions`, and `allowHigherOrderFunctions`. Fix all existing violations across `src/` and `e2e/`.

### Phase 1d: Router Migration (branch off `main`)
Replace custom `useRouter` hook with `@tanstack/react-router`. Needed before Phase 3+ which require sub-paths, search params, and navigation state.

- Install `@tanstack/react-router` + `@tanstack/react-router-devtools`
- Define route tree with typed routes for all existing views + `not-found`
- Migrate `App.tsx` view switching to route-based rendering
- Migrate `AppNavBar` and `BottomBar` navigation from `navigate(view)` to router `Link`/`useNavigate`
- Configure `basePath: '/ddo-tools'` for GitHub Pages
- Update `404.html` SPA redirect if needed
- Remove `src/hooks/useRouter.ts` and `useRouter.test.ts`
- Verify all Playwright e2e tests pass (URL assertions, navigation, view switching)

### Phase 1e: Transparent pip fills (Character View)
Follow-up from `css-refactor-v2`. The `.stack-pip` variants in `CharacterView.css` use solid `color-mix(accent N%, bg-tertiary)` fills, plus a solid `--accent` for `.filled`. When the enclosing `.stack-row.hoverable` lifts to `--bg-subtle` on hover, the pip colors stay anchored to the unhovered row bg and read as disconnected — the "muted" pip colors were tuned against `--bg-tertiary`, not the composited hover surface underneath.

- Migrate `.stack-pip.filled`, `.current-has`, `.current-has-filled`, `.locked`, and the `.pip-has-*` overlay variants to transparent accent overlays (e.g. `rgb(from var(--accent) r g b / 0.4)`) so pip colors composite over whatever row bg is currently painted — hovered or not.
- Keep the `.filled` state readable: may need a higher alpha (0.85+) or stay solid if contrast drops too far on hover.
- Verify the repeating-linear-gradient hatched variants still read clearly once transparent; swap the "bg-tertiary band" stops to `transparent` so the row bg shows through between stripes.
- Visual QA on both themes (dark + light) + with non-default accent colors.

### Phase 2: Index / Landing View (done)
7. Dedicated `LandingView` at `/ddo-tools/` — ampersand hero mark, active character card, site patch notes, DDO Wiki link-out. The nav bar brand doubles as a Home link (ampersand mark visible when collapsed).
8. Site patch notes in `src/features/landing/data/sitePatchNotes.ts`. Each entry is one ship date with a bulleted list of imperative changes — no titles, no versions. **Upkeep**: when merging a PR to `main`, either add a new dated entry or append bullets to today's entry if one already exists. Keep change bullets terse and imperative (match commit-subject voice).
9. DDO game patch notes: v1 is a link-out to DDO Wiki's `Updates` page. v2 (after Phase 4 wiki infra lands): embed the latest update summary via MediaWiki `action=parse`.

### Phase 3: Error Reporting & Resilience (done)
Infrastructure for per-view error handling. Built early so every subsequent phase gets error boundaries from day one. Sentry adopted for automatic background capture (with Session Replay); a single static "Report a bug" button in the bottom bar covers all user-initiated reports (technical, data-quality, UX feedback) via pre-filled GitHub issues. See [docs/sentry.md](sentry.md) for setup.

9. ErrorBoundary infrastructure via the `react-error-boundary` npm package: root `<ErrorBoundary>` in `main.tsx` (catch-all 500 page renders `<ErrorScreen>`), view boundary around `<Outlet />` in `AppLayout` with `resetKeys={[pathname]}`, chrome boundary around `<BottomBar />` so the static Report button stays reachable when other shell elements crash. All boundaries forward to Sentry via the `captureBoundary` adapter, which preserves the React component stack.
10. Per-view DB loading via `<DatabaseGate>`: top-level `LoadingGate` removed. Views that need `ddo.db` opt into the wrapper; Settings, Characters, and Landing render instantly. `DatabaseGate` shows a skeleton during load and a categorized `<ErrorScreen>` on failure with Retry + Clear-Cached buttons. After 3 retries (sessionStorage) Retry escalates and disables; the counter resets on successful load.
11. `<ErrorScreen>` + `<ErrorCard>` components: full-page and compact inline error displays with `tone='error' | 'info'` variants, focus-on-mount + `role="alert"` (ErrorScreen), `role="status" aria-live="polite"` (ErrorCard). Used by all four boundary tiers + DatabaseGate + NotFoundView.
12. Bottom-bar "Report a bug" button: replaces nothing — `BuildInfo` stays on the left (load-bearing on tablet/mobile where the nav collapses); the button sits on the right clustered next to `WarningStatus`. lucide `Bug` icon, mobile collapse to icon-only, `aria-label="Report a bug — opens GitHub issue"`. Click opens a pre-filled GitHub issue in a new tab with sanitized URL + UA + (when Sentry is configured) most-recent event ID + replay correlation.
13. GitHub issue helper at `src/lib/githubIssue.ts`: `REPO_URL`, `buildIssueUrls(error?, labels?, contextTitle?, sentryContext?)`, `sanitizeUrl()` (strips query + hash). Per-source labels: `db-loading`, `runtime`, `not-found`. Body template prompts users with "What did you notice / What were you doing / Expected vs actual" so reports come back with usable context.
14. `NotFoundView`: 404 page for unknown routes — TanStack Router already routes unknown paths here; this phase upgrades the visual chrome to `<ErrorScreen tone='info'>` with the sanitized attempted path, "Go to landing", and "Report broken link" actions. Empty-path fallback when sanitized pathname is `/`.

### Phase 4: Resources Browser

Originally a single "Debug / Data Browser" deliverable; expanded into sub-phases as the design clarified. The route is `/resources` with a "Debug" nav label (the list is power-user-leaning but useful for any player verifying parsed data against the wiki).

**Phase 4a — Items browser + wiki preview (done):**
15. 2-panel browser (picker + detail) for items only as MVP. Picker has Fuse-fuzzy search, virtualized list (react-window), and a filter row (slot, rarity-Rare, raid, stat multi-select, ML range). Detail panel renders weapon/armor stats, augment slot gems, enchantments (bonuses + effects merged), spells, upgrades, quest sources.
16. Wiki preview via MediaWiki `action=parse&prop=text` (the `extracts` extension isn't installed on ddowiki). DOMPurify sanitizes the HTML; thumb URLs rewrite to canonical with a `?cb=ddotools` query string to bypass varnish-cached 403s; broken-image error handler hides failed loads. Wiki origin health pill is rendered in the resources header and the drawer top-bar.

**Phase 4b — Drawer architecture (this phase):**
Detail: [docs/notes/Resource View.md](notes/Resource%20View.md).
- Detail-to-detail navigation with an in-memory back stack. Hybrid URL strategy: only depth-1 changes the URL; deeper navigation is in-memory; `closeDrawer` uses `replace` to avoid history pollution. Browser back at any depth dismisses the drawer (modal-like at depth 2+).
- DetailBar component: back arrow (hidden at depth 1), breadcrumb (clickable to jump levels), copy-link button (shares the current top of stack — which may differ from the address bar URL at depth 2+), close-all button.
- `ResourceDetailView` component: composes `useDetailStack` + `DetailBar` + parsed-detail body. Reusable inline by future views (gear/build) without a drawer wrapper.
- `DetailNavContext` lets per-category detail components push cross-links onto the stack without prop-drilling.
- **Wiki preview → compare window.** ddowiki.com put its entire origin (api.php included) behind AWS WAF's JS bot challenge; no embed or cross-origin fetch can pass — only top-level navigation clears it (details: [docs/ddowiki-api.md](ddowiki-api.md)). The embedded preview pane, health pill, and `pingWiki` machinery are removed; wiki links now open a shared right-half compare window (`openCompareWindow` in `src/lib/wiki/client.ts` — one window that every wiki click re-navigates), and the wiki icon sits next to the item name in `EntityHeader`. Restoring API access is an admin ask tracked in [docs/notes/To Do.md](notes/To%20Do.md).

**Phase 4c — ETL data-quality cleanup (next):**

Frontend workarounds keep accumulating because the scraper stores half-processed strings. Push the cleanup back into `scripts/` so every consumer (current frontend, future tools, exports) gets clean data once. Newly-found DB errors get logged with evidence + reproduce queries in [docs/notes/DB Errors.md](notes/DB%20Errors.md) as they surface — work through that log as part of this phase. Concrete gaps:

- HTML entities leak into stored strings — e.g. items.id 555 has `name = "Admiral&#39;s Gloves"` while items.id 545 has `name = "Acolyte's Lenses"`. Inconsistent: some inserts decode, some don't. Fix: HTML-unescape every `TEXT` column at insert time (one pass at the writer boundary, not per-field). Frontend currently has no decoder; once the DB is clean, none is needed.
- `items.rarity` is universally empty (`SELECT DISTINCT rarity FROM items` → 7,249 NULL/empty rows). The picker has had a "Rare only" toggle for a while that's been silently filtering nothing, and the new `[Rare]` row chip will never render until rarity is backfilled. Likely a scraper gap — the column exists, the parser just isn't extracting it from item infoboxes.
- `stats` table has only `(id, name, category)` — no description column. The detail view's bonus rows now show a wiki-link icon with the stat *name* as a tooltip placeholder; once stat descriptions are scraped (or hand-curated for the ~50 distinct stats DDO uses), the tooltip body should switch to the real description. This is a smaller scrape — stat pages are a bounded set, easy to enumerate.
- Bonus descriptions contain raw MediaWiki template invocations (`{{Stat|Charisma|5}}`, `{{Elemental Resistance|Fire|30}}`) that the scraper didn't expand. Frontend strip workaround lives in [`EnchantmentList.tsx`](src/features/resources/components/detail/EnchantmentList.tsx) (`cleanDescription`). Long-term: expand templates at parse time (the templates are defined on the wiki — we have the raw definition available); fall back to stripping if expansion fails.
- `quests.npc` column exists in the schema but is universally null (`COUNT(npc) = 0` across 681 quests). Schema comment notes "unpopulated (future: wt)". The frontend already reads it (see [`items.ts`](src/features/resources/queries/items.ts) — quest query) and renders it in the meta line; populate it from the wiki quest pages and the UI surfaces it for free.
- `quests` table has no `wiki_url` column (only `items` and `feats` do). The "Drops from" section's quest wiki-link icon currently derives the URL client-side from `q.name` — works for the common case but breaks on disambiguation suffixes (`Quest Name (Heroic)`) and namespaced pages. Add `quests.wiki_url`, populate it during the quest scrape, and the frontend can drop its derive-from-name fallback. Once populated, swap `WikiLinkIcon pageName={q.name}` to a URL-aware variant.
- `bonuses.bonus_type_id` is NULL on 782 of 4,948 rows (~16%). Some bonuses are legitimately untyped, but 16% feels high — scraper extraction is likely missing types on save-bonus rows (e.g. item 2193's "Illusion Save +6" and "Enchantment Save +6" both come back NULL). Spot-check ~10 NULL rows against the wiki to calibrate; tighten the parser regex / template handling where the wiki uses non-standard phrasing for typed bonuses. The frontend already renders NULL types as an empty grid cell, so this is purely a data-quality cleanup, not a UI gap.
- Augment-slot extraction is partial and inconsistent across template variants. Two failure modes coexist:
  - **Template not recognized**: `item_augment_slots.slot_type` only carries augment colors (blue, colorless, green, moon, orange, purple, red, sun, yellow). Sentient slots on Legendary items (e.g. item 3582 "Legendary Calamitous Dagger") aren't extracted at all — `{{Augment|Sentient}}` is silently skipped.
  - **Template recognized but wrong table**: `{{Augment|Primary}}` / `{{Augment|Secondary}}` (Cannith upgradeable augment slots) get parsed but routed to `item_effects` with `name="UpgradeableAugment"` and the slot kind in `modifier`. E.g. item 1236 "Circle of Malevolence" has two such rows in effects instead of in augment_slots, so the frontend renders them as malformed enchantment rows ("Primary UpgradeableAugment") instead of as gems in the EntityHeader's augment-slots KV row.
  Fix in two parts: (1) expand the recognized-template set to include `Sentient`, `Primary`, `Secondary`, and any other non-color variants the wiki uses; (2) route all of them into `item_augment_slots` with appropriate `slot_type` values. The frontend already renders whatever slots come back from the query, so once the parser is corrected, the UI surfaces them correctly — no frontend change needed.
- Re-run the data pipeline + commit `public/data/ddo.db` after the above. Add a vitest spot-check that asserts no `&#\d+;`/`{{` patterns survive in user-visible columns of `items` / `bonuses` / `effects` / `quests` (so regressions ship loud).

**Phase 4d — Filter UX overhaul (next after ETL cleanup):**

Filters today are scattered across the top bar (Slot select, Pack select, Stats multi-select, ML range inputs, Rare/Raid toggles). Each new filter we add (and Phase 4d/4f bring more) makes the bar wider and harder to scan. Four changes together fix this:

- **Unified filter UI.** Replace the strip of disparate controls with a single filter surface (popover or inline panel) that lists every available filter in one place. Active filters render as removable chips above the result list — visible at a glance, one-click clear. Removes the "where's the rare toggle vs the slot select" cognitive split.
- **Tiered visibility for rarely-used filters.** Some filters (Slot, Pack, Stats, ML) get used constantly; others (per-stat to-hit, per-stat to-damage, weapon proficiency, material, binding, augment-slot color, future power-user fields) are useful occasionally and would clutter the primary surface. The unified UI groups filters into "common" (always visible) and "more" (collapsed behind a disclosure or secondary tab) so adding new filters doesn't degrade the day-to-day view. Goal: every filter we'd reasonably want is *available*, not *visible*.
- **Searchable selects.** The Pack dropdown already has 50+ options and will grow; Stats, future Bonus-type, and future Patron filters have similar shapes. Replace the native `<select>` with a typeahead-style combobox so users can find an option by typing instead of scrolling. Stats multi-select pattern can fold into the same primitive.
- **Per-raid filter.** Today "Raid" is a boolean toggle (any raid) and pack is a separate dropdown — neither lets the user filter to a *specific* raid. Add a Raid filter (combobox listing the entries in `RAID_QUEST_NAMES`) so "show me items that drop from Tower of the Twelve" works directly. The boolean "any raid" toggle can stay as a quick-access shortcut alongside the per-raid select, or fold into "Raid: Any" inside the unified UI.

Concrete rarely-used filters to seed the "more" group with at launch:
- **To-hit by stat** — "show items that grant a to-hit bonus from <Stat>". Useful for builds that swap which stat drives weapon attack rolls (e.g. Finesse builds wanting Dex-based to-hit gear). Backing data lives in `bonuses` rows scoped to the to-hit stat-mod.
- **To-damage by stat** — same shape, different relation. "Items that grant to-damage from <Stat>" for stat-swapped damage builds.
- Materials/binding/augment-slot color filters can fold into the same group as they ship.

Out of scope: filter persistence (that's Phase 4g), saving named filter presets (later).

**Phase 4e — Stat DB Rework (next, before Categories):**
Detail: [docs/notes/Stat DB Rework.md](notes/Stat%20DB%20Rework.md). Promotes each bonus to a first-class DB row and adds a `bonus_alias` table so user input (typos, alternate names) can resolve to canonical stats. Required before Phase 4f Categories ships a first-class stats category, and before Phase 5+ Resource Report View can offer alias-aware search in the bonus editor.
- Promote bonuses to their own table so each bonus is a queryable row (currently bonuses live as denormalized fields per item/feat/etc.)
- Add `bonus_alias` table mapping freeform aliases (typos, alternate spellings, common shorthand) to canonical bonus rows; powers fuzzy search in user-facing bonus selectors

**Phase 4f — Categories:**
17. Wire feats, enhancements, a new bonuses category, and a new stats category into the picker. Each gets its own query layer + detail component. Bonuses category surfaces backlinks to items/augments/enhancements/sets that apply them. Once stats are a first-class category, swap the bonus-row wiki-link icon (currently `<a target="_blank">` opening ddowiki) to call `pushDetail({ category: 'stats', id })` so the inspector navigates *inside* our app — keeps users in the same view, builds the same cross-link affordance bonuses already have between items/feats/etc.

**Phase 4g — Polish:**
18. Filter persistence per category via `useLocalStorage`. Expand Fuse search to material/binding/item_category.
19. **Convert the picker to a true sortable table.** Today's picker is a virtualized stacked list: each row shows the name on top and meta fields (`ML · Slot · Pack`) inline below. That works at narrow widths but can't be sorted or column-aligned. Phase 4g reshapes it into a virtualized table with explicit columns (Name, ML, Slot, Pack, Rarity-or-Raid chip, etc.) and clickable column headers that toggle ascending/descending sort. Browse mode (wider picker) is the right home for this since the table needs horizontal space the drawer-sliver doesn't have. Stacked-list view stays as the narrow-mode fallback. The current chips (Raid/Rare) collapse into either a dedicated column or remain as inline name decorations — decide when implementing.

**Phase 4h — Shared-hook state cleanup (small, no UI impact):**

Two shared hooks still use the `useState + useEffect` anti-pattern for
state that's read by multiple components. Each consumer gets its own
local state, so writes from one don't propagate to others on the next
render. Symptoms are intermittent and easy to miss but real:

- **`useTheme`** ([src/hooks/useTheme.ts](src/hooks/useTheme.ts)) —
  `toggle()` only updates the calling consumer's `setTheme`. The DOM and
  localStorage stay in sync via the effect, but other consumers reading
  `theme` from the hook (e.g. `WikiPreview` for the iframe nightmode
  param) lag until they re-render for some other reason. Hidden today
  because most theme reaction is via CSS `[data-theme]` selectors.
- **`useWikiHealth`** ([src/hooks/useWikiHealth.ts](src/hooks/useWikiHealth.ts))
  — has a module-level `_cached` already, but each consumer's `recheck()`
  only updates that consumer's `setStatus`. Two `WikiHealthPill` instances
  render simultaneously (resources header + drawer DetailBar); clicking
  recheck on one leaves the other stale.

Fix shape: refactor both to `useSyncExternalStore` against a module-level
store, mirroring the `useDatabase` refactor that landed in Phase 4b. Public
hook APIs (`{theme, toggle}` and `{status, recheck}`) stay identical — no
call-site changes. Pattern is documented in
[docs/state-management.md](docs/state-management.md). About 30 lines each.

`useFaviconAccent` audited and OK — it owns no consumer-facing state
(pure DOM-side-effect manager via MutationObserver). Leave alone.

**Phase 4i — `<Modal>` primitive consolidation:**

Modal-shape UI is currently hand-rolled in two places that should share
one base component:

- **Resources drawer** ([ResourcesView.tsx](src/features/resources/ResourcesView.tsx) + [ResourcesView.css](src/features/resources/ResourcesView.css))
  — drawer panel, backdrop element, Escape/backdrop-click handlers, and
  the `useModalActive(id !== null)` opt-in are all inline.
- **`ConfirmModal`** ([src/components/ConfirmModal.tsx](src/components/ConfirmModal.tsx))
  — likely has its own backdrop + dismissal logic since it predates the
  drawer. Audit needed to confirm what's there.

What `useModalActive` solved was *one half* of the modal contract:
background-inert via refcount + `useSyncExternalStore`. The *other half*
— backdrop, positioning, dismissal handlers, focus trap — is still
copy-pasted per modal. Each future overlay (gear comparison sheet,
settings modal, etc.) would re-roll the same chrome.

**Goal:** extract a `<Modal>` (or `<Overlay>`/`<Sheet>`) primitive that
packages:

1. `useModalActive(open)` automatic opt-in while open.
2. Backdrop element with click-to-dismiss (callable `onClose`).
3. Escape-key handler for dismiss.
4. Z-index from `--z-overlay` / `--z-modal` tokens.
5. Optional focus trap (Tab cycles inside; restore focus on close). Can
   skip the third-party `focus-trap-react` for now and do a minimal
   implementation — first/last focusable element references + a Tab
   handler that wraps.
6. Slot props for header / body / footer or generic `children`.
7. Position variant prop: `centered` (ConfirmModal style), `drawer-right`
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

**Deferred to later phases:**
- Inline correction system (local overrides stored in `user.db`, auto-cleanup on DB update) — depends on Phase 5's `user.db`.
- GitHub issue submission with duplicate detection — see [docs/notes/Resource Report View.md](notes/Resource%20Report%20View.md). Depends on Phase 4e (Stat DB Rework) for the bonus-alias search inside the editor, and Phase 5 (`user.db`) for local override storage.

### Phase 5: Characters View & Build Context

**Persistence stack (build first):**
19. `user.db` schema via sql.js + `initUserDb()`
20. IndexedDB round-trip: `db.export()` to Uint8Array, debounced write-through (~200ms)
21. `VACUUM` after schema changes or bulk imports
22. Zustand stores (`characterStore`, `buildStore`, `gearStore`, `uiStore`) hydrated from `user.db`. Move nav bar expanded state + resize logic from `App.tsx` into `uiStore` so both App (grid columns) and AppNavBar (CSS class) read from the same source.

**Features:**
23. Character/build management, switching
24. Past lives (stacking, placeholders, reincarnation)
25. Tomes, import/export (export = download raw `user.db` file)
26. Gear set management section
27. Owned content settings

### Phase 6: Stats Engine
28. Stats pipeline: `computeStats.ts`, `bonusStacking.ts`, `statSources.ts`
29. `StatsPanel.tsx` replacing `BuildSidePanel.tsx`
30. Breakdown popover, search, pin, stat highlight
31. Vitest unit tests for stats engine (typed/untyped stacking, derived stats, edge cases)

### Phase 7: Build Plan (single scrollable page)
32. Build header (race, point buy, base stats, tomes)
33. Level progression (classes/feats + skills)
33b. Level-Up modal (per-level feat picker, skill allocator, ability score increase) with prereq + pool validation and incomplete-level badges on the level row.
34. Spells (card display + picker modal)
35. Enhancements (N-tree side-by-side, DDO layout)
36. Reaper enhancements
37. Destinies (destiny selector + twist bar)
38. Wire nav bar Build Plan sub-items to `scrollIntoView()` anchors for each section (Level Plan, Skills, Spells, Enhancements, Reaper, Destinies). Active sub-item tracks scroll position.

### Phase 8: Gear
Detail: [docs/notes/Gear View.md](notes/Gear%20View.md) (gear-mechanics bullets).
39. Full overview + side-by-side slot editor
40. Item search with stacking indicators
41. Augment/filigree/crafting/upgrade inline
42. Gear stats panel (bonus type tracking)
43. Gear set management (per-build + standalone)

### Phase 9: Comparison Mode
Detail: [docs/notes/Gear View.md](notes/Gear%20View.md) (comparison-view bullets).
44. Click-to-compare in Characters view (connector line from comparison -> active build) + nav bar `vs X [swap][x]` indicator
45. Comparison display for stats panel, build overview, and gear
46. Swap button + "What if" copy workflow
47. Unsaved build badge (red dot on nav bar build label for temp copies; reused by Phase 14 for shared builds)
48. Past life warning for comparison
49. Build warning calculation + bottom bar

### Phase 10: Farm Checklist
50. Item acquisition list from all gear sets (checkboxes, farm locations, wiki links)
51. Acquisition path selector per item (farm / craft / purchase)
52. Materials summary (summed across all crafting paths, deducted when acquired)
53. Purchasable augments (DB pipeline addition)

### Phase 11: DB Pipeline -- SLAs, Abilities, Purchasable Augments
54. Schema: abilities table (source, linked spell, attack type, cost, damage, modifiers)
55. Schema: metamagic applicability for SLAs
56. Schema: purchasable augments (vendor, cost, location)
57. Wiki scraper for SLA/ability data from enhancement + feat descriptions
58. Populate via `build_db` pipeline

### Phase 12: Build Overview
59. Feats (passive + active with sources)
60. Ability cards (min/max/avg, click -> damage calc)
61. Buffs (spell buffs, conditionals, stances, external, stacks)

### Phase 13: Settings View Cleanup
Currently a minimal placeholder (theme + accent picker). Belongs late because knowing what *needs* a setting depends on what features exist.

62. Restructure into sections: Display, Game Content, Data Management, About
63. Wire to Zustand stores (replace direct localStorage access)
64. Owned content settings (adventure packs / expansions)
65. Data management (export/import `user.db`, reset, storage usage)
66. About / metadata (version, build commit, GitHub links)
67. Responsive layout (current `max-width: 400px` is too narrow)
68. Audit against design-system tokens (post-css-refactor merge)

### Phase 14: Build Sharing

Share builds via URL links without a backend. Complement to the file-based import/export in Phase 5.

**Share codec** (`shareCodec.ts`):
69. Encode/decode builds to URL-safe compressed strings using lz-string (`compressToEncodedURIComponent`)
70. Use numeric DB IDs (integer PKs from `ddo.db`) instead of string slugs for compactness
71. Version prefix (`v1:`) for future format evolution
72. Core build fields: race, class split, feats (with level slots), enhancements, destinies, ability scores
73. Optional tier: gear set (items + augments + filigrees) — included when total URL stays under safe limits (~2,000 chars)

**Share route & view**:
74. `/ddo-tools/share?b=<compressed>` route handled by router
75. Read-only build summary (ShareView) with "Import to My Builds" action — shared build shows unsaved badge (from step 47) until imported
76. Graceful error state for invalid/corrupted/truncated links

**UI**:
77. "Copy Share Link" button in build overview or build plan view
78. Feedback on copy success (toast or inline confirmation)

**Size budget & hosting gate**: If full builds (including gear) consistently exceed ~2,000 chars after compression, explore hosting:
- Self-hosted paste endpoint (Cloudflare Workers / Vercel serverless — free tier)
- GitHub Gist API (requires user auth for creation)
- Evaluate whether static GitHub Pages is still sufficient or if a minimal backend is warranted

---

## Verification

After each phase:
- `npm run dev` -- verify layout renders correctly
- Playwright screenshot verification per CLAUDE.md
- `npm run lint` + `npm run build` -- no errors
- Feature-specific: can interact with the new UI (click, search, equip)
- **Unit tests** (vitest) for pure logic: stats engine (Phase 4), AP validation (Phase 5), feat prereqs (Phase 5), gear stacking (Phase 6), build state migrations (Phase 3), share codec round-trip (Phase 14)
