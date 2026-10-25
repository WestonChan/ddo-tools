import type { ResourceCategory } from '../../lib/resourcePaths'

export const LABEL_BY_RESOURCE_CATEGORY: Record<ResourceCategory, string> = {
  stats: 'Stats',
  enchantments: 'Enchantments',
  items: 'Items',
  feats: 'Feats',
  enhancements: 'Enhancements',
  spells: 'Spells',
  augments: 'Augments',
}

export const ENABLED_RESOURCE_CATEGORIES: ReadonlySet<ResourceCategory> = new Set(['items'])

export const DETAIL_TITLE_ID = 'resources-detail-title'
