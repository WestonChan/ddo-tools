Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

📋 Phase 9 — Comparison view interactions:
- Easy comparison view
	- Swappable with Gearing View?
	- Click set to go into Gearing View for that set
	- Shrinks to `Back to Comparison View` when in Gearing View

📋 Phase 8 — Gear finding view:
- Gear finding view
	- Filter by toggling item types (helm, gloves, etc.) visually same as equip slots
	- Needs level filter (default to within 5 levels)
	- Needs raid item filter
	- Stats panel of already assigned stats by type
		- Always show all and pin/unpin OR select specific stats to show?
			- Add sets of stats to easily toggle between? i.e. users could have offensive and defensive bonuses to swap between, or a default Range vs Melee set of stats to swap between
		- Allow ordering/reordering w/ drag n drop + multi-select
		- Pip for each type, left to right largest to smallest bonus
		- Some button or way to swap to see full numbers? Include base numbers or just addition from gear?
		- Hover/click over stats to highlight slots that have that stat
			- Maybe allow assigning colors for stats? Unsure how useful
			- Toggle for all slots that have possible items with that stat OR slots that have chosen items with that stat
			- Should this somehow be comparable in the comparison view?
				- Hover somewhere to preview slots for all gear sets to see highlights?
	- When selecting gear, highlights stats that users marked in stats panel
	- Would like gear suggestion feature
		- Ranking based on value out of highest total value for each wanted stat
			- So a stat with possible 15 Enhancement and 6 Insight would have a denominator of 21, and the highest point that stat could get from a single line of 15 of that stat would be 15/21
			- Each line item of an item gets that calculation, then summed together would be be the value of that item for your selected stats
			- Then the suggested items would display in order of highest to lowest
	- Show image of item from wiki + stats that it gives from db

📋 Phase 8 — List-view expansion + stat groups:
- Make list view expandable (show inline stats), use list view from resources
	- Rather than using the stats panel for desirable stats, it would be nicer to have a separate interface to select desirable stats and sort them into groups
		- Maybe still use stats panel but have a separate tab for filter groups
		- Would be nice to be sharable/savable
	- Groups then get shown as columns on the list view, which can then be sorted by various type
		- Unique Stats, Num Unused Unique Stats, Max Value (any stat closes to max value), etc.
	- Each item then has a badge that shows how many of each stat in each group there is on that item
