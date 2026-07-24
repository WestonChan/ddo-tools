Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

- Enhancements/Feats 📋 Phase 4c
	- Description + Requirements too

- 📋 Phase 4c — Add stats/bonuses/enchantments category for bonuses
- 📋 Phase 4c — Add attack/damage mod to item
- 📋 Phase 4d — Make filters sticky per list view so they stick around when you leave the page and come back
- 📋 Phase 4d — List view URL should include the active filters (shareable filtered views)
- 📋 Phase 4d — Add filters for augment slot types (sun/moon), crafting system, quest pack/expansion
- 📋 Phase 4d — Make sure search terms look through all relevant keywords (probably filters)
- 📋 Phase 4d — Figure out what to do with extra list view space (more columns for more details?)
- 📋 Phase 4g — List view should have columns for ml, item slot, and quest pack/expansion so users can order by them
- 📋 Phase 5+ — Make sure that the filters and list views are reusable for other views (item equipping view, spell getter view, etc.)
- ✅ Phase 4b — Bonus row layout: type → stat name → value as a 3-column subgrid (`.resources-bonus-list` is the grid container; rows use `subgrid` so type/name/value column-align across the whole list).
- ✅ Phase 4b — Quests have a wiki link icon next to each name in the Drops from section.
- ✅ Phase 4b — Weapon/Armor stat values left-aligned in their own column (`.resources-stat-row` switched from flex space-between to 2-column grid).
- ✅ Phase 4b — Default list ordering: `minimum_level` DESC NULLS LAST, then `equipment_slot`, then `name` (case-insensitive).
- ✅ Phase 4b — Popover extracted as `ResourceDetailView`. The reusable thing is the inner detail-with-navigation, not the drawer chrome. The drawer slide-in/backdrop stays inline in `ResourcesView`; future gear/build views can embed `ResourceDetailView` inline without a drawer.
	- ✅ Router design: hybrid — only depth-1 changes the URL. Detail-to-detail nav is pure in-memory state (the back stack). On initial mount with `/resources/<cat>/<id>`, the hook seeds the stack with that entry. `closeDrawer` uses `replace` so browser back doesn't reopen the drawer. Refresh restores the depth-1 entry but loses deeper breadcrumb chain — accepted tradeoff. Copy-link button generates a URL from the current TOP of stack, so depth-2+ users can share what they're actually viewing.
	- ✅ Back button — `popDetail` returns to the previous level (or closes at depth 1).
	- ✅ Detail-to-detail linking infrastructure ready via `DetailNavContext`. Per-category links land in 4c when feats/bonuses/enhancements categories ship.
		- ✅ Breadcrumb shows the chain (each crumb is clickable to jump). No "depth badge" — breadcrumb is the depth indicator.
		- 📋 Phase 4c — Recursive related-stat linking (bonuses that apply other bonuses) once the bonuses category exists.
	- ✅ Close-all button — clicking the leading "Back to <category>" crumb exits all detail levels and dismisses the drawer.
- ✅ Phase 4b — Embedded wiki preview replaced by a shared compare window. ddowiki.com put its whole origin (api.php included) behind AWS WAF's JS bot challenge — verified that no iframe variant and no cross-origin API fetch can ever pass; only top-level navigation clears it. Wiki links now open a right-half popup window that every wiki click re-navigates (the parser-QA compare workflow), the wiki icon sits next to the item name's copy-link icon, the health pill is gone, and the item detail gets the full (narrowed) drawer. See `docs/ddowiki-api.md` for the WAF details and [[To Do]] for the ddowiki-admin outreach that could restore API access.
	- 📋 Revisit compare-window sizing/position now that the preview pane is gone (user call: judge live, post-ship).
- ✅ Phase 4b — At <900px the drawer goes fullscreen (covers nav bar and BottomBar).