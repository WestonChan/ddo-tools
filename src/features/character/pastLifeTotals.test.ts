import { describe, it, expect } from 'vitest'
import { pastLifeTotalsOf } from './pastLifeTotals'
import type { Character, Life } from './types'

function createLife(overrides: Partial<Life> = {}): Life {
  return {
    id: 'life-1',
    name: '',
    race: 'human',
    classes: [{ classId: 'fighter', levels: 20 }],
    feats: [],
    enhancements: [],
    status: 'completed',
    ...overrides,
  }
}

function createCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    name: 'Test',
    lives: [],
    currentLifeIndex: 0,
    untrackedLives: { heroic: {}, racial: {}, iconic: {}, epic: {} },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('pastLifeTotalsOf', () => {
  it('returns zeros for a fresh character', () => {
    const pastLifeTotals = pastLifeTotalsOf(createCharacter())
    expect(pastLifeTotals.totalCount).toBe(0)
    expect(pastLifeTotals.countByCategory).toEqual({ heroic: 0, racial: 0, iconic: 0, epic: 0 })
  })

  it('counts each completed life with a reincarnation event by category', () => {
    const pastLifeTotals = pastLifeTotalsOf(
      createCharacter({
        lives: [
          createLife({ id: 'a', reincarnation: { type: 'heroic' } }),
          createLife({ id: 'b', reincarnation: { type: 'heroic' } }),
          createLife({ id: 'c', reincarnation: { type: 'epic', epicFeatId: 'doublestrike' } }),
          createLife({ id: 'd', reincarnation: { type: 'racial' } }),
        ],
      }),
    )
    expect(pastLifeTotals.countByCategory.heroic).toBe(2)
    expect(pastLifeTotals.countByCategory.epic).toBe(1)
    expect(pastLifeTotals.countByCategory.racial).toBe(1)
    expect(pastLifeTotals.countByCategory.iconic).toBe(0)
    expect(pastLifeTotals.totalCount).toBe(4)
  })

  it('skips lives without a reincarnation event (current life)', () => {
    const pastLifeTotals = pastLifeTotalsOf(
      createCharacter({
        lives: [
          createLife({ id: 'a', status: 'current', reincarnation: undefined }),
          createLife({ id: 'b', reincarnation: { type: 'heroic' } }),
        ],
      }),
    )
    expect(pastLifeTotals.totalCount).toBe(1)
  })

  it('adds untracked lives on top of completed lives', () => {
    const pastLifeTotals = pastLifeTotalsOf(
      createCharacter({
        lives: [createLife({ id: 'a', reincarnation: { type: 'heroic' } })],
        untrackedLives: {
          heroic: { fighter: 2, paladin: 1 },
          racial: { human: 1 },
          iconic: {},
          epic: { doublestrike: 3 },
        },
      }),
    )
    expect(pastLifeTotals.countByCategory.heroic).toBe(4)
    expect(pastLifeTotals.countByCategory.racial).toBe(1)
    expect(pastLifeTotals.countByCategory.epic).toBe(3)
    expect(pastLifeTotals.totalCount).toBe(8)
  })

  it('handles iconic and epic together', () => {
    const pastLifeTotals = pastLifeTotalsOf(
      createCharacter({
        untrackedLives: {
          heroic: {},
          racial: {},
          iconic: { 'eladrin-chaosmancer': 1 },
          epic: { brace: 2 },
        },
      }),
    )
    expect(pastLifeTotals.countByCategory.iconic).toBe(1)
    expect(pastLifeTotals.countByCategory.epic).toBe(2)
    expect(pastLifeTotals.totalCount).toBe(3)
  })
})
