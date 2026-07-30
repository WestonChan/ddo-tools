Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug · ❓ unscoped (no phase assigned yet)

This is the catch-all for items that don't belong to a view-specific note yet. Everything here is
`❓` by default — when an item gets a phase, move it to the relevant note file with a phase tag.

- ❓ Figure out how to extract item detail images to use on hover. **Candidate source found 2026-07-28**: Maetrim's DDOBuilderV2 ships `Output/DataFiles/ItemImages/` with **8,644 PNGs**, and the author has granted permission to use his data (see roadmap Phase 4l). That would unblock this and the Phase 4g item-list icons together. Needs a licensing/attribution pass and a name→file mapping check first.
- ❓ Crafting materials/systems view (own top-level view, not part of Resource view)
- ❓ **The whole agent-instruction layer is untracked, so durable guidance has to live in `docs/`.** `.gitignore:45` ignores `.claude/` and `:46` ignores `CLAUDE.md` — checked 2026-07-29, both confirmed untracked. That reads as deliberate (agent instructions stay out of the shared repo), so the note here is not "fix the gitignore" but a standing consequence to remember: a convention written to `.claude/rules/*.md` or `CLAUDE.md` reaches only this machine, and a fresh clone gets none of it. Anything another contributor needs belongs in a committed doc under `docs/`, and it must be cross-linked from an already-committed doc — CLAUDE.md's reference table cannot be the only pointer, since the table itself is not shared. Noticed while adding an ETL rule to `.claude/rules/python.md`; the durable half went to [etl-invariants.md](../etl-invariants.md), now linked from [db-guidelines.md](../db-guidelines.md) so the committed set is self-discoverable. Worth an explicit decision only if the intent was ever to share the rules.

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
