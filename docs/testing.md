# Testing Guide

Testing conventions for the React frontend (unit/integration) and end-to-end browser tests. Two runners, two file-naming patterns:

| Runner | File pattern | Location |
|---|---|---|
| Vitest | `*.test.{ts,tsx}` | co-located in `src/` |
| Playwright | `*.spec.ts` | `e2e/` |

The directory and the filename suffix together identify which runner picks up a file. Don't cross them — `.spec.*` belongs to Playwright, `.test.*` belongs to Vitest.

## Frontend (vitest + @testing-library/react)

- **Run tests:** `npx vitest run` before committing. Setup file: `src/test/setup.ts`.
- **Test location:** Co-locate test files next to source: `useRouter.test.ts` next to `useRouter.ts`, `AppNavBar.test.tsx` next to `AppNavBar.tsx`.
- **File naming:** `*.test.ts` for plain TypeScript (hooks, utils, parsers); `*.test.tsx` for components. Vitest's `include` pattern in [vite.config.ts](../vite.config.ts) only matches `.test.{ts,tsx}` — `.spec.*` is reserved for Playwright (see below).
- **Integration tests:** For tests that exercise multiple modules wired together (vs. a single hook/component in isolation), use the `*.integration.test.tsx` middle-segment convention. Examples: [AppLayout.integration.test.tsx](../src/app/AppLayout.integration.test.tsx), [BottomBarBoundary.integration.test.tsx](../src/app/BottomBarBoundary.integration.test.tsx). The `.integration.` segment is purely a naming signal — Vitest still discovers them via the `.test.tsx` suffix.
- **What to test:**
  - Hooks with pure logic (routing, stats computation, validation) -- test inputs/outputs directly.
  - Components with interaction logic (nav bar, enhancement trees, skill grid) -- use `@testing-library/react` to render and assert on behavior.
  - Don't test simple presentational components that just render props.
- **Game-data tests are tiered — the frontend reads `ddo-api` over HTTP, and nothing in Vitest touches the network:**
  - **Components and views** that read game data: mock the query-hook module (`vi.mock('./queries/useItems', ...)`) and return `{ data, isPending, error }` shapes directly — see [ResourcesView.test.tsx](../src/features/resources/ResourcesView.test.tsx). This keeps component tests synchronous and needs no `QueryClientProvider`.
  - **Fetchers and mappers** (`src/features/resources/queries/items.ts`, `src/lib/api/`): stub `globalThis.fetch` with `vi.fn` returning `Response` objects and assert on the URL built and the view shape produced — see [items.test.ts](../src/features/resources/queries/items.test.ts). The mappers are pure, so most of the coverage is there.
  - **The API's own contract** (row counts, schema, ETags) is tested in the `ddo-data` repo, not here. Don't write a frontend test that asserts a game-data value; it breaks on every dataset rebuild and proves nothing about the frontend.
- **No duplicate test logic:** Before writing a new test, check existing tests in the same file (and related files) for overlapping assertions. If an existing test already covers the behavior, extend it rather than creating a new one. Duplication is acceptable when tests share setup but diverge into significantly different paths (e.g., same starting state but different interactions or failure modes). The bar: if test A's assertions are a strict subset of test B's, merge them. When duplication can't be avoided, extract a helper function. Update test names when merging to reflect the broader scope.
- **Vitest is for logic, not layout:** jsdom has no real layout engine — `getBoundingClientRect` returns zeros and CSS isn't applied. For anything that depends on real browser rendering (pixel positions, responsive breakpoints, scroll, focus), write a Playwright E2E spec (see below) or use Claude's built-in browser tool for ad-hoc visual verification (per the visual verification section in [.claude/rules/frontend.md](../.claude/rules/frontend.md)).

## E2E (Playwright)

- **Run tests:** `npm run test:e2e` (which runs `playwright test`). Requires the dev server — Playwright's [config](../playwright.config.ts) auto-starts `npm run dev` and reuses an existing server in local dev.
- **Test location:** `e2e/` at the project root. Configured via `testDir: './e2e'` in [playwright.config.ts](../playwright.config.ts).
- **File naming:** `*.spec.ts`. The `.spec.` suffix is the Playwright convention and is what distinguishes E2E specs from Vitest unit/integration tests (which use `.test.*`). Don't put `.spec.*` files outside `e2e/` — Vitest's `include` pattern in [vite.config.ts](../vite.config.ts) only matches `.test.{ts,tsx}`, and the directory split + naming convention together keep the two runners from colliding.
- **What to test:**
  - High-level user flows that span multiple pages or features (landing → character builder → save).
  - Layout and visual structure that depends on real browser rendering (responsive breakpoints, icon position stability, scroll, focus management). [nav-bar.spec.ts](../e2e/nav-bar.spec.ts) is the existing pattern for measuring `boundingBox()` deltas.
  - Anything that would require heavy mocking in Vitest — defer it to E2E.
  - Don't duplicate Vitest coverage. If a hook or component has a unit test, don't re-assert the same thing in an E2E spec.
- **Base URL:** `http://localhost:5173/ddo-tools/` (set in [playwright.config.ts](../playwright.config.ts)). Use `page.goto('/')` for the root, not the full URL.
- **State reset:** E2E tests share browser state across tests by default. Reset relevant `localStorage`/cookies in `test.beforeEach` — see [landing.spec.ts](../e2e/landing.spec.ts) for the existing pattern.
- **Don't mock React internals:** There's no `vi.mock` equivalent in a real browser. If you find yourself wanting to mock a hook, that's a signal the test belongs in Vitest, not Playwright.
