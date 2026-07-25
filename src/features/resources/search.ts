import Fuse, { type IFuseOptions } from 'fuse.js'
import type { ItemRow } from './queries/items'

// Fuse options tuned for short structured names. Higher weight on `name` so
// equipment-slot/material matches don't outrank a name match. `threshold: 0.4`
// keeps "frce" → "Force" working without over-matching unrelated names.
// `ignoreLocation: true` means a match anywhere in the string ranks the same
// regardless of position (we then re-rank below to favor starts-with).
const ITEMS_FUSE_OPTIONS: IFuseOptions<ItemRow> = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'equipment_slot', weight: 0.2 },
    { name: 'rarity', weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  shouldSort: true,
}

export function buildItemsIndex(rows: ItemRow[]): Fuse<ItemRow> {
  return new Fuse(rows, ITEMS_FUSE_OPTIONS)
}

// Re-rank Fuse hits so that exact > starts-with > word-boundary > substring
// (within the same Fuse-score bucket). Fuse alone gives fuzzy ranking but
// can put a substring match above a starts-with on a longer string; the
// second pass restores intuitive lookup order for short structured names.
function lookupRank(name: string, query: string): number {
  const n = name.toLowerCase()
  const q = query.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (new RegExp(`\\b${escapeRegex(q)}`).test(n)) return 2
  if (n.includes(q)) return 3
  return 4
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Empty query returns `rows` untouched, preserving whatever order the caller
// established — `listItems` sorts by descending minimum level, then slot, then
// name. Non-empty queries hit Fuse, then re-rank.
export function searchItems(
  fuse: Fuse<ItemRow>,
  rows: ItemRow[],
  query: string,
): ItemRow[] {
  const q = query.trim()
  if (!q) return rows

  const fuseHits = fuse.search(q)
  return fuseHits
    .map(({ item, score }) => ({ item, score: score ?? 1, rank: lookupRank(item.name, q) }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.score - b.score
    })
    .map(({ item }) => item)
}
