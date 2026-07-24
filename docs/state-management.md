# State Management Patterns

How shared, evolving values flow through this React frontend. Three patterns,
each fitting a different shape of "state":

1. **Local component state** (`useState`) — UI state owned by one component
   (open/closed, hover-state, in-flight form values). The default. No special
   considerations.
2. **Persisted user preferences** (`useLocalStorage`) — values the user
   should see again on next session (theme, nav-bar pinned/collapsed,
   future filter persistence). Backed by localStorage; one hook per key.
3. **Shared async/external state** (`useSyncExternalStore` + module store)
   — values that multiple components subscribe to, derived from an async
   source or imperative side-channel, and where every consumer should see
   the *current* value synchronously on first render. **This document
   focuses on #3 because it's the one most easily implemented wrong.**

---

## Pattern: `useSyncExternalStore` for shared/async state

### When to use it

Three signals together mean this is the right pattern:

1. **Singleton-ish underlying source.** One fetch, one init, one cache —
   shared across all callers. Examples in this codebase: the SQLite game
   database (one network load per session); the DDO Wiki health ping (one
   probe per session); a session-scoped UI override (e.g. nav-bar
   collapsed because a drawer is open).
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
- [ ] If the source loads async, expose a `ensureLoad`-style kicker that's
      idempotent and called from the hook body. Don't put the load in a
      module-top-level statement (it would fire even when no component
      mounts; bad for tests and tree-shaking).
- [ ] Pass `getSnapshot` for both the second and third arg of
      `useSyncExternalStore`.

### Reference implementations

- [`src/hooks/useDatabase.ts`](../src/hooks/useDatabase.ts) — async DB
  load, exposes `{ db, loading, error }`. Reference example for "async
  resource + multiple consumers."
- [Earlier session example — see `useNavBarOverride.ts` in git history if
  reinstated] — synchronous session-scoped override (no fetch). Reference
  for "imperative-write side-channel with multiple readers."

### Trade-offs and caveats

- **Module state is global per page-load.** Good for singletons (one DB,
  one health status). Bad for anything that should be scoped (per-route,
  per-character) — use a Provider/Context for those.
- **No automatic teardown.** If your hook is unmounted from all consumers,
  the module state stays around. For session-scoped state this is fine;
  for resource-leaky state (event listeners, intervals), expose a
  `_resetForTests` if needed.
- **Tests need to reset state between runs.** Module-level state persists
  across vitest test cases in the same file. Provide a test-only reset
  helper if assertions depend on initial state — e.g.
  `_resetWikiHealthCacheForTests()` in `useWikiHealth.ts`.

### When NOT to use it

- **One-consumer hooks** — `useState` is simpler, no shared-state
  semantics needed.
- **State that's genuinely per-component** (form input value, hover state,
  modal open/closed). Each consumer wants its own.
- **State that's per-route or per-character** (build state in Phase 5+).
  Use Zustand stores or Context — not module-level.
- **Truly synchronous derivation from another state** — use `useMemo`,
  not a separate subscribe-able store.
