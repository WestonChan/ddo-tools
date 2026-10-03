Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

📋 Phase 4e — Schema:
- Each bonus is its own DB row (promote out of the per-item denormalized fields).
- Add `bonus_alias` table mapping freeform aliases (typos, alternate names, shorthand) to canonical bonus rows. Used by user-facing bonus selectors (Resource Report View editor in Phase 5+, picker filters in Phase 4f).


## Decided schema (2026-10-03)

The roadmap's Phase 4e entry carries the current-to-target schema: `enchantment_kinds` (family, templates, wiki page), `enchantments` (line: kind, values, overrides), `enchantment_bonuses` (stat rows per line), owner links per item, augment and set tier, and `bonus_alias` keyed off kinds and stats. Descriptions are rendered from the kind's template and the line's values, never stored per line unless the sentence is not a function of the value. The bullets above predate that decision; where they disagree, the roadmap entry wins.
