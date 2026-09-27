export const CATEGORIES = [
  'stats',
  'enchantments',
  'items',
  'feats',
  'enhancements',
  'spells',
  'augments',
  'sets',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  stats: 'Stats',
  enchantments: 'Enchantments',
  items: 'Items',
  feats: 'Feats',
  enhancements: 'Enhancements',
  spells: 'Spells',
  augments: 'Augments',
  sets: 'Sets',
}

export const ENABLED_CATEGORIES: ReadonlySet<Category> = new Set(['items'])

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

export const DETAIL_TITLE_ID = 'resources-detail-title'
