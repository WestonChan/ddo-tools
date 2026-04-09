# DDO Wiki API Reference

The DDO Wiki (ddowiki.com) is a MediaWiki site. Use `WebFetch` with its API to look up game information.

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
| `Raid_loot` | 25 | `quest_loot` (loot_type='raid') |
| `Quests_by_adventure_pack` | 65 | `quests.pack_id` |
| `Quests_by_patron` | 22 | `quests.patron_id` |
| `Quests_by_level` | varies | `quests.level` |
| `Quests_by_story_arc` | varies | Quest chains |
| `Quests_requiring_flagging` | 21 pages | `quest_flagging` |

The wiki page `Named_chest_loot` renders `Category:Chest_loot` via `{{Category listing}}`. Each subcategory (e.g., `A_Break_In_the_Ice_loot`) contains Item: pages. Strip suffix ` loot` or ` reward items` to get quest name.

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
