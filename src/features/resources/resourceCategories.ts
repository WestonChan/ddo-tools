export const RESOURCE_CATEGORIES = [
  'stats',
  'enchantments',
  'items',
  'feats',
  'enhancements',
  'spells',
  'augments',
  'sets',
] as const

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

export const LABEL_BY_RESOURCE_CATEGORY: Record<ResourceCategory, string> = {
  stats: 'Stats',
  enchantments: 'Enchantments',
  items: 'Items',
  feats: 'Feats',
  enhancements: 'Enhancements',
  spells: 'Spells',
  augments: 'Augments',
  sets: 'Sets',
}

export const ENABLED_RESOURCE_CATEGORIES: ReadonlySet<ResourceCategory> = new Set(['items'])

export function isResourceCategory(categorySlug: string): categorySlug is ResourceCategory {
  return (RESOURCE_CATEGORIES as readonly string[]).includes(categorySlug)
}

export const DETAIL_TITLE_ID = 'resources-detail-title'
