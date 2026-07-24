import { describe, it, expect } from 'vitest'
import { buildItemsIndex, searchItems } from './search'
import type { ItemRow } from './queries/items'

const rows: ItemRow[] = [
  { id: 1, name: 'Greatsword of Force', rarity: 'Rare', equipment_slot: 'Weapon', minimum_level: 12 },
  { id: 2, name: 'Force Bracers', rarity: 'Uncommon', equipment_slot: 'Wrist', minimum_level: 6 },
  { id: 3, name: 'Robe of Force Resistance', rarity: 'Uncommon', equipment_slot: 'Body', minimum_level: 8 },
  { id: 4, name: 'Boots of the Innocent', rarity: 'Rare', equipment_slot: 'Feet', minimum_level: 14 },
  { id: 5, name: 'Sigil of the Stalwart Defender', rarity: 'Epic', equipment_slot: 'Trinket', minimum_level: 29 },
]

describe('searchItems', () => {
  it('empty query returns original rows', () => {
    const fuse = buildItemsIndex(rows)
    expect(searchItems(fuse, rows, '')).toEqual(rows)
    expect(searchItems(fuse, rows, '   ')).toEqual(rows)
  })

  it('ranks starts-with above other substring matches for same query', () => {
    const fuse = buildItemsIndex(rows)
    const hits = searchItems(fuse, rows, 'Force')
    expect(hits[0].name).toBe('Force Bracers') // starts-with wins
    // The next two should be word-boundary or substring matches; both are
    // valid, just lower-ranked than starts-with.
    expect(hits.slice(0, 3).map((r) => r.name)).toEqual(
      expect.arrayContaining(['Greatsword of Force', 'Robe of Force Resistance']),
    )
  })

  it('exact match (case-insensitive) ranks highest', () => {
    const fuse = buildItemsIndex(rows)
    const hits = searchItems(fuse, rows, 'force bracers')
    expect(hits[0].name).toBe('Force Bracers')
  })

  it('tolerates a single typo via fuzzy match', () => {
    const fuse = buildItemsIndex(rows)
    const hits = searchItems(fuse, rows, 'frce')
    expect(hits.some((r) => r.name === 'Force Bracers')).toBe(true)
  })

  it('returns nothing for unrelated query', () => {
    const fuse = buildItemsIndex(rows)
    expect(searchItems(fuse, rows, 'xyzzy123')).toEqual([])
  })
})
