Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug · ❓ unscoped (no phase assigned yet)

This is the catch-all for items that don't belong to a view-specific note yet. Everything here is
`❓` by default — when an item gets a phase, move it to the relevant note file with a phase tag.

- ❓ Figure out how to extract item detail images to use on hover. **Candidate source found 2026-07-28**: Maetrim's DDOBuilderV2 ships `Output/DataFiles/ItemImages/` with **8,644 PNGs**, and the author has granted permission to use his data (see roadmap Phase 4l). That would unblock this and the Phase 4g item-list icons together. Needs a licensing/attribution pass and a name→file mapping check first.
- ❓ Crafting materials/systems view (own top-level view, not part of Resource view)
- ❓ **`.claude/` is gitignored, so the path-scoped rules are per-machine only.** [CLAUDE.md](../../CLAUDE.md) describes `.claude/rules/*.md` as project infrastructure ("surfaced automatically by `.claude/rules/*.md` when Claude edits matching files"), but `.gitignore:45` ignores the whole `.claude/` directory — so a rule written there reaches nobody else, and a fresh clone gets none of them. Noticed 2026-07-29 while adding an ETL rule to `.claude/rules/python.md`; the durable content went to [etl-invariants.md](../etl-invariants.md) instead. Decide which it should be: re-include `.claude/rules/` in git (`!.claude/rules/`) so the rules are shared, or accept them as local-only and keep all durable guidance in `docs/`. Either way CLAUDE.md's wording should match reality.

## Design references

**ddo-builds.com** — reviewed 2026-07-24. Specific implementations worth borrowing, each now
folded into the phase that owns it:

| What                 | Why                                                                                                                                                                     | Lands in                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Enhancement trees    | Rendered natively in their own theme, not wiki screenshots                                                                                                              | Phase 7 (Enhancements spec)                                                           |
| Past lives           | Types split into tabs so everything stays on one screen                                                                                                                 | Phase 5 (Characters view spec)                                                        |
| Item list icons      | Icons make the list scannable without reading every row                                                                                                                 | Phase 4g (blocked on icon assets)                                                     |
| Stat breakdown       | Names the source of every stat contribution                                                                                                                             | Phase 6 — already specified; tightened to require the specific provider, not the slot |
| Class selection      | Declare up to 3 classes up front, then per-level dropdowns filter to just those; also enables swapping a whole class's levels at once (our builder can't do this today) | Phase 7 (Build Header + Level Progression spec)                                       |
| Site-metadata footer | Version, last release date, and GitHub link on the main page make the project's freshness and source visible                                                            | Phase 4j (landing footer spec)                                                        |
