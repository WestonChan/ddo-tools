import type { Slug } from './api'

export const RESOURCE_CATEGORIES = [
  'stats',
  'enchantments',
  'items',
  'feats',
  'enhancements',
  'spells',
  'augments',
] as const

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

export function isResourceCategory(categorySlug: string): categorySlug is ResourceCategory {
  return (RESOURCE_CATEGORIES as readonly string[]).includes(categorySlug)
}

export function resourceCategoryPath(category: ResourceCategory): string {
  return `/resources/${category}`
}

export function resourcePath(category: ResourceCategory, slug: Slug): string {
  return `${resourceCategoryPath(category)}/${slug}`
}

export function resourceUrl(category: ResourceCategory, slug: Slug): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${origin}${basePath}${resourcePath(category, slug)}`
}
