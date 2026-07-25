# DDO Wiki API Reference

The DDO Wiki (ddowiki.com) is a MediaWiki site. Use `WebFetch` with its API to look up game information.

> **⚠ AWS WAF bot challenge (July 2026) — most of this document is currently unusable.**
>
> ddowiki.com fronts its **entire origin** — `api.php` and `images.ddowiki.com` paths included — with AWS WAF Bot Control's JavaScript challenge. Ungated requests get `HTTP 202`, an **empty body**, `x-amzn-waf-action: challenge`, `server: awselb/2.0`. Consequences (all verified empirically 2026-07-24):
>
> - **`WebFetch`, `curl`, Python `requests`, and any pipeline scraping fail** — they can't run the challenge JS. Expect 202/empty from every endpoint below.
> - **Cross-origin `fetch` from the frontend fails** — the clearance token is a ddowiki.com cookie; cross-site fetches send no cookies, and `access-control-allow-origin: *` forbids credentialed requests. The `x-amzn-waf-action` response header *is* CORS-exposed, so client code can at least detect the block.
> - **Iframes can never pass** — the token binds to the top-level browsing context. Plain, `credentialless`, and pre-cleared-cookie iframes all fail with AWS's "Max challenge attempts exceeded" page (this is what killed the Resource View's embedded wiki preview).
> - **Only top-level browser navigation works** — the challenge solves invisibly in ~1s. The frontend's wiki links therefore open a shared compare window (see `src/lib/wiki/client.ts`).
> - **Do not script around the challenge** (headless token harvesting, challenge-solving proxies) — that's circumvention of an intentional bot policy.
>
> The path back: ask the ddowiki admins to exempt `/api.php` from the challenge rule (tracked in `docs/notes/To Do.md`). If that happens, everything below works again as written.

## API Endpoints

**Search:**
```
https://ddowiki.com/api.php?action=query&list=search&srsearch=QUERY&srlimit=10&format=json
```

**Get page content (plain text):**
```
https://ddowiki.com/api.php?action=query&prop=extracts&explaintext=1&titles=PAGE_TITLE&format=json
```
Add `exintro=1` for just the intro section.

**Get page wikitext (fallback if extracts are empty):**
```
https://ddowiki.com/api.php?action=parse&page=PAGE_TITLE&prop=wikitext&format=json
```

**List category members:**
```
https://ddowiki.com/api.php?action=query&list=categorymembers&cmtitle=Category:CATEGORY_NAME&cmlimit=500&format=json
```
Use `cmnamespace=500` to restrict to Item pages only. Use `cmcontinue=VALUE` to paginate.

**List all categories (discovery):**
```
https://ddowiki.com/api.php?action=query&list=allcategories&aclimit=500&format=json
```
Use `acprefix=PREFIX` to filter by prefix (e.g., `acprefix=Trinket` finds `Trinket_items`, `Trinket_prefixes`).
Use `accontinue=VALUE` to paginate (there are thousands of categories).

**List all pages in a namespace:**
```
https://ddowiki.com/api.php?action=query&list=allpages&apnamespace=500&aplimit=500&format=json
```
Use `apcontinue=VALUE` to paginate. Namespace 500 = Item pages, namespace 0 = main pages.

**Get page categories (reverse lookup):**
```
https://ddowiki.com/api.php?action=query&prop=categories&titles=PAGE_TITLE&cllimit=500&format=json
```
Returns all categories a page belongs to. Useful for discovering what categories exist for a given entity.

## Discovering Pages

**Prefer category/namespace enumeration over guessing page titles.** The wiki has category pages that enumerate members, which is more reliable than constructing titles by hand.

### Equipment slot categories

Items are categorized by equipment slot. Use `categorymembers` with these categories:

| Category | ~Count | Slot |
|----------|--------|------|
| `Back_items` | 598 | Cloaks, capes |
| `Eye_items` | 369 | Goggles |
| `Feet_items` | 335 | Boots |
| `Finger_items` | 728 | Rings |
| `Hand_items` | 365 | Gloves, gauntlets |
| `Head_items` | 502 | Helms, hats (has `Eye_items` subcategory) |
| `Neck_items` | 500 | Necklaces, amulets |
| `Trinket_items` | 569 | Trinkets |
| `Waist_items` | 388 | Belts |
| `Wrist_items` | 404 | Bracers |
| `Quiver_items` | 16 | Quivers |
| `Cloth_items` | 750 | Cross-slot (robes, gloves, helms, wraps) |

Missing slot categories (no category or empty): Body/Chest armor, Off-hand, Shoulder. The `Armor` parent category has subcategories (`Cloth_armor`, `Docents`, `Epic_armor`) but no single flat list.

Example -- list all trinkets:
```
https://ddowiki.com/api.php?action=query&list=categorymembers&cmtitle=Category:Trinket_items&cmlimit=500&format=json
```

### Other useful categories

| Category | Contents |
|----------|----------|
| `Named_items` | 64 named items (small curated subset) |
| `Enhancement_trees` | All enhancement tree pages |
| `Fighter_bonus_feats`, `Wizard_bonus_feats`, etc. | Class-specific bonus feat lists |
| `Spells` | All spell pages |
| `Active_feats`, `Passive_feats` | Feats by activation type |

### Finding categories by prefix

To discover what categories exist for a topic, use the `allcategories` endpoint:
```
https://ddowiki.com/api.php?action=query&list=allcategories&aclimit=500&acprefix=Fire&format=json
```
This returns all categories starting with "Fire" (e.g., `Fire_Absorption_+10%_items`, `Fire_spells`, etc.). Useful for finding enchantment categories, loot categories, and slot categories without guessing.

## Common Query Parameters

These MediaWiki API parameters work across most `list` endpoints:

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `format=json` | JSON output (always include) | -- |
| `cmlimit` / `aplimit` / `aclimit` | Max results per request (up to 500) | `cmlimit=500` |
| `cmcontinue` / `apcontinue` / `accontinue` | Pagination token from previous response's `continue` field | `cmcontinue=page\|...` |
| `cmnamespace` | Filter category members by namespace | `cmnamespace=500` (Items only) |
| `cmsort=timestamp` | Sort category members by last edit | `cmsort=timestamp&cmdir=desc` |
| `cmtype=page\|subcat` | Filter to pages only or subcategories only | `cmtype=page` |
| `srsearch` | Full-text search query | `srsearch=intitle:Celestia` |
| `srnamespace` | Restrict search to namespace | `srnamespace=500` |
| `apprefix` | Filter `allpages` by title prefix | `apprefix=Epic` |

### Useful search prefixes

The `srsearch` parameter supports MediaWiki search syntax:
- `intitle:WORD` -- page title must contain WORD
- `incategory:CATEGORY` -- page must be in category
- `prefix:TEXT` -- page title must start with TEXT

Example -- search for items with "Epic" in the title:
```
https://ddowiki.com/api.php?action=query&list=search&srsearch=intitle:Epic&srnamespace=500&srlimit=50&format=json
```

## Page Title Patterns

- Items: `Item:Item_Name` (e.g., `Item:Celestia`)
- Feats: direct name (e.g., `Cleave`, `Maximize_Spell`)
- Classes: direct name (e.g., `Paladin`, `Warlock`)
- Enhancement trees: `Tree_Name_enhancements` (e.g., `Kensei_enhancements`, `Elf_enhancements`)
- Quests: direct name (e.g., `The_Vault_of_Night`)

## Icons / Images

Wiki images are hosted at `https://images.ddowiki.com/`. The `icon` column in the DB stores the filename (e.g., `Icon Feat Cleave.png`). To construct the full URL:

```
https://images.ddowiki.com/Icon%20Feat%20Cleave.png
```

Naming conventions vary by entity type:
- **Feat icons:** `Icon Feat <Name>.png` or `Icon_Feat_<Name>.png`
- **Enhancement icons:** `<TreePrefix><AbilityName>.png` (e.g., `KenseiStrikeWithNoThought.png`)
- **Item icons:** `<Item Name> shown.jpg` or `<Item Name>.png` (inconsistent)
- **Spell icons:** varies widely

Not all filenames follow these patterns -- always use the `icon` column value from the DB, not a constructed name.

## Wiki Category Reference

The DDO Wiki organizes content into thousands of categories. These are the most useful for programmatic data extraction, grouped by entity type. Use `allcategories` with `acprefix` to discover categories dynamically rather than hardcoding names.

### Item categories

**Top-level item taxonomy (`Items_by_*`):**

| Category | Subcategories | Maps to |
|----------|--------------|---------|
| `Items_by_equipment_slot` | 9 top-level + 11 slot-specific (see below) | `items.equipment_slot` |
| `Items_by_material` | 48 (Adamantine, Mithral, Cold Iron, etc.) | `items.material` |
| `Items_by_minimum_level` | 42 (ML 0 through ML 34) | `items.minimum_level` |
| `Items_by_effect` | 559 (Vorpal, Deception, Maiming, etc.) | `item_effects` |
| `Items_by_ability_change` | 7 (STR/DEX/CON/INT/WIS/CHA + Well Rounded) | `item_bonuses` (ability stats) |
| `Items_by_skill_change` | 28 (Balance, Bluff, Diplomacy, etc.) | `item_bonuses` (skill stats) |
| `Items_by_bonus_type` | 6 (Artifact, Exceptional, Festive, Insightful, Profane, Quality) | `item_bonuses.bonus_type_id` |
| `Items_by_augment_slot` | 9 (Blue, Colorless, Green, Moon, Orange, Purple, Red, Sun, Yellow) | `item_augment_slots` |
| `Items_by_bind_status` | 4 (Binds to, Binds on, Drops on, Exclusive) | `items.binding` |
| `Items_by_hand` | 1 (Main hand items) | `items.handedness` |
| `Items_by_damage_type` | 3 (Good, Magic, Pierce) | `item_weapon_stats` |
| `Items_by_enchantment` | 10 (Armor/Weapon/Jewelry/Shield/Clothing enchantments, etc.) | `item_bonuses` |
| `Items_by_update` | per-update | Item discovery by game update |
| `Items_by_location` | varies | Not currently mapped |

**Equipment slot categories (flat item lists, namespace 500):**

| Category | ~Count | DB slot name |
|----------|--------|-------------|
| `Trinket_items` | 569 | Trinket |
| `Finger_items` | 728 | Ring |
| `Head_items` | 502 | Head |
| `Back_items` | 598 | Back |
| `Neck_items` | 500 | Neck |
| `Waist_items` | 388 | Waist |
| `Wrist_items` | 404 | Wrists |
| `Hand_items` | 365 | Hands |
| `Feet_items` | 335 | Feet |
| `Eye_items` | 369 | Goggles |
| `Quiver_items` | 16 | Quiver |
| `Cloth_items` | 750 | Cross-slot (robes, gloves, helms, wraps) |

Missing slot categories (no category or empty): Body/Chest armor, Off-hand, Shoulder.

**Per-stat bonus categories:**

The wiki maintains categories like `{Stat}_items` with subcategories `{Stat} +{Value} items` encoding structured bonus data. Example: `Seeker_items` contains `Seeker +2 items` through `Seeker +15 items`, plus `Insightful_Seeker_items` and `Quality_Seeker_items` for bonus type variants. The `+` in URLs must be encoded as `%2B`.

```
https://ddowiki.com/api.php?action=query&list=categorymembers&cmtitle=Category:Seeker_%2B10_items&cmnamespace=500&cmlimit=500&format=json
```

**Clickie (item spell) categories:**

`Clicky_items` has 316 spell-specific subcategories (e.g., `Haste_clicky_items`, `Fireball_clicky_items`). Each contains items with that clickie spell.

### Quest categories

| Category | Subcategories | Maps to |
|----------|--------------|---------|
| `Chest_loot` | 617 (one per quest) | `quest_loot` (loot_type='chest') |
| `Quest_rewards` | 57 | `quest_loot` (loot_type='reward') |
| `Raid_loot` | 26 | `quest_loot` (loot_type='raid') |
| `Quests_by_adventure_pack` | 65 | `quests.pack_id` |
| `Quests_by_patron` | 22 | `quests.patron_id` |
| `Quests_by_level` | varies | `quests.level` |
| `Quests_by_story_arc` | varies | Quest chains |
| `Quests_requiring_flagging` | 21 pages | `quest_flagging` |

The wiki page `Named_chest_loot` renders `Category:Chest_loot` via `{{Category listing}}`. Each subcategory (e.g., `A_Break_In_the_Ice_loot`) contains Item: pages. Strip suffix ` loot` or ` reward items` to get quest name.

**Current state of these mappings** (as of 2026-07-25):

- The three loot categories are walked by `collect_quest_loot`, which tags each mapping with its `loot_type`. Because the WAF challenge blocks the scrape, the shipped DB's `loot_type` is populated only for `raid`, by an offline backfill — see [`raid_quests.py`](../scripts/src/ddo_data/game_data/raid_quests.py). A single successful items scrape fills `chest` and `reward` too.
- The `Quests_by_*` categories are **not walked by any code**, despite the mapping column above. Quest pack, patron, level, and zone come from the static [`quest_seed_data.json`](../scripts/src/ddo_data/wiki/quest_seed_data.json) via `seed_quest_data` instead. Treat those four rows as intent, not implementation.
- **`Category:Raid_loot` is stale relative to the wiki's `Raids` page** (verified in-browser 2026-07-25 — top-level navigation passes the WAF, so hand-checks in a real browser remain possible even while the API is blocked). The category page was last modified in 2015 and carries 26 subcategories; the `Raids` page lists 41 raids. Newer raids' loot (Killing Time, Riding the Storm Out, Old Baba's Hut, The Curse of Strahd, Skeletons in the Closet, …) is categorized under `Chest_loot` only. Consequence: even a successful `Raid_loot` scrape under-tags — the canonical raid list in `raid_quests.py` (reconciled against the `Raids` page) stays necessary until the wiki's categorization is fixed or the scraper cross-references the `Raids` page itself.
- One `Raid_loot` subcategory breaks the naming convention: `The Chronoscope reward items` (suffix `" reward items"` under a `" loot"`-suffixed parent). The scraper now strips against all known suffixes regardless of parent.

### Finding quests and raids

Where to look when you need quest/raid names, their packs, or completeness checks — ranked by authority. Learned during the 2026-07-25 raid reconciliation; all of these are wiki *pages* (not API calls), so while the WAF challenge is up they can be read in a real browser (or Playwright) via top-level navigation, just not fetched by a client.

| Source | URL pattern | What it gives you | Caveats |
|--------|-------------|-------------------|---------|
| **`Quests` hub page** | `/page/Quests` | The entry point for all quest lookups: the quest navbox (every listing below links from here), a per-level count matrix linking `Level_N_quests` pages (N = 1–40), and running totals (869 quests + 56 wilderness areas as of Update 80.0.1, 2026-07). Use the totals as a DB-completeness sanity metric. | Totals count a quest once for heroic and once for epic. Challenges and Lamannia content excluded. |
| **`Level_N_quests` pages** | `/page/Level_<N>_quests` | All quests at a given base level. The unit for level-scoped completeness sweeps ("does the DB have all 78 level-32 quests?"). | Same heroic/epic double-count convention. |
| **`Category:Quests`** | `/page/Category:Quests` | Template-driven membership of every quest page — the completeness cross-check for the hand-maintained listings, same role `Category:Raids` plays for raids. | Membership only, no metadata columns. |
| **`Retired quests`** | `/page/Retired_quests` | Quests removed from the game. Check here before treating a DB quest with no current wiki presence as a scrape bug — it may be retired content. | |
| **`Raids` page** | `/page/Raids` | The canonical raid list — one table row per raid with heroic/epic level, **adventure pack**, and flagging requirements. This is the authority for "is X a raid" and "which pack owns raid X". | Hand-maintained (per-row `edit` links) — but verified complete 2026-07-25 against the template-driven check below (both list the same 41). |
| **`Category:Raids`** | `/page/Category:Raids` | Template-driven raid membership (populated by each quest page's infobox), with `Heroic/Epic/Legendary raids` subcats. **Use as the completeness cross-check** for the hand-maintained table: agreement between the two is strong evidence; disagreement means one of them lags. | Category membership only — no pack/level columns. |
| **`Quests_by_level_and_XP`** | `/page/Quests_by_level_and_XP` | DPL-generated (auto-built) sortable table of EVERY quest: name, level, XP, **adventure pack, patron, favor**. The bulk source for quest metadata — this is where to backfill `quests.pack_id`/`patron_id` gaps rather than reading quest pages one by one. | Large page. |
| **`Quests_by_location`** | `/page/Quests_by_location` | Quests grouped by zone/area — source for `quests.zone`. | |
| **`Quests_by_update`** | `/page/Quests_by_update` | Quests mapped to the game update that shipped them. Useful for "what's new since the last scrape" sweeps. | |
| **Expansion pages** | `/page/<Expansion_Name>` | A `Raid: <name>` line naming the expansion's raid(s), plus release-date prose. Good for per-expansion completeness sweeps ("every expansion has 1–2 raids"). | Two expansions genuinely have none: Shadowfell Conspiracy and Sinister Secret of Saltmarsh (verified 2026-07-25). |
| **Adventure-pack pages** | `/page/<Pack_Name>` | Quest list for the pack; raids appear in it when the pack has one. | Newer quest packs (Fall of the Night Brigade, The Soul Splitter, Grip of the Hidden Hand) are packs, not expansions — no raids, verified. |
| **`Category:Raid_loot`** | `/page/Category:Raid_loot` | Loot subcategories per raid — what the scraper walks for `quest_loot.loot_type`. | **Stale since 2015.** Newer raids' loot is under `Chest_loot` only. Never use this alone to decide raid-ness — use the `Raids` page. |
| **Quest pages** | `/page/<Quest_Name>` | Per-quest detail (level, patron, loot list). | Naming traps below. |

**Content ownership / monetization** — the sources for "which pack owns this content and how is it sold", the data a future content-you-own filter needs (see the Phase 4d entry in [docs/notes/Resource View.md](notes/Resource%20View.md)):

| Source | URL pattern | What it gives you | Caveats |
|--------|-------------|-------------------|---------|
| **`Adventure_Pack` catalog** | `/page/Adventure_Pack` (navbox links it as `Adventure_Packs`) | One table row per purchasable pack: name, level ranges, epic flag, **DDO Points price**, total favor, patron, release date. Expansions appear as rows too (suffixed `... Expansion`). 65 packs as of 2026-07. The source for populating `adventure_packs.is_free_to_play` and any future price/ownership metadata — the DB column currently defaults to 0 for all 76 real packs. | Hand-maintained. A second small table lists "passes" (e.g. Tavern Tales) — a different purchase type. |
| **F2P quest list** | `/page/Guide_to_Free_to_Play#Quest_list` | The quests every account has, listed **per quest** (117 rows: name, level, favor, XP, patron, acquired-at — as of 2026-07), plus a small supplemental table of ~5 individually-free quests that belong to otherwise-paid pack families. | **Free-to-play is quest-granular, not pack-granular** — a pack-level flag (`adventure_packs.is_free_to_play`) cannot represent the free quests inside paid packs. Model free-ness on the quest (membership in this list), and derive item accessibility as "any source quest is accessible". |
| **`Pay_to_Play_quests`** | `/page/Pay_to_Play_quests` | The inverse listing: quests requiring a purchase. | |
| **`Category:Expansion_Packs`** | `/page/Category:Expansion_Packs` | Enumerates the expansions (template-driven). Note the *article* pages `/page/Expansion` and `/page/Expansion_packs` are both 404 — the category is the only enumeration. | |
| **`VIP` page** | `/page/VIP` | What a subscription includes. The load-bearing fact for ownership modeling: VIP grants "access to all Adventure Packs (**excluding expansion content**)" — so VIP is a rule (`all packs − expansions`), not a quest list. T&C names MotU and Shadowfell explicitly as never included. Also links `Account_comparisons` (F2P vs Premium vs VIP matrix). | |
| **`Coupons` page** | `/page/Coupons` | Live table of active DDO Store codes (code, start/expiry, grants) plus a collapsed Expired table — which is where the historic **free-quest-pack giveaway codes** and their granted pack lists live. | Codes rotate weekly — never hardcode *codes*; the durable data is the *pack set* a giveaway granted (source it from the Expired table's grant lists). |

The `Quests` hub navbox also links `Challenge_quests`, `Epic_quests`, `Wilderness_adventure_area`, and `Saga` — start there when hunting a quest listing that isn't covered above.

Naming traps when matching wiki titles to `quests.name` (the raid ones have all caused real bugs — see `scripts/src/ddo_data/game_data/raid_quests.py`):

- **Leading article**: the quest is `The Master Artificer`, not `Master Artificer`.
- **Quest vs. boss name**: the raid is `The Vault of Night`; `Velah, the Crimson Dragon` is the boss inside it.
- **Raid vs. story arc**: `Reign of Madness` is a quest chain, not a raid, despite raid-like presentation.
- **Loot category ≠ quest**: The Shroud's loot lives under `Altar of Fecundity loot` (the crafting altar), not under any Shroud-named category.
- **Subcategory suffixes vary**: mostly `" loot"`, sometimes `" reward items"`, independent of parent category.
- **Legendary re-releases are separate quests** with their own loot tables (`Legendary Tempest's Spine` ≠ `Tempest's Spine`).
- **Disambiguation suffixes on page titles** — a quest's wiki page is NOT always `/page/<quest name>`. Observed variants (all live examples from the Raids page's own links): `(quest)` when the name collides with another entity (`Against_the_Demon_Queen_(quest)` — the bare title is the story arc), `(epic)` for epic versions with their own pages (`Desecrated_Temple_of_Vol_(epic)`), `(story arc)` (`Vault_of_Night_(story_arc)`), `(wilderness)` (`Isle_of_Dread_(wilderness)`), `(Legendary)` (`The_Chronoscope_(Legendary)`). This is exactly why deriving `wiki_url` from `quests.name` breaks (roadmap Phase 4c: add `quests.wiki_url`) — the derived URL lands on the disambiguated/wrong page for every quest in these families.
- **Heroic and epic are separate wiki pages** when a quest has both versions; the DB stores one row per quest name, so a name-keyed scrape must decide which page (or both) feeds it.

### Race and class categories

| Category | Members | Maps to |
|----------|---------|---------|
| `Races` | 32 pages (base + iconic + variants) | `races` table |
| `{Race}_feats` | per-race (e.g., `Elf_feats` = 5) | `race_auto_feats` |
| `{Race}_enhancements` | per-race | Enhancement tree discovery |
| `Classes` | class pages | `classes` table |
| `Class_enhancements` | 15 subcats (one per base class) | Enhancement tree discovery |
| `Racial_enhancements` | per-race subcats | Enhancement tree discovery |
| `Universal_enhancements` | subcats | Enhancement tree discovery |
| `Capstone_enhancements` | subcats | Enhancement tree discovery |

### Spell categories

| Category | Subcategories | Maps to |
|----------|--------------|---------|
| `Spells_by_class` | 19 (15 base + 4 archetypes) | `spell_class_levels` |
| `Spells_by_school` | 10 (8 schools + Innate Attack + SLAs) | `spells.school_id` |
| `Spells_by_metamagic` | 11 (Accelerate, Embolden, Empower, Empower healing, Enlarge, Eschew, Extend, Heighten, Intensify, Maximize, Quicken) | `spell_metamagics` |
| `Spells_by_component` | 8 (Verbal, Somatic, Material, Focus, Divine Focus, etc.) | Not yet in DB |
| `Spells_by_descriptor` | varies | Spell descriptors |
| `Spells_by_effect` | varies | Spell effects |

### Feat categories

| Category | Subcategories | Maps to |
|----------|--------------|---------|
| `Feats_by_usage` | 3 (Active, Passive, Toggled) | `feats.is_passive/is_active` |
| `Feats_by_source` | 10 (Class, Epic, Epic Destiny, Favor, Favor reward, Heroic, Item granted, Legendary, Past life, Racial) | Feat classification |
| `Feats_by_effect` | varies | Feat effects |
| `{Class}_bonus_feats` | per-class (e.g., `Fighter_bonus_feats`) | `feat_bonus_classes` |

### Enhancement categories

| Category | Subcategories |
|----------|--------------|
| `Enhancements` | 9 subcats (Capstone, Class, Racial, Universal, Historical, etc.) |
| `Class_enhancements` | 15 per-class subcats |
| `{Class}_enhancements` | Individual trees for that class |
| `Enhancements_by_effect` | varies |

### Discovery techniques

**Check if a category exists for a given name:**
```
https://ddowiki.com/api.php?action=query&list=allcategories&aclimit=10&acprefix=Elf_feats&format=json
```

**Walk subcategories, then enumerate each:**
```
# Step 1: Get subcategories
https://ddowiki.com/api.php?action=query&list=categorymembers&cmtitle=Category:Chest_loot&cmtype=subcat&cmlimit=500&format=json

# Step 2: Get items in each subcategory
https://ddowiki.com/api.php?action=query&list=categorymembers&cmtitle=Category:A_Break_In_the_Ice_loot&cmnamespace=500&cmtype=page&cmlimit=500&format=json
```

**Reverse lookup (what categories does a page belong to):**
```
https://ddowiki.com/api.php?action=query&prop=categories&titles=Item:Celestia&cllimit=500&format=json
```

**Parse structured data from category names:**
Category names like `Seeker +10 items` encode stat=Seeker, value=10. `Insightful_Seeker_items` encodes bonus_type=Insightful, stat=Seeker. Use regex to extract these fields.


## Bulk Data Pages

These wiki pages contain comprehensive lists useful for data scraping:

- **Named items by update:** `Update_N_named_items` (e.g., `Update_5_named_items`, `Update_75_named_items`) -- each page lists all named items added in that update, with links to individual item pages
- **All quests:** `Quests_by_level`, `All_quests_in_a_single_table`
- **Adventure packs:** `Adventure_Packs`
- **Patrons:** `Patrons`
- **Crafting systems:** `Crafting`, `Cannith_Crafting`, `Green_Steel_items`
- **Enhancement trees:** `Category:Enhancement_trees`
- **Feats by category:** `Category:Fighter_bonus_feats`, `Category:Wizard_bonus_feats`, etc.
- **Races:** `Races` (stat modifiers chart)
- **Class progression:** individual class pages (`Wizard`, `Fighter`, etc.) have level-by-level tables

**API pattern for named items by update:**
```
https://ddowiki.com/api.php?action=parse&page=Update_75_named_items&prop=wikitext&format=json
```

## Usage

- URL-encode page titles (spaces -> underscores or `%20`)
- If a page isn't found, fall back to search
- Prefer `extracts` API for readable content; use `parse` as fallback
- When looking up items, try the name directly first, then `Item:Name`
- **Prefer category enumeration or namespace listing over guessing titles** -- use `allcategories` with `acprefix` to discover categories, then `categorymembers` to list their contents
