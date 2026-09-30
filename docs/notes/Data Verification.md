Status legend: ✅ verified against the wiki · 🟡 partially verified (what remains is listed) · ⬜ not checked against the wiki · ❌ no wiki source exists · 🔧 wiki fills a field Maetrim lacks

What in `ddo.db` has been checked against ddowiki, how, and what is left. Maetrim's DDOBuilderV2 files are the source of every table; "verified" here means a row or field was compared with the wiki page that states the same fact. Disagreements go to [[Upstream Reports]] and his value stands. Dates are when the check was made; a check against a later DDOBuilderV2 commit than `31ef020` needs redoing for rows that changed. Counts are from the upstream build of 2026-09-29.

## quests (570 quests + 33 challenges)

Source of the check: the wiki's one index page, https://ddowiki.com/page/Quests_by_level_and_XP, read 2026-09-27; 548 of 570 quests matched a row by name (after dropping the wiki's " (R)" raid suffix and his " (Normal/Hard/Elite)" variants).

- ✅ `favor` — 548 of 548 agree.
- ✅ `level` — 494 of 496 heroic rows agree. The two disagreements are his Devil Assault (Hard) 12 and (Elite) 18 against the wiki's single row at 6; his variants are the difficulty-scaled entries and the wiki has one page, so this is a modelling difference, not an error.
- 🟡 `epic_level` — 90 of 114 agree. 24 disagree: 22 where he has no epic level and the wiki does (e.g. The Unquiet Graves 21, Caught in the Web 24, Brothers of the Forge 28), and 2 where he says 21 and the wiki 22 (Haywire Foundry, Jungle of Khyber). Reported in [[Upstream Reports]]; not patched.
- 🟡 `pack` — 529 of 548 agree. All 19 disagreements are two spellings: his "Chill of Ravenloft" vs the wiki's "The Chill of Ravenloft" (18) and his "The Dragon's Hand" vs "The Dragons' Hand" (1). Naming, not facts.
- 🟡 `patron` — 535 of 548 agree. All 13 are his "Keepers of the Feather" vs the wiki's "Keepers of Barovia" (the Ravenloft quests). Naming.
- ⬜ `is_raid`, `difficulties`, `epic_name` — not compared (the index carries raid as a suffix; a scriptable check is possible).
- 🔧 `is_free_to_play`, `legendary_level` — from the same index, for the 548 matched quests. (Duration and per-difficulty XP were also imported on 2026-09-27 and removed on 2026-09-29 by decision: not wanted in the database.) The 22 unmatched quests have neither: A Mad Tea Party, Age of Rage, Gateway to Khyber, Isle of Dread, Land of Lamordia, Memoirs of an Illusory Larcener, Ritual Table, Ruins of Myth Drannor, Saltmarsh, The Church and the Cult, The Cloven-jaw Scourge:Blockade, The Fane of the Six (2), The Feywild, The Giant Lieutenants, The Giants' Lair, The Keeper's Sanctuary, The Library of Threnal, The Missing Expedition, The Ruins of Thunderholme, The Shadow Crypt, To Find a Witness: Archbishop Dryden. Mostly wilderness areas and chains, which the index does not list; each has a wiki page of its own.
- ⬜ `zone`, `bestowed_by`, `flagging` — columns exist, no rows filled; needs one page read per quest.
- ❌ challenges (33) — his `Challenges.xml`; the wiki's Challenges page is not a quest table.

## quest_loot (4,741 links)

- 🟡 `is_rare` — his drop text marks 125 links (`(rare)` / `rare drop`, not `rare encounter`) across 36 quests; the wiki adds 13 more in 6 quests (`data/wiki/quest_loot.toml`). Verified by page read on 2026-09-27 for 50 quests: 9 with rares (Toil and Trouble, Sleeping with the Fishes, The Covered Culvert, The Wish, Death Hosts This Banquet, Going Rogue, The Final Draw, Book Burning, Portal to Below), 31 confirmed without, and 10 whose pages have no loot table so nothing could be read (The Bookbinder Rescue, Raid the Vulkoorim, Bargain of Blood, Rainbow in the Dark, Freshen the Air, The Depths of Doom, The Depths of Discord, The Black Loch, The Bounty Hunter, plus All Hail the King's one ambiguous cell). The other 520 quests are unverified; the 44 random ones in the sample found nothing his text lacked, so a full read was judged not worth its cost (roadmap V7 step 1). Re-open if a user reports a missing rare.
- ⬜ `loot_type` (chest / raid / reward) — his drop text; not compared with the wiki's loot tables. The 50 pages read above had the table columns to do it; a pass over them would verify about 9% of links.
- ⬜ which items link to which quest — his text; the same 50 pages could confirm.

## items (8,487)

- ⬜ stats, bonuses, effects, sockets, sets — his files only; no wiki comparison of any item's numbers has been done.
- ✅ `description` — 8,262 have his text; of the 225 blanks, 8 had flavour text on the wiki and are filled (`data/wiki/descriptions.toml`, read 2026-09-29); 211 have an empty Description on their wiki page and 5 have no page (+1 Ember Repeating Light Crossbow, Dhovras' Amulet, Epic Dhovras' Amulet, Legendary Mining Sights, Scientist's Specs; Mining Sights redirects to Mining Lenses). Nothing more to take from the wiki; the 217 stay blank.
- 🟡 items the wiki has that he lacks — enumerated 2026-09-29 by walking the wiki's item categories in the browser (Weapons 3,390 titles, Rune Arms 129, Eye 218, Finger 436, Neck 344, Trinket 373, Wrist 262; Armor, Clothing and Shields are in subcategories and still being walked). Of 5,152 item titles: 4,506 match his names exactly; 595 are the wiki's per-level pages of tiered items or case variants ("(level 12)") of names he has once; 86 are random loot or starter items; 13 are cosmetic weapons. 220 are named items he lacks: 82 "… of the Oozing Hunger" (Sealed Altar crafted weapons), 80 "Duergarcraft …" weapons, 31 per-level pages of five tiered items he has no version of (Flame Blade, Mindcleaver, Shadowblade, Thorn Blade, Epic Wraps of Endless Light), and 24 others of which about 17 are real named items (The Butcher's Mouth/Teeth/Tongue, The Deep Father's Fang, The Faceless Lord's Reach, The Fetid Prince's Fury, The Shadow Lord's Arcana, The Slime Father's Staff, The Unspeakable Maw, The Unbreakable Divinity, Necronomicannon, Resplendence, Echo of Heartcleaver, Echo of the Wand of Orcus, The Sixth Toe of the Shadow King, Pair of Mind Flayer Nickels and its Legendary form, Dark Bargainer's Pactscroll) and the rest consumables, quest items, an event item and a historic item. All named gaps go upstream (see [[Upstream Reports]]); none are stored here.

## augments (2,246)

- ✅ `description` — all 12 SunAndMoon gems' placeholder "Drops in: ?" lines replaced with their wiki Locations, read 2026-09-29.
- 🟡 crafting recipes that yield them — see crafting below; 1,091 distinct augments are yielded by at least one recorded recipe.
- ✅ augments the wiki has that he lacks — the wiki's Item augments category (1,724 pages, walked 2026-09-29) against his 2,246: 634 match by name, 565 more are the wiki's one-page-per-value scheme ("Diamond of Bluff +10") for augments he holds once with a level table, 256 are the wiki's canonical "Green Steel Augment (…)" pages for effects he names differently (and which our crafting files already carry as recipes), 21 "Set Augment: …" pages are his `set_bonuses`, and the spell-power gems ("Ruby of Combustion 111") are his colour-agnostic Cannith augments ("Combustion"). Nothing is missing that his model does not represent another way; the remaining differences are naming.

## crafting_* (wiki-only tables)

Source: one wiki page per system plus its recipe sub-pages, read 2026-09-29. "Verified" for a recipe means its augment names resolved against his families and its costs were read from the page's tables; rows the page states but his files cannot represent are recorded with notes.

| System | Status | Recipes | Ingredients | Left |
|---|---|---|---|---|
| Slave Lords Crafting | ✅ | 74 | 16 | legendary Spell Focus Mastery value disagrees (his +4 stands) |
| Green Steel items (heroic) | 🟡 | 388 | 85 | his heroic weapon augments are "NYI" placeholders, so all heroic weapon recipes link no augment |
| Legendary Green Steel items | 🟡 | 314 | 54 | 40 Active clickies have no augment and no slot label; 6 value disagreements noted |
| Thunder-Forged | ✅ | 50 | 6 | one bonus-type wording disagreement |
| Alchemical Crafting | 🟡 | 109 | 29 | legendary Tier 0 Mithral row has no augment; station sub-pages disagree with the main page in places |
| Dinosaur Bone crafting | ✅ | 108 | 6 | raid-drop augments have no recipe by nature |
| Viktranium Experiment Crafting | ✅ | 292 | 13 | two wording disagreements |
| Deck of Many Curses | ✅ | 95 | 6 | Curse of the Overloaded has no augment |
| Nearly Complete | ✅ | 68 | 2 | six "+16 <Stat> (Catalyst Crafting)" augments belong to Catalyst Crafting |
| Nearly Finished | 🟡 | 179 | 9 | no Maetrim family; every recipe is note-only |
| Lost Purpose | ✅ | 22 | 2 | "The Fury's Rage" min_level 318 looks like his typo |
| Incredible Potential | 🟡 | 36 | 2 | focus/gem/essence grades not on the page, so those costs are in notes |
| Reaper Forge | ✅ | 15 | 1 | three generic augments are drop-only per the wiki |
| Dragontouched Armor | ✅ | 85 | 4 | |
| Sealed Altar | 🟡 | 9 | 10 | no family; the Sealed sockets are crafted at the Ritual Table and Augmentation Altar (below) |
| Unholy Defiler of the Hidden Hand | 🟡 | 16 | 8 | no family; `VecnaUnleashed` book augments are crafted on no wiki crafting page found so far |
| Stone of Change | ✅ | 18 | 25 | no family by nature |
| Trapmaking | ✅ | 15 | 11 | no family by nature |
| Cauldron of Cadence | ✅ | 23 | 25 | family `Named` (all 21 set augments) |
| Dampened | ✅ | 8 | 6 | |
| Catalyst Crafting | 🟡 | 84 | 90 | the six "+16 <Stat> (Catalyst Crafting)" augments in his `NearlyComplete` family appear on no page and on no item |
| Cauldron of Sora Katra | ✅ | 138 | 56 | table checked by hash; one wiki-internal typo noted |
| Dragonscale Armor | ✅ | 9 | 18 | second commendation disagrees with the Mikrom Sum page |
| Stormreaver Monument | 🟡 | 37 | 33 | Stormreaver's Napkin has no upgrade socket in his files |
| Trace of Madness | ✅ | 10 | 5 | family `Other` (Xoriat Madness augments) |
| Fountain of Necrotic Might | ✅ | 16 | 19 | |
| Suppressed Power | 🟡 | 28 | 27 | Gloves of Titan's Grip and Regalia of the Phoenix have no socket in his files |
| Epic Crafting | 🟡 | 223 | 13 | table checked by hash; Epic Winter's Wrath absent from the wiki list; Epic Cacophonic Verge absent from his files |
| Legendary Crafting | 🟡 | 220 | 11 | table checked by hash; Legendary Sword of Shadow and Legendary Winter's Wrath absent from his files |
| Nebula Fragment Crafting | ✅ | 15 | 12 | |
| Zhentarim Attuned | 🟡 | 6 | 7 | his Magestar socket is spelled "Zentarim"; Lantern Ring and Libram of Silver Magic lack the socket |
| Schism Shard Crafting | ✅ | 9 | 10 | |
| Soulforge | 🟡 | 13 | 17 | family `Named`; Essence of The Masque and Essence of the Champion of the Twins have no augment |
| Esoteric Table | 🟡 | 5 | 6 | family `PlanarSearing`; "Warp the Unholy" has no augment |
| Ritual Table | ✅ | 29 | 28 | families `SealedInFire`, `SealedInUndeath` |
| Augmentation Altar | ✅ | 7 | 3 | families `SealedInFire`, `SealedInUndeath` (the Mist and Gloom sockets) |
| Mikrom Sum | ✅ | 73 | 27 | a vendor page, recorded for its Caught in the Web tiers and commendation upgrades; four set armors lack an upgrade socket in his files |
| Minor Artifact | ❌ | | | an item category plus the sentient filigree system, not crafting |
| Augment Slot, Sentient Weapon | ❌ | | | already his data (gems, filigrees) |
| Essence (Cannith) Crafting | ⬜ | | | deliberately last (Crafting Systems note, D-CS10) |

Totals on 2026-09-29: 37 systems, 2,846 recipes, 702 ingredients; 1,091 distinct augments are yielded by at least one recipe. Items the wiki crafts that his files lack (reported upstream, not stored): Cacophonic Verge and its Dampened and Epic forms, Legendary Sword of Shadow, Legendary Winter's Wrath.

## races, feats, enhancements: descriptions

- ✅ races — Dhampir, Dhampir Dark Bargainer, Tabaxi filled from their pages' lead paragraphs (2026-09-29).
- ❌ feats — the four blank "Pact Magic: …" feats have no wiki page; they stay blank.
- ✅ enhancements — "Divine Disciple: Divine Smiting V" filled from the tree page's rank entry.

## Tables with no wiki check at all

⬜ feats, spells, enhancement_trees / enhancements / selections, races, classes, set_bonuses / tiers / items / augments, filigrees, stances, guild_buffs, optional_buffs, sentient_gems, clickies, modifiers, bonuses, all lookup tables. These are his files as parsed; the ETL's tests cover the parsing, not the facts. A wiki pass over any of them is possible page by page and none is scheduled.
