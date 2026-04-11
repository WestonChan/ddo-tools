# Frontend: Layout & Feature Architecture

## Context

All 5 pre-frontend gate audits are complete. The DB has 78 tables, 9,452 items, 810 feats, 3,146 enhancements, 480 spells, 25 classes, 29 races. The existing frontend has solid character/past-life management but gear, enhancements, destinies, level planning, and stats computation are all placeholders. This plan defines the overall UI structure, navigation, and feature modules.

---

## Layout Architecture

```
+-------------------+---------------------+---+
| [Weston: Pal 20 v] [vs]                 | S |
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
| [Weston: Pal 20 v] [vs]
| vs Wizard TR [sw][x]
|-------------------|
| [Build Overview]  |
| v BUILD PLAN      |
| [Gear]            |
| v TOOLS           |
|   ...             |
```

**Key design decisions:**
- Sidebar is feature navigation: Build Overview, Build Plan (collapsible: classes/feats, skills, spells, enhancements, reaper, destinies), Gear, TOOLS (collapsible: Damage Calc, Farm Checklist, Debug), Settings
- **Sidebar top**: `[Weston: Pal 20 v]` dropdown for Manage Characters/Builds and Manage Gear Sets. `[vs]` icon next to it opens compare picker.
- **Compare active**: Second line appears `vs Wizard TR [swap][x]`. `[swap]` flips primary/comparison. `[x]` deactivates.
- **Bottom bar**: Build warning indicator. Collapsed: `[!] 3 warnings`. Expands to show details with clickable links to the relevant feature (e.g., "2 feat slots empty (L6, L12) [Levels]"). Zero warnings: hides or shows checkmark.
- **No horizontal tab bar** -- sidebar IS the tab bar, giving full height to content.
- Hash routing: `#characters`, `#overview`, `#build-plan`, `#gear`, `#damage-calc`, `#farm-checklist`, `#debug/:entity`, `#settings`

### Tech Stack
- React 19 + TypeScript + Vite (keep existing)
- **Zustand** -- state management (complex build state + localStorage persist)
- **TanStack Router** -- type-safe nested routing
- **No DnD library** -- use native HTML drag/drop API for sortable lists (pinned stats, spell order). Add library later if needs grow.
- **Base UI** (@base-ui/react) -- headless UI primitives (dropdowns, modals, tooltips, tabs, popovers). v1.0 Feb 2026, by ex-Radix creators at MUI.
- **@tanstack/react-virtual** -- virtual scrolling for large lists (9K+ items, 800+ feats)
- **sql.js** -- in-browser SQLite (keep existing)
- CSS modules + CSS variables (keep existing, no Tailwind)
- **Settings** includes:
  - Theme (dark/light) + accent color (existing)
  - **Owned content**: Toggle which adventure packs, races, classes you own. Affects available items (filtered by `quest_loot` -> `adventure_packs`), races (`race_type`: free/premium/iconic), and classes. Defaults to "all content" so nothing is hidden unless the user restricts it. Stored in localStorage.

---

## Characters View (`#characters`)

Full-page management UI for characters and builds. Accessed via the sidebar top link.
- Character list with create/delete
- Selected character shows:
  - Current build summary
  - Current tomes (STR/DEX/CON/INT/WIS/CHA +1 to +8). Each life in history records what tomes it had.
  - Life history (with TR types: Heroic/Racial/Epic/Iconic/Lesser)
  - Placeholder lives (set count, click to assign past life feats by type)
  - Planned builds (renamable, not tied to character)
  - **Past Lives**: Stacking grid + reincarnation workflow (existing PastLifeStacks + LifeHistory UI). Placeholder management: set count of undetailed lives, assign past life feats by type. Placeholders show as single row "Placeholders (N lives)" in life history.
- "Edit Build" button jumps to the Levels view for the selected build
- Compare setup: compare icons next to each build
- **Import/Export**:
  - **Import from DDO Builder v2**: Load `.xml` files from the legacy DDO character planner. Parses class splits, feats, enhancements, gear into our build format.
  - **Import custom format**: Load our own `.json` save format (full build state including gear, enhancements, buffs, past lives).
  - **Export**: Save current build as our custom `.json` format. Button accessible per-build.
  - Import/export buttons in the character view header or per-build action menu.

---

## Feature Views

### Build Plan (single scrollable page with 6 sections)

Sidebar shows "BUILD PLAN" as a collapsible group with sub-items that scroll to sections within one page. Contains everything about the build's character progression. Gear and Build Overview are separate sidebar views. Past Lives managed in Characters view. Each section on the page (Classes/Feats, Skills, Spells, Enhancements, Destinies) is individually collapsible via its section header. All collapsed states (sidebar group + each section) persisted in localStorage.

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

#### Skills (below Classes & Feats, within same collapsible)
- Grid layout: columns = skills, rows = levels 1-20 only (no epic skill points)
- Allocate points vertically per skill across all levels
- Shows running total per skill at bottom
- Cross-class skills visually distinguished (half ranks, dimmer)
- Remaining points shown per level row
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
- **Standalone gear set editing**: Accessible via "Manage Gear Sets" in the sidebar top dropdown. Opens gear set management where you can create/edit/delete gear sets using the same Gear view UI.

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

The landing page for a build -- shows everything at a glance and lets you configure active abilities and buffs. Positioned first in sidebar (above Build Plan).

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
- Pure function: `computeStats(buildState) => { stats, breakdowns }`
- Inputs: level plan + gear bonuses + enhancement bonuses + destiny bonuses + buffs + race + past lives
- Applies DDO bonus stacking (highest per type wins, untyped stacks)
- Tracks sources for breakdown display
- Tracks which bonus types are present vs missing per stat

---

## Build Switching & Comparison

### Switching
- **Sidebar top dropdown**: `[Weston: Pal 20 v]` -- dropdown shows:
  - `Manage Characters / Builds` -- opens Characters view where you switch builds, manage characters, past lives, etc.
  - `Manage Gear Sets` -- opens gear set management (same Gear view UI, no build context)
- Build switching happens in the Characters view (click a build to make it active)

### Comparison
- **Compare icon** `[vs]` next to the build label in sidebar top. Opens a comprehensive build picker showing ALL builds across ALL characters + standalone planned builds. Select one to activate comparison mode.
- **Compare active**: Second line below build label: `vs Wizard TR [swap][x]`.
- **Swap button** `[swap]`: Flips which build is primary (editable) and which is comparison (read-only). Sidebar label updates, stats deltas flip sign.
- **"What if" copy**: A `[Try variant]` button creates a temporary copy of the current build. Enters comparison mode with the copy as editable primary and the original as comparison target. When done: "Keep variant" (replaces original), "Save as new build" (keeps both), or "Discard" (reverts to original).
- **Compare past lives**: Comparing against a character's life inherits that character's past lives for stat calculation. Standalone planned builds default to zero past lives.
- **Past life warning**: If comparison target has different past lives than current build's character, show a warning indicator.
- **Comparison display** (only 3 views affected):
  - **Stats panel**: +/- deltas inline on each stat (green better, red worse)
  - **Build Overview**: Feats show missing/extra. Abilities present in both builds show +/- damage diff on cards. Buffs show different active states.
  - **Gear**: Side-by-side (your slots left, comparison right)
  - Other views (Level Plan, Enhancements, Destinies) are unaffected -- swap builds via sidebar to inspect those.
- **Deactivate**: Click `[x]`. If temporary copy active, prompts keep/save/discard first.

---

## Build State (localStorage per build)

```typescript
interface GearSet {
  id: string
  name: string                       // "Melee Set", "Casting Set"
  equippedGear: Record<string, string | null>  // slot => item ID
  augments: Record<string, Record<number, string | null>>
  filigrees: (string | null)[]
  trackedStats: string[]             // stat IDs tracked in gear stats panel
}

interface BuildState {
  levelPlan: LevelEntry[]           // levels: class, feats, skills, spells
  gearSetIds: string[]              // references to saved GearSets
  activeGearSetId: string | null    // which gear set is active for stats
  enhancementSpends: { treeId: number; enhId: number; ranks: number }[]
  destinySpends: { treeId: number; enhId: number; ranks: number }[]
  activeDestiny: string | null
  twists: string[]
  activeBuffs: string[]
  activeStances: Record<string, string>
}
```

---

## Future Features (TOOLS section)

### Damage Calculator
- Input: current build state (class levels, gear, enhancements, buffs)
- Simulate DPS against configurable enemy (AC, HP, resistances)
- Show breakdown by damage source
- Full formula breakdown: dice, ability mod, enhancement, power, doublestrike/doubleshot, crit profile
- **Comparison mode**: When active, show +/- deltas on each stat contributing to the calculation AND on the final damage output

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
- Collapsible sidebar group under TOOLS with sub-items:
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
  - **Submit correction button**: Per-item. Before creating, searches GitHub API for existing open issues with same item name. If found, shows "Correction already submitted (#42)" with link. If not found, creates one GitHub issue (e.g., "Data correction: Legendary Crown of Tactics"). `data-correction` label. GitHub Action on issue creation:
    - Checks if correction already in `overrides.json` → closes with "Already applied"
    - Checks if duplicate open issue exists for same item → closes with "Duplicate of #N"
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
    App.tsx, AppSidebar.tsx          -- modified (feature nav sidebar)
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

### Phase 1: Layout Restructuring
1. Redesign sidebar as feature nav (Build Overview, Build Plan, Gear + TOOLS)
2. Add sidebar top build dropdown + compare icon
3. Update hash routing
4. Add bottom warning bar (collapsed indicator)

### Phase 2: Debug / Data Browser
5. 2-panel data browser (picker + detail) for items, spells, enhancements, feats, augments, sets
6. Wiki preview via MediaWiki API
7. Inline correction system + local DB updates
8. GitHub issue submission with duplicate detection

### Phase 3: Characters View & Build Context
9. Character/build management, switching
10. Past lives (stacking, placeholders, reincarnation)
11. Tomes, import/export
12. Gear set management section
13. `BuildProvider` wrapping all feature state
14. localStorage persistence for build state + gear sets
15. Owned content settings

### Phase 4: Stats Engine
16. `computeStats.ts` + `bonusStacking.ts` + `statSources.ts`
17. `StatsPanel.tsx` replacing `BuildSidePanel.tsx`
18. Breakdown popover, search, pin, stat highlight

### Phase 5: Build Plan (single scrollable page)
19. Build header (race, point buy, base stats, tomes)
20. Level progression (classes/feats + skills)
21. Spells (card display + picker modal)
22. Enhancements (N-tree side-by-side, DDO layout)
23. Reaper enhancements
24. Destinies (destiny selector + twist bar)

### Phase 6: Gear
25. Full overview + side-by-side slot editor
26. Item search with stacking indicators
27. Augment/filigree/crafting/upgrade inline
28. Gear stats panel (bonus type tracking)
29. Gear set management (per-build + standalone)

### Phase 7: Comparison Mode
30. Compare picker + sidebar indicator
31. Comparison display for stats panel, build overview, and gear
32. Swap button + "What if" copy workflow
33. Past life warning for comparison
34. Build warning calculation + bottom bar

### Phase 8: Farm Checklist
35. Item acquisition list from all gear sets (checkboxes, farm locations, wiki links)
36. Acquisition path selector per item (farm / craft / purchase)
37. Materials summary (summed across all crafting paths, deducted when acquired)
38. Purchasable augments (DB pipeline addition)

### Phase 9: DB Pipeline -- SLAs, Abilities, Purchasable Augments
39. Schema: abilities table (source, linked spell, attack type, cost, damage, modifiers)
40. Schema: metamagic applicability for SLAs
41. Schema: purchasable augments (vendor, cost, location)
42. Wiki scraper for SLA/ability data from enhancement + feat descriptions
43. Populate via `build_db` pipeline

### Phase 10: Build Overview
44. Feats (passive + active with sources)
45. Ability cards (min/max/avg, click -> damage calc)
46. Buffs (spell buffs, conditionals, stances, external, stacks)

---

## Verification

After each phase:
- `npm run dev` -- verify layout renders correctly
- Playwright screenshot verification per CLAUDE.md
- `npm run lint` + `npm run build` -- no errors
- Feature-specific: can interact with the new UI (click, search, equip)
