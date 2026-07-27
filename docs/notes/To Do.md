Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug · ❓ unscoped (no phase assigned yet)

This is the catch-all for items that don't belong to a view-specific note yet. Everything here is
`❓` by default — when an item gets a phase, move it to the relevant note file with a phase tag.

- ❓ Figure out how to extract item detail images to use on hover
- ❓ Crafting materials/systems view (own top-level view, not part of Resource view)

## Design references

**ddo-builds.com** — reviewed 2026-07-24. Specific implementations worth borrowing, each now
folded into the phase that owns it:

| What | Why | Lands in |
|---|---|---|
| Enhancement trees | Rendered natively in their own theme, not wiki screenshots | Phase 7 (Enhancements spec) |
| Past lives | Types split into tabs so everything stays on one screen | Phase 5 (Characters view spec) |
| Item list icons | Icons make the list scannable without reading every row | Phase 4g (blocked on icon assets) |
| Stat breakdown | Names the source of every stat contribution | Phase 6 — already specified; tightened to require the specific provider, not the slot |
| Class selection | Declare up to 3 classes up front, then per-level dropdowns filter to just those; also enables swapping a whole class's levels at once (our builder can't do this today) | Phase 7 (Build Header + Level Progression spec) |
| Site-metadata footer | Version, last release date, and GitHub link on the main page make the project's freshness and source visible | Phase 4j (landing footer spec) |
