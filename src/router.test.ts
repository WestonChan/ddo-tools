import { describe, expect, it } from 'vitest'
import { router } from './router'

const EAGER_ROUTE_IDS = ['__root__', '/', '/damage-calc', '/farm-checklist']

const routes = Object.values(router.routesById)
const lazyRoutes = routes.filter((route) => !EAGER_ROUTE_IDS.includes(route.id))

describe('router', () => {
  it('names only routes that exist as eager', () => {
    expect(routes.map((route) => route.id)).toEqual(expect.arrayContaining(EAGER_ROUTE_IDS))
  })

  it.each(lazyRoutes.map((route) => [route.id, route] as const))(
    'loads the %s view lazily',
    (_, route) => {
      expect(typeof route.options.component?.preload).toBe('function')
    },
  )
})
