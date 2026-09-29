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
  DamageCalculatorView,
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

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingView,
})

const buildPlanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'build-plan',
  component: BuildPlanView,
  staticData: { hasBuildSidePanel: true },
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

const damageCalculatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'damage-calc',
  component: DamageCalculatorView,
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

const resourceCategoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'resources/$category',
  component: ResourcesView,
})

const resourceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'resources/$category/$id',
  component: ResourcesView,
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  buildPlanRoute,
  charactersRoute,
  settingsRoute,
  overviewRoute,
  gearRoute,
  damageCalculatorRoute,
  farmChecklistRoute,
  resourcesRoute,
  resourceCategoryRoute,
  resourceDetailRoute,
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
    hasBuildSidePanel?: boolean
  }
}
