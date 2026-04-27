import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router'
import AppLayout from './app/AppLayout'
import { CharacterView } from './features/character'
import { LandingView } from './features/landing'
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

// Routes opt into the stats panel via staticData: { showStatsPanel: true }.
const rootRoute = createRootRoute({
  component: AppLayout,
  notFoundComponent: NotFoundView,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingView,
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

// Strip trailing slash from Vite's BASE_URL (`/ddo-tools/`) — TanStack expects no trailing slash.
const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

// Accept optional history so tests can inject createMemoryHistory without cross-test bleed.
export function createAppRouter(
  history?: RouterHistory,
): ReturnType<typeof createRouter<typeof routeTree>> {
  return createRouter({ routeTree, basepath, history })
}

export const router = createAppRouter()

// Register the router with TanStack's type registry so <Link to="...">,
// useNavigate, and useMatchRoute get the real route tree for type-checking.
// Augment StaticDataRouteOption here so route definitions get typed autocomplete
// on staticData and consumers (AppLayout's showRightPanel check) can read it
// without a cast.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    showStatsPanel?: boolean
  }
}
