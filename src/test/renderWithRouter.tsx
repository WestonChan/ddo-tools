import { render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router'
import { APP_PATHS } from '../appPaths'

function createStubRouter(renderContent: () => ReactNode, initialPath = '/build-plan'): AnyRouter {
  const rootRoute = createRootRoute({ component: () => <>{renderContent()}</> })
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

export function renderWithRouter(ui: ReactNode, initialPath = '/build-plan'): {
  router: AnyRouter
  renderResult: RenderResult
} {
  const router = createStubRouter(() => ui, initialPath)
  const renderResult = render(<RouterProvider router={router} />)
  return { router, renderResult }
}
