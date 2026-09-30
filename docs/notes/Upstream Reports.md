Status legend: ✅ reported upstream · 📋 to report · ❌ won't report

Disagreements between ddowiki and Maetrim's DDOBuilderV2 data files, found while reading the wiki into the ETL override files (roadmap V7). The rule is that his value stands in our data and the disagreement is reported at https://github.com/Maetrim/DDOBuilderV2 rather than patched here; each entry names the wiki page and the override row that carries the note.

## Crafting

- 📋 Slave Lords Crafting — legendary Spell Focus Mastery: wiki +6, his `Slavelords_Legendary` augment is "Spell Focus Mastery +4". Source: https://ddowiki.com/page/Slave_Lords_Crafting; row in `crafting.toml`.
- 📋 Green Steel (heroic) — his `Greensteel_Heroic` family carries only "Weapon Invasion/Subjugation/Devastation/Aspect - NYI" placeholders for weapon effects, so every heroic weapon recipe in `crafting_green_steel.toml` links no augment. The wiki's Manufactured Ingredient Recipes pages have the full weapon tables.
- 📋 Legendary Green Steel tier 1 — equipment guard: wiki 10d6, his augment 8d6. Weapon spell power: wiki Magnetism 139, his +150. Weapon stats: wiki +12, his +15. Source: https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_1.
- 📋 Legendary Green Steel tier 2 — weapon stats: wiki +6, his +7. Positive equipment healing: wiki +8, his 16. Source: https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_2.
- 📋 Legendary Green Steel Active — 40 clickies (Nightshield, Haste, Displacement, …) have no augment in his files and no socket label for the equipment Active slot; recorded as recipes with notes and no slot.

- 📋 Alchemical Crafting — his augment names "Lighting Strike" (typo), "Electric Blast" (wiki: Shocking Blast 6), "Cold Blast" (wiki: Icy Blast 6), and "Cold" where the wiki says Water; no Mithral material augment for the legendary Tier 0 Mithral row. Source: https://ddowiki.com/page/Alchemical_Crafting and its station sub-pages.
- 📋 Dinosaur Bone crafting — Horn: Armor Piercing is +22% / +24% on the wiki but +21 / +23 in his augments; he spells Iridescent where the page has Iridiscent (the page is wrong there). Source: https://ddowiki.com/page/Dinosaur_Bone_crafting.
- 📋 Viktranium Experiment Crafting — he names the heroic Dolorous Focus "Dolorous Arcana (Heroic)"; legendary Improved Destruction triggers every second on the wiki, every three seconds in his augment. Source: https://ddowiki.com/page/Viktranium_Experiment_crafting.
- 📋 Thunder-Forged — Shadow Construct: wiki Profane Repair Amplification +10, his augment 10%. Source: https://ddowiki.com/page/Thunder-Forged.

- 📋 Lost Purpose — his augment "The Fury's Rage" has `min_level` 318 where every sibling is 18; looks like a typo. Source: https://ddowiki.com/page/Lost_Purpose.
- 📋 Nearly Complete — healing amplification rows: wiki says Competence bonus, his augments say Enhancement ("+24/+62 Enhancement Healing Amplification"). Source: https://ddowiki.com/page/Nearly_Complete.
- 📋 Reaper Forge — the necklace bonus on the wiki includes +2 PRR/MRR; his augment is only "+2 Melee/Ranged and Spell Power". Source: https://ddowiki.com/page/Reaper_Forge.
- 📋 Naming drift, his side: Deck of Many Curses drops "the" from several curse names ("Curse of Anger's Heart"), Lost Purpose has "Devil's Infernal Dance" for the wiki's "Devils'", Dragontouched has "Skill: Strength" with a space.
- 📋 Family scope: `SealedInFire`/`SealedInUndeath` (the "Sealed in Fire/Mist/Undeath/Gloom" socket augments) and `VecnaUnleashed` (the coloured book augments) are not produced by the Sealed Altar or Unholy Defiler pages; which system crafts them is still to be found.

## Items

- 📋 Legendary Powder-Packed Barrel — his drop text "Isle of Dread (wilderness), Rare Chests, and All Hail the King end chest" reads as one segment, so the rare marker attaches to nothing; see `crates/ddo-etl/src/map/drop_location.rs`.
