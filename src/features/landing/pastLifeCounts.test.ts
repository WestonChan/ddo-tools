import { describe, it, expect } from 'vitest'
import { pastLifeCountsOf } from './pastLifeCounts'
import type { Character, Life } from '../character'

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

describe('pastLifeCountsOf', () => {
  it('returns zeros for a fresh character', () => {
    const pastLifeCounts = pastLifeCountsOf(createCharacter())
    expect(pastLifeCounts.totalCount).toBe(0)
    expect(pastLifeCounts.countByCategory).toEqual({ heroic: 0, racial: 0, iconic: 0, epic: 0 })
  })

  it('counts each completed life with a reincarnation event by category', () => {
    const pastLifeCounts = pastLifeCountsOf(
      createCharacter({
        lives: [
          createLife({ id: 'a', reincarnation: { type: 'heroic' } }),
          createLife({ id: 'b', reincarnation: { type: 'heroic' } }),
          createLife({ id: 'c', reincarnation: { type: 'epic', epicFeatId: 'doublestrike' } }),
          createLife({ id: 'd', reincarnation: { type: 'racial' } }),
        ],
      }),
    )
    expect(pastLifeCounts.countByCategory.heroic).toBe(2)
    expect(pastLifeCounts.countByCategory.epic).toBe(1)
    expect(pastLifeCounts.countByCategory.racial).toBe(1)
    expect(pastLifeCounts.countByCategory.iconic).toBe(0)
    expect(pastLifeCounts.totalCount).toBe(4)
  })

  it('skips lives without a reincarnation event (current life)', () => {
    const pastLifeCounts = pastLifeCountsOf(
      createCharacter({
        lives: [
          createLife({ id: 'a', status: 'current', reincarnation: undefined }),
          createLife({ id: 'b', reincarnation: { type: 'heroic' } }),
        ],
      }),
    )
    expect(pastLifeCounts.totalCount).toBe(1)
  })

  it('adds untracked lives on top of completed lives', () => {
    const pastLifeCounts = pastLifeCountsOf(
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
    expect(pastLifeCounts.countByCategory.heroic).toBe(4)
    expect(pastLifeCounts.countByCategory.racial).toBe(1)
    expect(pastLifeCounts.countByCategory.epic).toBe(3)
    expect(pastLifeCounts.totalCount).toBe(8)
  })

  it('handles iconic and epic together', () => {
    const pastLifeCounts = pastLifeCountsOf(
      createCharacter({
        untrackedLives: {
          heroic: {},
          racial: {},
          iconic: { 'eladrin-chaosmancer': 1 },
          epic: { brace: 2 },
        },
      }),
    )
    expect(pastLifeCounts.countByCategory.iconic).toBe(1)
    expect(pastLifeCounts.countByCategory.epic).toBe(2)
    expect(pastLifeCounts.totalCount).toBe(3)
  })
})
