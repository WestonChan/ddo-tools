import { render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router'

// All top-level paths the app defines. Test routers register these so <Link to="...">
// type-checks and resolves in isolation tests, without needing the real route tree.
const APP_PATHS = [
  'build-plan',
  'characters',
  'settings',
  'overview',
  'gear',
  'damage-calc',
  'farm-checklist',
  'debug',
] as const

/**
 * Builds a lightweight test router whose routes all render the children of
 * the root layout. Use this in component tests that need Link / useNavigate /
 * useMatchRoute to work but don't care about the real route components.
 */
export function createTestRouter(component: () => ReactNode, initialPath = '/build-plan'): AnyRouter {
  const rootRoute = createRootRoute({ component: () => <>{component()}<Outlet /></> })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })
  const pathRoutes = APP_PATHS.map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null }),
  )

  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...pathRoutes]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
}

/** Renders `ui` inside a RouterProvider with a test router starting at initialPath. */
export function renderWithRouter(ui: ReactNode, initialPath = '/build-plan'): {
  router: AnyRouter
  result: RenderResult
} {
  const router = createTestRouter(() => ui, initialPath)
  const result = render(<RouterProvider router={router} />)
  return { router, result }
}
