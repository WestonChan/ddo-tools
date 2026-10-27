# State Management Patterns

How shared, evolving values flow through this React frontend. Three patterns,
each fitting a different shape of "state":

1. **Local component state** (`useState`) — UI state owned by one component
   (open/closed, hover-state, in-flight form values). The default. No special
   considerations.
2. **Persisted user preferences** (`src/lib/persistedState.ts`, read with
   `usePersistedState`) — values the user should see again after a reload or
   on the next visit (theme, accent, the nav bar's expanded flag, each
   resource list's filters, sort and columns, and the characters until
   Phase 5 moves them to `user.db`). The primitive owns every `localStorage`
   and `sessionStorage` access; `no-restricted-globals` and
   `no-restricted-properties` in `eslint.config.js` fail the build when
   anything else touches storage. A declaration (`createPersistedValue`,
   `createPersistedValueFamily`, `createPersistedRecordFamily`) names its
   key, storage area, codec (`text` for the raw strings the `index.html`
   pre-paint script reads, `json` otherwise), default and validator, lives
   at module scope in the file that owns the state, and ends in `Store`
   (`themePreferenceStore`, `navBarExpandedStore`). Reads and saves pass
   the same validator, so a save holds exactly what a reload would read: a
   bad stored value falls back to its default, field by field, and a save
   that fails validation is rejected (`save` returns `false`, nothing
   changes), so it never writes a default over stored data. A preference
   read by several components is still one declaration that every reader
   passes to `usePersistedState`.
3. **Shared async/external state** (`useSyncExternalStore` + module store)
   — values that multiple components subscribe to, derived from an async
   source or imperative side-channel, and where every consumer should see
   the *current* value synchronously on first render. **This document
   focuses on #3 because it's the one most easily implemented wrong.**

---

Example of #2 across two storage areas: `features/resources/resourceListState.ts` keeps each resource category's list state in one record family keyed by category. Filters, sort, the set-bonus option and the column widths and order live in `localStorage`, so a new tab or the next visit restores them; search and scroll live in `sessionStorage`, so they survive a reload but a new tab starts with an empty search at the top. Each field carries its own version and validator, so one bad field never resets the others, and a scroll write never touches `localStorage`. Two tabs on the same list can still revert each other's changes to different fields (ddo-tools#139). Filters in the URL are a separate, later item.

## Pattern: `useSyncExternalStore` for shared/async state

### When to use it

Three signals together mean this is the right pattern:

1. **Singleton-ish underlying source.** One fetch, one init, one cache —
   shared across all callers. Examples in this codebase: the SQLite game
   database (one network load per session); the active colour theme (one
   `data-theme` attribute on the document); the refcount of open modals
   (one background-inert state).
2. **Multiple components read the same value.** Not just one consumer —
   the value flows through the UI in multiple places.
3. **Stale-state flashes on first render would be visible.** If a
   component renders before the source has settled and shows fallback
   content for a frame, that flash is observable. Common symptoms:
   id-fallback text where a name should be ("items #123"), empty-state
   placeholders briefly visible before data arrives, "loading" spinners
   that flicker for a frame and disappear.

If all three apply, `useState + useEffect` is the **anti-pattern** —
React 18 added `useSyncExternalStore` specifically to fix it.

### Why `useState + useEffect` is the wrong shape

The naive implementation:

```ts
export function useDatabase() {
  const [state, setState] = useState({ db: null, loading: true })
  useEffect(() => {
    getDb().then((db) => setState({ db, loading: false }))
  }, [])
  return state
}
```

Looks fine, but: **every component that calls `useDatabase()` has its own
`useState`**. On first render, that local state is `{ db: null, loading: true }`.
Only on the *next* render — after the effect fires and `setState` runs —
does the local state catch up to the module-level promise's resolved value.

So even if the DB has been loaded for ages, a newly-mounting component
spends one render cycle showing the "loading" UI before it knows the DB
is ready. That's the flash.

### The right shape

A module-level store + `useSyncExternalStore`:

```ts
import { useSyncExternalStore } from 'react'

interface State { db: Database | null; loading: boolean; error: Error | null }

let _state: State = { db: null, loading: true, error: null }
const _listeners = new Set<() => void>()

function setState(next: State): void {
  _state = next
  _listeners.forEach((fn) => fn())
}

let _kicked = false
function ensureLoad(): void {
  if (_kicked) return
  _kicked = true
  loadDb()
    .then((db) => setState({ db, loading: false, error: null }))
    .catch((err) => setState({ db: null, loading: false, error: err }))
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}

function getSnapshot(): State { return _state }

export function useDatabase(): State {
  ensureLoad()
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
```

Key properties:

- **First-render-sync**: every consumer reads `_state` directly on first
  render. If the load has already resolved, the consumer immediately sees
  the loaded state — no useState catch-up cycle.
- **One source of truth**: writes via `setState` notify every subscriber.
  A `recheck()` or update from one consumer is visible to all others on
  the next render.
- **Stable references**: `_state` is replaced (not mutated) on changes.
  `getSnapshot` returns the same reference until `setState` runs, so
  `useSyncExternalStore`'s "did the snapshot change?" check works correctly.
- **Server-snapshot pass-through**: the third arg to `useSyncExternalStore`
  (`getSnapshot` again) handles SSR scenarios. We're client-only, but the
  symmetric signature is "best practice."

### Implementation checklist

When writing a new hook of this shape:

- [ ] State lives at module scope, not inside the hook.
- [ ] Subscribers tracked in a `Set<() => void>`; `subscribe` returns the
      cleanup function for `useSyncExternalStore`.
- [ ] `setState` (or whatever your mutator is) replaces the state object
      (don't mutate in place — referential stability matters).
- [ ] Whether the source is async or synchronous, expose an
      `ensureLoad`/`ensureInit`-style kicker that's idempotent and called
      from the hook body. Don't put the load in a module-top-level statement
      (it would fire even when no component mounts; bad for tests and
      tree-shaking). A synchronous store may also call the kicker from
      `getSnapshot` so that getter is total — fine as long as it's
      idempotent and returns the same value once resolved.
- [ ] Pass `getSnapshot` for both the second and third arg of
      `useSyncExternalStore`.
- [ ] If the store mirrors its value into something outside React (a DOM
      attribute, localStorage), route **every** write through one function
      and call it from the init path too — not just the mutator. Otherwise
      the external copy is set once at load and then drifts from the store
      the first time init resolves to something different (the Phase 4h
      `useTheme` bug: `data-theme` said dark, the store said light, and the
      theme button silently did nothing).

### Reference implementations

- **Async server data is TanStack Query's job, not a hand-rolled store.**
  Game data comes from `ddo-api` through the hooks in
  [`src/features/resources/queries/useItems.ts`](../src/features/resources/queries/useItems.ts);
  the `QueryClient` in `main.tsx` is the shared external store (dedupes
  in-flight requests, caches forever since the data is immutable per
  deployment). The pattern below is for state that is *not* server data.
  (`useDatabase`, the former reference example of "async resource +
  multiple consumers", was removed with sql.js in V6; the code samples
  below keep its name as a worked example.)
- [`src/hooks/useTheme.ts`](../src/hooks/useTheme.ts) — synchronous shared
  preference resolved from an external source (localStorage + `matchMedia`)
  that the store also writes back to. Reference for "lazy first-read init,
  and one function that owns the side effect so no path can skip it."
- [`src/hooks/useRegisterActiveModal.ts`](../src/hooks/useRegisterActiveModal.ts) —
  refcounted signal: writers assert while mounted, a separate reader hook
  exposes the boolean. One writer and one reader today
  (`ResourcesView` → `AppLayout`); the refcount exists so stacked overlays
  keep working as more are added. Reference for "imperative-write
  side-channel decoupled from its reader."

### Trade-offs and caveats

- **Module state is global per page-load.** Good for singletons (one DB,
  one health status). Bad for anything that should be scoped (per-route,
  per-character) — use a Provider/Context for those.
- **No automatic teardown.** If your hook is unmounted from all consumers,
  the module state stays around. For session-scoped state this is fine;
  for resource-leaky state (event listeners, intervals), expose a
  `_resetForTests` if needed.
- **Persisted state resets itself between tests.** `src/test/setup.ts`
  clears both storages and calls `resetPersistedStateForTests()` before
  every test, so no test inherits another's preferences. Inside a test,
  `resetPersistedStateForTests()` alone simulates a reload (storage kept,
  cache dropped); `sessionStorage.clear()` followed by the reset simulates
  a new tab.
- **Tests need to reset state between runs.** Module-level state persists
  across vitest test cases in the same file. Provide a test-only reset
  helper if assertions depend on initial state — e.g.
  `resetThemeForTests()` in `useTheme.ts`, `resetActiveModalCountForTests()`
  in `useRegisterActiveModal.ts`.

### When NOT to use it

- **One-consumer hooks** — `useState` is simpler, no shared-state
  semantics needed.
- **State that's genuinely per-component** (form input value, hover state,
  modal open/closed). Each consumer wants its own.
- **State that's per-route or per-character** (build state in Phase 5+).
  Use Zustand stores or Context — not module-level.
- **Truly synchronous derivation from another state** — use `useMemo`,
  not a separate subscribe-able store.
