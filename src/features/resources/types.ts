// Categories surfaced by the resources browser. Phase 4 MVP enables only
// `items`; the others are placeholders that land in Phase 4e and beyond.
//
// `stats` and `enchantments` are placed FIRST because they're the atomic
// building blocks — items, feats, enhancement trees, spells, etc. all
// reference them. Browsing them first gives users a vocabulary for the
// rest of the resources. Note: `enchantments` (gear bonuses like Vorpal,
// Fortification) is intentionally distinct from `enhancements` (DDO's AP-
// trainable enhancement trees) despite the spelling proximity — they are
// genuinely different DDO concepts.
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

// Categories that are wired up in the current phase. The rest render as disabled
// tabs with a "coming soon" tooltip until their query + detail components land.
export const ENABLED_CATEGORIES: ReadonlySet<Category> = new Set(['items'])

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

// DOM id of the detail heading rendered by EntityHeader. The drawer in
// ResourcesView points `aria-labelledby` at it so the dialog announces the
// entity's name rather than an internal id. A module constant rather than
// `useId()` because the two components are in separate subtrees and only one
// drawer is ever open at a time.
export const DETAIL_TITLE_ID = 'resources-detail-title'
