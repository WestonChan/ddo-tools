import { describe, it, expect } from 'vitest'
import { createItemSearchIndex, itemsMatchingQuery } from './itemSearch'
import type { ItemSummary } from './queries/items'

const itemSummaries: ItemSummary[] = [
  {
    id: 1,
    name: 'Greatsword of Force',
    equipmentSlot: 'Weapon',
    category: 'Item',
    pack: null,
    isRaidLoot: false,
    isRareLoot: false,
    minimumLevel: 12,
  },
  {
    id: 2,
    name: 'Force Bracers',
    equipmentSlot: 'Wrist',
    category: 'Item',
    pack: null,
    isRaidLoot: false,
    isRareLoot: false,
    minimumLevel: 6,
  },
  {
    id: 3,
    name: 'Robe of Force Resistance',
    equipmentSlot: 'Body',
    category: 'Item',
    pack: null,
    isRaidLoot: false,
    isRareLoot: false,
    minimumLevel: 8,
  },
  {
    id: 4,
    name: 'Boots of the Innocent',
    equipmentSlot: 'Feet',
    category: 'Item',
    pack: null,
    isRaidLoot: false,
    isRareLoot: false,
    minimumLevel: 14,
  },
  {
    id: 5,
    name: 'Sigil of the Stalwart Defender',
    equipmentSlot: 'Trinket',
    category: 'Item',
    pack: null,
    isRaidLoot: false,
    isRareLoot: false,
    minimumLevel: 29,
  },
]

describe('itemsMatchingQuery', () => {
  it('empty query returns original rows', () => {
    const searchIndex = createItemSearchIndex(itemSummaries)
    expect(itemsMatchingQuery(searchIndex, itemSummaries, '')).toEqual(itemSummaries)
    expect(itemsMatchingQuery(searchIndex, itemSummaries, '   ')).toEqual(itemSummaries)
  })

  it('ranks starts-with above other substring matches for same query', () => {
    const searchIndex = createItemSearchIndex(itemSummaries)
    const hits = itemsMatchingQuery(searchIndex, itemSummaries, 'Force')
    expect(hits[0].name).toBe('Force Bracers')
    expect(hits.slice(0, 3).map((r) => r.name)).toEqual(
      expect.arrayContaining(['Greatsword of Force', 'Robe of Force Resistance']),
    )
  })

  it('exact match (case-insensitive) ranks highest', () => {
    const searchIndex = createItemSearchIndex(itemSummaries)
    const hits = itemsMatchingQuery(searchIndex, itemSummaries, 'force bracers')
    expect(hits[0].name).toBe('Force Bracers')
  })

  it('tolerates a single typo via fuzzy match', () => {
    const searchIndex = createItemSearchIndex(itemSummaries)
    const hits = itemsMatchingQuery(searchIndex, itemSummaries, 'frce')
    expect(hits.some((r) => r.name === 'Force Bracers')).toBe(true)
  })

  it('returns nothing for unrelated query', () => {
    const searchIndex = createItemSearchIndex(itemSummaries)
    expect(itemsMatchingQuery(searchIndex, itemSummaries, 'xyzzy123')).toEqual([])
  })
})
