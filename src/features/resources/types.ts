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

// Picker-shape row (id + name + minimal context). Per-category modules extend
// this with their own metadata fields. ItemRow lands in queries/items.ts in
// commit 2; declared here as a type-only stub so PickerPanel can compile.
export interface ItemRow {
  id: number
  name: string
  min_level: number | null
  slot: string | null
  rarity: string | null
}
