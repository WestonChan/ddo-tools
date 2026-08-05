Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

📋 Phase 9 — Comparison view interactions:
- Easy comparison view
	- Swappable with Gearing View?
	- Click a set to open it in the Gearing View
	- Shrinks to a `Back to Comparison View` button while in the Gearing View

📋 Phase 8 — Augment picker game facts (recorded 2026-08-03 while shipping 4m slice 1b; sourced from `Template:Augment` / `Template:UpgradeableAugment` via `?action=raw`):
- Slot → candidate augments is an FK join through the `augment_slot_types` definitions table: `item_augment_slots.slot_id` and `augments.slot_id` both reference it, and its `family`/`variant`/`qualifier` columns mean no consumer parses a label. Family slots are `family != 'standard'`; everything else is a colour gem. (`augments.slot_color` remains as wiki-sourced display fallback.)
- **Colour-acceptance rules** (what fits in a coloured socket — the picker must widen beyond exact match):
	- Orange sockets take Orange, Red, or Yellow augments
	- Purple sockets take Blue, Purple, or Red
	- Green sockets take Blue, Green, or Yellow
	- Every socket except Sun/Moon also takes Colorless
	- Sun/Moon sockets take only their own gems (Lunar and Solar Gems)
- **UpgradeableAugment pools** (stored as the `Upgradeable Augment` potential effect, Primary/Secondary modifier): Primary unlocks Yellow/Blue (+Red on weapons and shields) via Epic Tapestry Shreds; Secondary unlocks Green (+Orange/Purple on weapons and shields) via Masterwork Tapestry Shreds — both at the Fountain of Necrotic Might. Weapon/shield-ness is derivable from the item's own weapon stats / category (verified: all 40 affected items are explicitly listed in the template's own source).
- Slaver's slots (`slaver's: prefix` etc.) are filled by Slave Lords **shards**, not augments — the candidate list is empty by design until a Slave Lords crafting scrape exists.
- 430/1,279 augments still have no `augment_bonuses` rows (4m audit item), so candidate lists may show name-only entries until that ships.

📋 Phase 8 — Gear finding view:
- Filtering
	- Filter by toggling item types (helm, gloves, etc.) — visually the same as the equip slots
	- Level filter (default: within 5 levels)
	- Raid item filter
- Stats panel — shows already-assigned stats by bonus type
	- Pip per bonus type, ordered left to right from largest to smallest bonus
	- Some button or way to swap to full numbers — include base numbers, or just the addition from gear?
	- Open question: always show all stats with pin/unpin, or select specific stats to show?
		- Could add saveable sets of stats to toggle between, e.g. offensive vs defensive, or Ranged vs Melee
	- Allow ordering/reordering with drag-and-drop + multi-select
	- Hover/click a stat to highlight slots that have that stat
		- Toggle between slots with *possible* items granting the stat vs slots whose *chosen* item grants it
		- Maybe allow assigning colors to stats? Unsure how useful
		- Should this be comparable in the comparison view? e.g. hover somewhere to preview slot highlights across all gear sets
	- When selecting gear, highlight the stats the user marked in the stats panel
- Gear suggestions
	- Rank items by value out of the highest total value for each wanted stat
		- Denominator is the sum of the highest possible bonus per type — e.g. a stat with a possible 15 Enhancement and 6 Insight has a denominator of 21, so a single line of 15 scores 15/21
		- Score each line on an item that way, then sum the lines to get the item's value for the selected stats
		- Display suggested items from highest to lowest score
	- Set suggestions: select requested stats → get suggested *sets* of items (combinations across slots), not just single items
		- Covers whatever slots are available, or only the slots the user wants suggestions for
		- Only fills empty slots by default; maybe an option to preserve existing items vs not
		- Maybe not a separate view — could be part of the normal gear-finding view, since that already has stat selection and possible slot selection
		- Can then be extended to gear replacement — check whether a better item exists for a specific slot
- Item display
	- Show the item's image from the wiki plus the stats it gives from the db

📋 Phase 8 — List-view expansion + stat groups:
- Make list view expandable (show inline stats); reuse the list view from resources
- Separate interface to select desirable stats and sort them into groups, rather than overloading the stats panel
	- Maybe still use the stats panel but with a separate tab for filter groups
	- Would be nice for groups to be shareable/saveable
- Groups get shown as columns on the list view, sortable by various metrics
	- e.g. Unique Stats, Num Unused Unique Stats, Max Value (any stat closest to its max value)
- Each item gets a badge showing how many stats from each group it has
