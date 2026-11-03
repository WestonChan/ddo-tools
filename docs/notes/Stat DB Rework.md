Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

📋 Phase 4e — Schema:
- Each bonus is its own DB row (promote out of the per-item denormalized fields).
- ✅ Aliases live in ddo-data's `effect_aliases` (ddo-data#46): an alternate name the game uses ("Spellsight" for Spellcraft) with its own line wording, or a search-only name. The API resolves them in `bonus=`, `q` and effect slugs, and `/v1/effects?q=` reports `matched_alias`, which the Bonuses picker shows as "also: …". Freeform typos and shorthand are ddo-data#19, as search-only aliases.


## Decided schema (2026-10-03)

The Phase 4e entry in `docs/architecture.md` carries the current-to-target schema: `enchantment_kinds` (family, templates, wiki page), `enchantments` (line: kind, values, overrides), `enchantment_bonuses` (stat rows per line), owner links per item, augment and set tier, and `bonus_alias` keyed off kinds and stats. Descriptions are rendered from the kind's template and the line's values, never stored per line unless the sentence is not a function of the value. The bullets above predate that decision; where they disagree, that entry wins.
