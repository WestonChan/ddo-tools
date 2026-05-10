Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

- Enhancements/Feats 📋 Phase 4c
	- Description + Requirements too

- 📋 Phase 4c — Add stats/bonuses/enchantments category for bonuses
- 📋 Phase 4c — Add attack/damage mod to item
- 📋 Phase 4d — Make filters sticky per list view so they stick around when you leave the page and come back
- 📋 Phase 4d — Add filters for augment slot types (sun/moon), crafting system, quest pack/expansion
- 📋 Phase 4d — Make sure search terms look through all relevant keywords (probably filters)
- 📋 Phase 4d — Figure out what to do with extra list view space (more columns for more details?)
- 📋 Phase 4g — List view should have columns for ml, item slot, and quest pack/expansion so users can order by them
- 📋 Phase 5+ — Make sure that the filters and list views are reusable for other views (item equipping view, spell getter view, etc.)
- 🚧 Phase 4b — Bonus row layout: bonus type first, then bonus name, then bonus value (the side-by-side tags currently don't align with the row below)
- 🚧 Phase 4b — Quests should have a ddowiki link
- 🚧 Phase 4b — Weapon description should be left-aligned and on a separate column from the item name
	- ![[Pasted image 20260509231237.png]]
- 🚧 Phase 4b — Default list ordering should be descending min level, then item slot
- 🚧 Phase 4b — Make popover its own component for use in other views
	- The reusable thing is the inner detail-with-navigation (`ResourceDetailView`), not the drawer chrome. The drawer slide-in/backdrop stays inline in `ResourcesView`; future gear/build views can embed `ResourceDetailView` inline without a drawer.
	- 🚧 Router design: hybrid — **only depth-1 changes the URL**. Detail-to-detail navigation is pure in-memory state (the back stack). On initial mount with `/resources/<cat>/<id>`, the hook seeds the stack with that entry. `closeDrawer` uses `replace` so browser back doesn't reopen the drawer. Refresh restores the depth-1 entry but loses deeper breadcrumb chain — accepted tradeoff. Copy-link button generates a URL from the current TOP of stack, so depth-2+ users can share what they're actually viewing.
	- 🚧 Back button — `popDetail` returns to the previous level (or closes at depth 1).
	- 🚧 Detail-to-detail linking infrastructure ready via `DetailNavContext`. Per-category links land in 4c when feats/bonuses/enhancements categories ship.
		- 🚧 Breadcrumb shows the chain (each crumb is clickable to jump). No "depth badge" — breadcrumb is the depth indicator.
		- 📋 Phase 4c — Recursive related-stat linking (bonuses that apply other bonuses) once the bonuses category exists.
	- 🚧 Close-all button (×) exits all detail levels and dismisses the drawer.
- 📋 Phase 4d — When in a smaller view, wiki should be vertically below instead of side by side. (Mobile <900px already stacks via media query; verify and extend to medium widths if needed.)
