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
- Submitting sends the edit as a diff to V10's `POST /v1/reports` (decided 2026-10-17; see roadmap V10). The editable unit is the fields a person writes (an effect's name, value, value2, bonus type), never the derived text; the card re-renders from the draft. A review step before submit lists each change with a per-change revert. Duplicates are suppressed by the server's fingerprint and request count: a repeat claim returns its status and verdict ("checked on a date: the wiki says X"). The draft lives in `user.db` as the local override.
- Missing things: the effect picker's empty state offers "Can't find it? Report as missing" (an `unmapped` add with the typed text); a small separate form reports a whole missing entity (kind, name, ddowiki link).
- Before sending, search existing items in the DB for a near match on a missing entity's name and offer "did you mean".
- If the editable view isn't sufficient, suggest the rail's "Report a bug" row instead (the Sentry feedback form after Phase 3b).
- After submission: show a confirmation toast — "Updated locally + report submitted."
- Store the changed item as a local override in `user.db`. Subsequent reads use the override.
- When the canonical DB updates to match the override, drop the override automatically.
- When the canonical DB updates but **doesn't** match the override, show a warning banner with a preview link to the new canonical item; highlight diffs (green/yellow/red) and prompt the user to accept the new canonical version.
