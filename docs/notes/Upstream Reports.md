Status legend: ✅ reported upstream · 📋 to report · ❌ won't report

Disagreements between ddowiki and Maetrim's DDOBuilderV2 data files, found while reading the wiki into the ETL override files (roadmap V7). The rule is that his value stands in our data and the disagreement is reported at https://github.com/Maetrim/DDOBuilderV2 rather than patched here; each entry names the wiki page and the override row that carries the note.

## Crafting

- 📋 Slave Lords Crafting — legendary Spell Focus Mastery: wiki +6, his `Slavelords_Legendary` augment is "Spell Focus Mastery +4". Source: https://ddowiki.com/page/Slave_Lords_Crafting; row in `crafting.toml`.
- 📋 Green Steel (heroic) — his `Greensteel_Heroic` family carries only "Weapon Invasion/Subjugation/Devastation/Aspect - NYI" placeholders for weapon effects, so every heroic weapon recipe in `crafting_green_steel.toml` links no augment. The wiki's Manufactured Ingredient Recipes pages have the full weapon tables.
- 📋 Legendary Green Steel tier 1 — equipment guard: wiki 10d6, his augment 8d6. Weapon spell power: wiki Magnetism 139, his +150. Weapon stats: wiki +12, his +15. Source: https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_1.
- 📋 Legendary Green Steel tier 2 — weapon stats: wiki +6, his +7. Positive equipment healing: wiki +8, his 16. Source: https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_2.
- 📋 Legendary Green Steel Active — 40 clickies (Nightshield, Haste, Displacement, …) have no augment in his files and no socket label for the equipment Active slot; recorded as recipes with notes and no slot.

## Items

- 📋 Legendary Powder-Packed Barrel — his drop text "Isle of Dread (wilderness), Rare Chests, and All Hail the King end chest" reads as one segment, so the rare marker attaches to nothing; see `crates/ddo-etl/src/map/drop_location.rs`.
