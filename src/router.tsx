import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import AppLayout from './app/AppLayout'
import { CharacterView } from './features/character'
import { SettingsView } from './features/settings'
import {
  BuildPlanView,
  DamageCalcView,
  DebugView,
  FarmChecklistView,
  GearView,
  NotFoundView,
  OverviewView,
} from './app/routeComponents'

// Routes that should render the right-hand stats panel via AppLayout tag
// themselves with `staticData.showStatsPanel`. The layout reads it from the
// matched route, which keeps the rule co-located with the route definition.
const rootRoute = createRootRoute({
  component: AppLayout,
  notFoundComponent: NotFoundView,
})

// Root path redirects to the canonical /build-plan URL so nav-active-state
// logic has a single source of truth (matchRoute({ to: '/build-plan' })).
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/build-plan' })
  },
})

const buildPlanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'build-plan',
  component: BuildPlanView,
  staticData: { showStatsPanel: true },
})

const charactersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'characters',
  component: CharacterView,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'settings',
  component: SettingsView,
})

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'overview',
  component: OverviewView,
})

const gearRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'gear',
  component: GearView,
})

const damageCalcRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'damage-calc',
  component: DamageCalcView,
})

const farmChecklistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'farm-checklist',
  component: FarmChecklistView,
})

const debugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'debug',
  component: DebugView,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  buildPlanRoute,
  charactersRoute,
  settingsRoute,
  overviewRoute,
  gearRoute,
  damageCalcRoute,
  farmChecklistRoute,
  debugRoute,
])

// Strip trailing slash from Vite's BASE_URL (`/ddo-tools/`) — TanStack expects
// `/ddo-tools` (no trailing slash). Vitest inherits Vite config, so tests also
// see this basepath; path literals in tests must include the prefix.
const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

/**
 * Creates a router instance against the full route tree. Prod callers use the
 * default (browser history); tests inject memory history to drive navigation
 * deterministically. Re-creating per test avoids cross-test history bleed.
 */
export function createAppRouter(history?: RouterHistory): ReturnType<typeof createRouter> {
  return createRouter({ routeTree, basepath, history })
}

export const router = createAppRouter()

// Register the router with TanStack's type registry so <Link to="...">,
// useNavigate, and useMatchRoute get the real route tree for type-checking.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
