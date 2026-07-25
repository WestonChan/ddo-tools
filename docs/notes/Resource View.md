Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

Phase 4a and 4b are shipped and their bullets pruned — the design decisions they recorded (hybrid
URL strategy, `ResourceDetailView` extraction, the wiki compare window) now live in the Phase 4b
entry in [[roadmap]].

- 📋 Phase 4c — Per-row wiki links in the Enchantments list (`ddowiki.com/page/<stat>`) plus a hover tooltip explaining stacking semantics. `EnchantmentList` was built as the surface for this; the `statName` field that pre-wired it was removed as dead code, so this starts from `ItemBonus.stat_name`.
- ✅ Raid-ness moved out of the frontend into `quest_loot.loot_type`. The scraper now records which wiki category each loot mapping came from (`_QUEST_LOOT_SOURCES` in [`scraper.py`](../../scripts/src/ddo_data/wiki/scraper.py) carries a `LootType` per entry), `insert_quest_loot` implements the raid-wins precedence its docstring had always described, and the frontend's 36-name `IN (...)` is now `WHERE loot_type = 'raid'`. The misleading "raid-ness is derived from the quest, not stored on the mapping" docstring is gone.
- ⚠ 📋 Phase 4c — Finish the raid-loot data. The column ships populated only for `raid`, via `backfill_quest_loot_types` reading the reconciled list in [`raid_quests.py`](../../scripts/src/ddo_data/game_data/raid_quests.py) — ddowiki's WAF challenge blocks `collect_quest_loot`, so `chest`/`reward` are NULL on 4,151 rows. One successful items scrape fills those two, but the name list is NOT fully deletable after that (see next bullet).
	- ✅ Reconciled 2026-07-25 against the wiki's `Raids` page (41 raids) and `Category:Raid_loot` (26 subcats) — a real browser passes the WAF via top-level navigation even though clients can't. Found and fixed: 4 taggable raids missing from the list (`Fire Over Morgrave`, `Relentless`, `Hunt or Be Hunted`, `Altar of Fecundity` — 154 items), `Reign of Madness` wrongly listed (story arc, not a raid — 7 items untagged), and the bogus `The Chronoscope reward items` quest row (scraper suffix bug, fixed + merged). Raid items: 609 → 756.
	- ⚠ `Category:Raid_loot` itself is stale (last edited 2015): newer raids' loot is categorized under `Chest_loot` only, so even a live scrape under-tags. The hand list stays authoritative for `raid` until the wiki categorization is fixed or the scraper cross-references the `Raids` page.
	- 🐛 Four raids (`The Vault of Night`, `The Shroud`, `The Lord of Blades`, `The Codex and the Shroud`) have zero `quest_loot` rows, and two (`Threats Old and New`, `Den of Vipers`) have no `quests` row at all — nothing to tag; their items have no "Drops from" entry. Details + repro in [[DB Errors]].
- 📋 Phase 4d — Add filters for augment slot types (sun/moon), crafting system, quest pack/expansion
- 📋 Phase 4d — **"Content you own" filter** — show only items whose source quests the user can actually run. Needs spec expansion before starting; wiki sources are documented in the "Finding quests and raids" section of [ddowiki-api.md](../ddowiki-api.md) (content ownership table). Ownership model, verified against the wiki 2026-07-25:
	- An item is accessible if **any** of its source quests is accessible. A quest is accessible if: it's on the F2P list, OR its pack/expansion is owned, OR the account is VIP and it's in an adventure pack (not an expansion).
	- **F2P is quest-granular, not pack-granular** — the wiki's F2P list is 117 individual quests plus ~5 free quests inside otherwise-paid pack families, so `adventure_packs.is_free_to_play` alone can't model it (and that column is unpopulated anyway: 76/77 rows default 0).
	- **VIP is a rule, not a list**: all adventure packs minus expansions (`/page/VIP`, confirmed in its T&C). So the UI needs an account-type setting (F2P/Premium/VIP) plus per-pack/per-expansion owned toggles.
	- **"Apply free code" button**: SSG periodically releases codes granting a fixed set of quest packs permanently. Ship a static constant of the *pack sets* those recurring giveaways grant (NOT the codes — they rotate weekly) so one click marks them owned. Source the sets from the Expired table on `/page/Coupons` when implementing; the constant is deliberately not added until this feature ships, to avoid dead code.
	- Data prerequisites: pack type (adventure pack vs expansion) isn't modeled in the DB; `quests` needs a free-to-play marker (or a seeded F2P quest list); the 13 raid quests with NULL `pack_id` (see [[DB Errors]]) would fall through pack-based ownership checks.
- 📋 Phase 4d — Arrow-key navigation for the picker list (roving tabindex). Rows are now real buttons, so keyboard users can reach them, but tabbing only walks the rows react-window has rendered — arrow keys should drive selection and scroll the virtualized window.
- 📋 Phase 4d — Make sure search terms look through all relevant keywords (probably filters)
- 📋 Phase 4d — Figure out what to do with extra list view space (more columns for more details?)
- 📋 Phase 4f — Enhancements/Feats categories
	- Description + Requirements too
- 📋 Phase 4f — Add stats/bonuses/enchantments category for bonuses
- 📋 Phase 4f — Add attack/damage mod to item
- 📋 Phase 4f — Recursive related-stat linking (bonuses that apply other bonuses) once the bonuses category exists
- 📋 Phase 4g — Make filters sticky per list view so they stick around when you leave the page and come back
- 📋 Phase 4g — List view URL should include the active filters (shareable filtered views)
- 📋 Phase 4g — List view should have columns for ml, item slot, and quest pack/expansion so users can order by them
- 📋 Phase 4g — Revisit compare-window sizing/position now that the preview pane is gone (user call: judge live)
- 📋 Phase 4g — Item icons in the list view (ddo-builds.com reference). Blocked on resolving an icon-asset source — see the image-extraction item in [[To Do]]. Fixed row height matters: the picker list is virtualized.
- 📋 Phase 7 — Make sure the filters and list views are reusable by other views. First consumer is the Phase 7 spell picker; the Phase 8 gear item picker follows.
