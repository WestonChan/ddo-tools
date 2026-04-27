import { describe, it, expect } from 'vitest'
import { countPastLives, formatPatchDate } from './utils'
import type { Character, Life } from '../character'

function makeLife(overrides: Partial<Life> = {}): Life {
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

function makeCharacter(overrides: Partial<Character> = {}): Character {
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

describe('countPastLives', () => {
  it('returns zeros for a fresh character', () => {
    const result = countPastLives(makeCharacter())
    expect(result.total).toBe(0)
    expect(result.byCategory).toEqual({ heroic: 0, racial: 0, iconic: 0, epic: 0 })
  })

  it('counts each completed life with a reincarnation event by category', () => {
    const result = countPastLives(
      makeCharacter({
        lives: [
          makeLife({ id: 'a', reincarnation: { type: 'heroic' } }),
          makeLife({ id: 'b', reincarnation: { type: 'heroic' } }),
          makeLife({ id: 'c', reincarnation: { type: 'epic', epicFeatId: 'doublestrike' } }),
          makeLife({ id: 'd', reincarnation: { type: 'racial' } }),
        ],
      }),
    )
    expect(result.byCategory.heroic).toBe(2)
    expect(result.byCategory.epic).toBe(1)
    expect(result.byCategory.racial).toBe(1)
    expect(result.byCategory.iconic).toBe(0)
    expect(result.total).toBe(4)
  })

  it('skips lives without a reincarnation event (current life)', () => {
    const result = countPastLives(
      makeCharacter({
        lives: [
          makeLife({ id: 'a', status: 'current', reincarnation: undefined }),
          makeLife({ id: 'b', reincarnation: { type: 'heroic' } }),
        ],
      }),
    )
    expect(result.total).toBe(1)
  })

  it('adds untracked lives on top of completed lives', () => {
    const result = countPastLives(
      makeCharacter({
        lives: [makeLife({ id: 'a', reincarnation: { type: 'heroic' } })],
        untrackedLives: {
          heroic: { fighter: 2, paladin: 1 },
          racial: { human: 1 },
          iconic: {},
          epic: { doublestrike: 3 },
        },
      }),
    )
    expect(result.byCategory.heroic).toBe(4) // 1 from lives + 3 untracked
    expect(result.byCategory.racial).toBe(1)
    expect(result.byCategory.epic).toBe(3)
    expect(result.total).toBe(8)
  })

  it('handles iconic and epic together', () => {
    const result = countPastLives(
      makeCharacter({
        untrackedLives: {
          heroic: {},
          racial: {},
          iconic: { 'eladrin-chaosmancer': 1 },
          epic: { brace: 2 },
        },
      }),
    )
    expect(result.byCategory.iconic).toBe(1)
    expect(result.byCategory.epic).toBe(2)
    expect(result.total).toBe(3)
  })
})

describe('formatPatchDate', () => {
  it('formats an ISO date as MMM D, YYYY', () => {
    expect(formatPatchDate('2026-04-26')).toBe('Apr 26, 2026')
  })

  it('does not shift the date by timezone (UTC-stable)', () => {
    // Without timeZone:'UTC' on the formatter, this would render as "Apr 25"
    // in negative-UTC locales — the test guards that regression.
    expect(formatPatchDate('2026-04-26')).toContain('26')
    expect(formatPatchDate('2026-04-26')).not.toContain('25')
  })

  it('handles single-digit days without zero-padding', () => {
    expect(formatPatchDate('2026-04-05')).toBe('Apr 5, 2026')
  })

  it('handles December (month=12)', () => {
    expect(formatPatchDate('2025-12-10')).toBe('Dec 10, 2025')
  })
})
