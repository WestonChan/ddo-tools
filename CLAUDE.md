# DDO Build Planner

A full build planner for Dungeons & Dragons Online (DDO) — character builds and gear planning.

## Quick Reference

```bash
# Frontend
npm run dev          # Dev server at http://localhost:5173/ddo-builder/
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier
npm run playwright   # Playwright MCP server (port 8931)

# Python data pipeline (run from scripts/)
pip install -e "scripts/.[dev]"  # Install with dev deps (or: uv pip install -e "scripts/.[dev]")
ddo-data --help                  # CLI commands
ddo-data info                    # Show DDO install info and .dat files
ddo-data parse <file>            # Parse a .dat archive header
pytest scripts/                  # Run Python tests
```

## Project Structure

- **Feature-based frontend** — domain features live under `src/features/`, with type-based subfolders within each feature
  - `src/features/character/` — character builder (class, race, feats, enhancements)
  - `src/features/gear/` — gear planner (items, augments, sets)
- **Shared code** — non-feature code lives at the `src/` level, organized by type
  - `src/components/` — reusable UI components (icons, tooltips, modals, etc.)
  - `src/hooks/` — shared hooks and theme config
- **App shell** — `src/app/` contains the root App, router, and layout
- **Python data pipeline** — `scripts/` is a standalone Python package (`ddo-data`)
  - `scripts/src/ddo_data/dat_parser/` — Turbine .dat archive parser (binary format)
  - `scripts/src/ddo_data/game_data/` — parsers for items, feats, enhancements, classes, races
  - `scripts/src/ddo_data/db/` — SQLite game database (`GameDB` class, schema DDL, insert writers)
  - `scripts/src/ddo_data/icons/` — DDS texture extraction and PNG conversion
  - `scripts/src/ddo_data/wiki/` — DDO Wiki scraper (supplementary data)
  - `scripts/tests/` — pytest tests

## Conventions

- **Frontend:** React + TypeScript + Vite. Use feature-based organization. Router basename is `/ddo-builder` (for GitHub Pages).
- **Styling:** Dark theme with gold (#c9a848) accents. CSS modules or plain CSS in component directories.
- **Icons:** Use inline SVG icons with flat color (no emoji). Keep icons single-color, inheriting `currentColor` where possible.
- **Python:** Package lives in `scripts/` with `pyproject.toml`. Use `click` for CLI commands. Type hints required.
- **Data flow:** Python scripts extract game data → `public/data/ddo.db` (SQLite) or JSON files in `public/data/` → React app reads them at runtime.
- **Hosting:** GitHub Pages (static only). Auto-deployed via GitHub Actions on push to `main`.

## Testing

- **Always write tests** for new Python pipeline code (parsers, writers, scrapers, CLI commands).
- **Test location:** `scripts/tests/` — mirrors the source structure (e.g., `test_db.py` for `db/writers.py`, `test_cli.py` for `cli.py`).
- **Run tests:** `pytest scripts/` before committing. All tests must pass.
- **What to test:**
  - New writer functions (`insert_*`, `populate_*`, `backfill_*`) — verify row counts and spot-check data.
  - New parser functions — test with representative wiki template strings and edge cases.
  - New CLI commands — use `CliRunner` with mocked wiki/binary data (see existing `test_cli.py` patterns).
  - Schema changes — ensure `create_schema()` succeeds and new tables/columns exist.
- **Mock external dependencies:** Wiki API calls, binary file reads, and filesystem access should be mocked in tests. Use `unittest.mock.patch` with `contextlib.ExitStack` for multiple mocks.
- **Don't skip tests:** If a test breaks due to your changes, fix the test — don't delete it.

## Commits

- **Atomic commits**: Each commit is a single logical change that passes lint (`npm run lint`) and builds (`npm run build`). No broken intermediate states.
- **Feature branches**: Implementation work happens on feature branches (e.g., `navigation-refactor`). PR back to `main` when complete.
- **Commit per step**: When following a multi-step implementation plan, each step gets its own commit. Don't batch unrelated changes.
- **Tests pass**: All existing tests must pass before committing. New pure logic (stats engine, validation, etc.) must include vitest unit tests.

## Interaction Patterns

- **Add/remove controls:** Left-click to add/increment, right-click to remove/decrement. This follows DDO in-game patterns (e.g. enhancement spending). Apply this convention to pip-based counters, stack selectors, and similar increment/decrement UI.

## Visual Verification

After implementing or modifying frontend features, use Playwright (via MCP tools) to verify the result:

1. Ensure the dev server (`npm run dev`) and Playwright MCP server (`npm run playwright`) are running.
2. Navigate to the relevant page with `browser_navigate` (base URL: `http://localhost:5173/ddo-builder/`).
3. Take a screenshot with `browser_take_screenshot` to inspect the rendered UI. Use a descriptive filename (e.g. `filename: "feature-name.png"`).
4. Use `browser_snapshot` to inspect the accessibility tree when verifying element structure or finding interactive elements.
5. Verify: correct layout, dark theme with gold (#c9a848) accents, no rendering errors, and that the feature works as intended.

Screenshots are saved to `screenshots/` (gitignored). Use `browser_close` when finished.

## Reference Docs

- `docs/ddowiki-api.md` — How to look up DDO game info from ddowiki.com via WebFetch
- `docs/dat-format.md` — DDO installation path, `.dat` file details, and archive format
- `docs/db-guidelines.md` — SQLite schema design rules: naming conventions, index strategy, enum decisions, DDL ordering
