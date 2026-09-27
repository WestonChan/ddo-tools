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
  FarmChecklistView,
  GearView,
  NotFoundView,
  OverviewView,
  ResourcesView,
} from './app/routeComponents'

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

const resourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'resources',
  component: ResourcesView,
})

const resourcesCategoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'resources/$category',
  component: ResourcesView,
})

const resourcesItemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'resources/$category/$id',
  component: ResourcesView,
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
  resourcesRoute,
  resourcesCategoryRoute,
  resourcesItemRoute,
])

const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function createAppRouter(
  history?: RouterHistory,
): ReturnType<typeof createRouter<typeof routeTree>> {
  return createRouter({ routeTree, basepath, history })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    showStatsPanel?: boolean
  }
}
