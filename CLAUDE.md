# DDO Tools

A toolkit for Dungeons & Dragons Online (DDO) — character builds and gear planning.

## Quick Reference

```bash
# Frontend
npm run dev          # Dev server at http://localhost:5173/ddo-tools/
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

- **App shell** — `src/app/` contains only components that appear on every page: root App, nav bar, bottom bar, loading gate, error boundary. If you removed a feature, the shell should still render.
- **Feature modules** — domain features live under `src/features/`, each owning its own views, components, types, and CSS
  - `src/features/character/` — character builder (class, race, feats, enhancements)
  - `src/features/gear/` — gear planner (items, augments, sets)
- **Shared code** — non-feature code lives at the `src/` level, organized by type
  - `src/components/` — reusable UI components (icons, tooltips, modals, etc.)
  - `src/hooks/` — shared hooks (useDatabase, useLocalStorage)
  - `src/stores/` — shared Zustand stores (Phase 5+)
- **Dependency direction** — imports only flow downward: `app/` can import from `features/` and shared. `features/` can import from shared (`hooks/`, `components/`, `stores/`). Shared code never imports from `features/` or `app/`. Features never import from `app/` or from each other.
- **Python data pipeline** — `scripts/` is a standalone Python package (`ddo-data`)
  - `scripts/src/ddo_data/dat_parser/` — Turbine .dat archive parser (binary format)
  - `scripts/src/ddo_data/game_data/` — parsers for items, feats, enhancements, classes, races
  - `scripts/src/ddo_data/db/` — SQLite game database (`GameDB` class, schema DDL, insert writers)
  - `scripts/src/ddo_data/icons/` — DDS texture extraction and PNG conversion
  - `scripts/src/ddo_data/wiki/` — DDO Wiki scraper (supplementary data)
  - `scripts/tests/` — pytest tests

## Conventions

- **Frontend:** React + TypeScript + Vite. Use feature-based organization. Router basename is `/ddo-tools` (for GitHub Pages).
- **Styling:** Dark theme with gold (#c9a848) accents. Plain CSS in component directories. See `docs/styling.md`.
- **Icons:** Use `lucide-react` for all icons. Pass `size` prop for sizing. Single-color, inherits `currentColor`.
- **Python:** Package lives in `scripts/` with `pyproject.toml`. Use `click` for CLI commands. Type hints required.
- **Data flow:** Python scripts extract game data → `public/data/ddo.db` (SQLite) or JSON files in `public/data/` → React app reads them at runtime.
- **Hosting:** GitHub Pages (static only). Auto-deployed via GitHub Actions on push to `main`.

## Code Quality

- **Keep code clean.** When working in a file, improve adjacent code that is messy, inconsistent, or overly complex. Don't leave a file worse than you found it.
- **Refactor freely.** Extract shared logic, simplify conditionals, improve naming, remove dead code. If a refactor makes the code meaningfully better, do it — don't wait to be asked. Follow refactors wherever they lead; don't artificially limit scope.

## Testing

Python: `pytest scripts/` -- Frontend: `npx vitest run` -- both must pass before committing. See `docs/testing.md` for conventions, mocking patterns, and what to test.

## Commits

- **Atomic commits**: Each commit is a single logical change that passes lint (`npm run lint`) and builds (`npm run build`). No broken intermediate states.
- **Feature branches**: Implementation work happens on feature branches (e.g., `navigation-refactor`). PR back to `main` when complete.
- **Commit per step**: When following a multi-step implementation plan, each step gets its own commit. Don't batch unrelated changes.
- **Tests pass**: All existing tests must pass before committing. New pure logic (stats engine, validation, etc.) must include vitest unit tests.

## CSS

Plain CSS with native nesting, BEM naming, co-located with components. See `docs/styling.md` for full conventions, design tokens, and responsive breakpoints.

## Interaction Patterns

- **Add/remove controls:** Left-click to add/increment, right-click to remove/decrement. This follows DDO in-game patterns (e.g. enhancement spending). Apply this convention to pip-based counters, stack selectors, and similar increment/decrement UI.

## Visual Verification

After implementing or modifying frontend features, use Playwright (via MCP tools) to verify the result:

1. Ensure the dev server (`npm run dev`) and Playwright MCP server (`npm run playwright`) are running.
2. Navigate to the relevant page with `browser_navigate` (base URL: `http://localhost:5173/ddo-tools/`).
3. Take a screenshot with `browser_take_screenshot` to inspect the rendered UI. Use a descriptive filename (e.g. `filename: "feature-name.png"`).
4. Use `browser_snapshot` to inspect the accessibility tree when verifying element structure or finding interactive elements.
5. Verify: correct layout, dark theme with gold (#c9a848) accents, no rendering errors, and that the feature works as intended.

Screenshots are saved to `screenshots/` (gitignored). Use `browser_close` when finished.

## Reference Docs

- `docs/styling.md` — CSS conventions, design tokens, BEM naming, responsive breakpoints, layout architecture
- `docs/testing.md` — Python and frontend testing conventions, mocking patterns, what to test
- `docs/ddowiki-api.md` — How to look up DDO game info from ddowiki.com via WebFetch
- `docs/dat-format.md` — DDO installation path, `.dat` file details, and archive format
- `docs/db-guidelines.md` — SQLite schema design rules: naming conventions, index strategy, enum decisions, DDL ordering
