Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug

📋 Phase 5+ — Editable detail view:
- Users can report that a resource item does not match reality from the resource detail view.
- Detail-view fields become editable inputs in report mode.
	- Edit-then-revert detection: changing an input then changing it back marks the field as unchanged.
	- Per-field revert button restores the DB value.
	- Enchantments can be added or removed.
		- Diff coloring: new lines green, removed lines red, changed lines yellow. Add this color syntax to [docs/styling.md](../styling.md) when implementing.
		- Bonus-type search uses the alias table from Phase 4e (Stat DB Rework). If the user types a near-miss, suggest the closest canonical bonus.
		- The bonus type/value field is conditional — some bonuses don't take a value.
		- Free-text fallback: user can type a bonus that doesn't exist in the DB.
	- Bonus rows can link to other resource detail views (depends on Phase 4f Categories cross-linking).

📋 Phase 5+ — Submit + override flow:
- Submitting opens a pre-filled GitHub issue with the changed item. Before opening, search existing items in the DB for an exact match to avoid duplicate reports.
- If the editable view isn't sufficient, suggest the bottom-bar "Report a bug" button instead.
- After submission: show a confirmation toast — "Updated locally + report submitted."
- Store the changed item as a local override in `user.db`. Subsequent reads use the override.
- When the canonical DB updates to match the override, drop the override automatically.
- When the canonical DB updates but **doesn't** match the override, show a warning banner with a preview link to the new canonical item; highlight diffs (green/yellow/red) and prompt the user to accept the new canonical version.
