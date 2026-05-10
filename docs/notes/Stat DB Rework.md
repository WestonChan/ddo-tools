Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

📋 Phase 4e — Schema:
- Each bonus is its own DB row (promote out of the per-item denormalized fields).
- Add `bonus_alias` table mapping freeform aliases (typos, alternate names, shorthand) to canonical bonus rows. Used by user-facing bonus selectors (Resource Report View editor in Phase 5+, picker filters in Phase 4f).
