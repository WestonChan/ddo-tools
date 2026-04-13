# Testing Guide

Testing conventions for both the Python data pipeline and the React frontend.

## Python (pytest)

- **Always write tests** for new pipeline code (parsers, writers, scrapers, CLI commands).
- **Test location:** `scripts/tests/` -- mirrors the source structure (e.g., `test_db.py` for `db/writers.py`, `test_cli.py` for `cli.py`).
- **Run tests:** `pytest scripts/` before committing. All tests must pass.
- **What to test:**
  - New writer functions (`insert_*`, `populate_*`, `backfill_*`) -- verify row counts and spot-check data.
  - New parser functions -- test with representative wiki template strings and edge cases.
  - New CLI commands -- use `CliRunner` with mocked wiki/binary data (see existing `test_cli.py` patterns).
  - Schema changes -- ensure `create_schema()` succeeds and new tables/columns exist.
- **Mock external dependencies:** Wiki API calls, binary file reads, and filesystem access should be mocked in tests. Use `unittest.mock.patch` with `contextlib.ExitStack` for multiple mocks.
- **Don't skip tests:** If a test breaks due to your changes, fix the test -- don't delete it.

## Frontend (vitest + @testing-library/react)

- **Run tests:** `npx vitest run` before committing. Setup file: `src/test/setup.ts`.
- **Test location:** Co-locate test files next to source: `useRouter.test.ts` next to `useRouter.ts`, `AppNavBar.test.tsx` next to `AppNavBar.tsx`.
- **What to test:**
  - Hooks with pure logic (routing, stats computation, validation) -- test inputs/outputs directly.
  - Components with interaction logic (nav bar, enhancement trees, skill grid) -- use `@testing-library/react` to render and assert on behavior.
  - Don't test simple presentational components that just render props.
- **Mock sql.js:** For components that use `useDatabase`, mock the hook to return a test DB or stub data. Don't load the real WASM binary in tests.
- **Playwright for visual verification:** Use Playwright MCP (per Visual Verification section in CLAUDE.md) for layout and integration checks. vitest is for unit/component logic.
