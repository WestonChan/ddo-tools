import { afterEach, expect, it, vi } from 'vitest'
import {
  RESOURCE_CATEGORIES,
  isResourceCategory,
  resourceCategoryPath,
  resourcePath,
  resourceUrl,
} from './resourcePaths'
import { API_DETAIL_KINDS, apiDetailPath, slugFromPathSegment } from './api'

afterEach(() => vi.unstubAllEnvs())

it('builds list and detail paths for every existing category', () => {
  const slug = slugFromPathSegment('named-entity')!
  for (const category of RESOURCE_CATEGORIES) {
    expect(isResourceCategory(category)).toBe(true)
    expect(resourceCategoryPath(category)).toBe(`/resources/${category}`)
    expect(resourcePath(category, slug)).toBe(`/resources/${category}/named-entity`)
  }
  expect(isResourceCategory('vendors')).toBe(false)
  expect(API_DETAIL_KINDS).toContain('items')
  expect(apiDetailPath('items', slug)).toBe('/v1/items/named-entity')
})

it('includes the deployment base in absolute links', () => {
  vi.stubEnv('BASE_URL', '/toolkit/')
  expect(resourceUrl('items', slugFromPathSegment('named-item')!)).toBe(
    `${window.location.origin}/toolkit/resources/items/named-item`,
  )
})
