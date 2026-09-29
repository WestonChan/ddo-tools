import Fuse, { type IFuseOptions } from 'fuse.js'
import type { ItemSummary } from './queries/items'

const ITEMS_FUSE_OPTIONS: IFuseOptions<ItemSummary> = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'equipment_slot', weight: 0.2 },
    { name: 'item_category', weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  shouldSort: true,
}

export function createItemSearchIndex(itemSummaries: ItemSummary[]): Fuse<ItemSummary> {
  return new Fuse(itemSummaries, ITEMS_FUSE_OPTIONS)
}

function nameMatchRank(name: string, query: string): number {
  const n = name.toLowerCase()
  const q = query.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (new RegExp(`\\b${escapeForRegularExpression(q)}`).test(n)) return 2
  if (n.includes(q)) return 3
  return 4
}

function escapeForRegularExpression(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function itemsMatchingQuery(
  searchIndex: Fuse<ItemSummary>,
  itemSummaries: ItemSummary[],
  query: string,
): ItemSummary[] {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return itemSummaries

  const searchHits = searchIndex.search(trimmedQuery)
  return searchHits
    .map(({ item, score }) => ({
      item,
      score: score ?? 1,
      rank: nameMatchRank(item.name, trimmedQuery),
    }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.score - b.score
    })
    .map(({ item }) => item)
}
