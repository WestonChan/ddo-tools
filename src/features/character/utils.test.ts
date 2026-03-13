import { describe, it, expect } from 'vitest'
import {
  capitalize,
  computeLifeNumbers,
  computeMismatchWarnings,
  computeHistoryStacks,
  formatBonusList,
  formatClassSummary,
  formatRace,
  getCurrentLifeNumber,
  getPlannedBuildPastLives,
  sumAllStacks,
  updateCategoryMap,
} from './utils'
import type { Character, Life, PastLifeCounts } from './types'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
    name: 'Test',
    lives: [],
    currentLifeIndex: 0,
    untrackedLives: { heroic: {}, racial: {}, iconic: {}, epic: {} },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

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

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('fighter')).toBe('Fighter')
  })

  it('handles empty string', () => {
    expect(capitalize('')).toBe('')
  })
})

describe('formatClassSummary', () => {
  it('formats single class', () => {
    const life = makeLife({ classes: [{ classId: 'paladin', levels: 20 }] })
    expect(formatClassSummary(life)).toBe('20 Paladin')
  })

  it('formats multiclass with separator', () => {
    const life = makeLife({
      classes: [
        { classId: 'paladin', levels: 18 },
        { classId: 'rogue', levels: 2 },
      ],
    })
    expect(formatClassSummary(life)).toBe('18 Paladin / 2 Rogue')
  })
})

describe('computeHistoryStacks', () => {
  it('counts heroic TRs by class', () => {
    const lives = [makeLife({ reincarnation: { type: 'heroic' } })]
    expect(computeHistoryStacks(lives)).toEqual({ fighter: 1 })
  })

  it('counts epic TRs by feat', () => {
    const lives = [makeLife({ reincarnation: { type: 'epic', epicFeatId: 'doublestrike' } })]
    expect(computeHistoryStacks(lives)).toEqual({ doublestrike: 1 })
  })

  it('skips epic TRs without epicFeatId', () => {
    const lives = [makeLife({ reincarnation: { type: 'epic' } })]
    expect(computeHistoryStacks(lives)).toEqual({})
  })

  it('counts only majority class for multiclass heroic TR', () => {
    const lives = [
      makeLife({
        classes: [
          { classId: 'paladin', levels: 18 },
          { classId: 'rogue', levels: 2 },
        ],
        reincarnation: { type: 'heroic' },
      }),
    ]
    expect(computeHistoryStacks(lives)).toEqual({ paladin: 1 })
  })

  it('ignores non-completed lives', () => {
    const lives = [makeLife({ status: 'current', reincarnation: undefined })]
    expect(computeHistoryStacks(lives)).toEqual({})
  })
})

describe('sumAllStacks', () => {
  it('sums all categories', () => {
    const stacks: PastLifeCounts = {
      heroic: { fighter: 2, paladin: 1 },
      racial: { human: 2 },
      iconic: {},
      epic: { doublestrike: 3 },
    }
    expect(sumAllStacks(stacks)).toBe(8)
  })

  it('returns 0 for empty stacks', () => {
    expect(sumAllStacks({ heroic: {}, racial: {}, iconic: {}, epic: {} })).toBe(0)
  })
})

describe('formatRace', () => {
  it('capitalizes race name', () => {
    expect(formatRace('human')).toBe('Human')
  })

  it('handles single-word races', () => {
    expect(formatRace('elf')).toBe('Elf')
  })
})

describe('computeLifeNumbers', () => {
  it('starts at 1 with no untracked lives', () => {
    const char = makeCharacter({
      lives: [makeLife({ id: 'a', status: 'current', reincarnation: undefined })],
    })
    const numbers = computeLifeNumbers(char)
    expect(numbers.get('a')).toBe(1)
  })

  it('offsets by untracked lives count', () => {
    const char = makeCharacter({
      untrackedLives: { heroic: { fighter: 3 }, racial: {}, iconic: {}, epic: {} },
      lives: [makeLife({ id: 'a', status: 'current', reincarnation: undefined })],
    })
    const numbers = computeLifeNumbers(char)
    expect(numbers.get('a')).toBe(4)
  })

  it('increments on each reincarnation', () => {
    const char = makeCharacter({
      lives: [
        makeLife({ id: 'a', reincarnation: { type: 'heroic' } }),
        makeLife({
          id: 'b',
          reincarnation: { type: 'epic', epicFeatId: 'doublestrike' },
        }),
        makeLife({ id: 'c', status: 'current', reincarnation: undefined }),
      ],
      currentLifeIndex: 2,
    })
    const numbers = computeLifeNumbers(char)
    expect(numbers.get('a')).toBe(1)
    expect(numbers.get('b')).toBe(2)
    expect(numbers.get('c')).toBe(3)
  })
})

describe('getCurrentLifeNumber', () => {
  it('returns current life number', () => {
    const char = makeCharacter({
      untrackedLives: { heroic: { fighter: 2 }, racial: {}, iconic: {}, epic: {} },
      lives: [
        makeLife({ id: 'a', reincarnation: { type: 'heroic' } }),
        makeLife({ id: 'b', status: 'current', reincarnation: undefined }),
      ],
      currentLifeIndex: 1,
    })
    expect(getCurrentLifeNumber(char)).toBe(4)
  })

  it('returns 1 for empty character', () => {
    const char = makeCharacter({ lives: [], currentLifeIndex: 0 })
    expect(getCurrentLifeNumber(char)).toBe(1)
  })
})

describe('getPlannedBuildPastLives', () => {
  it('returns 0 when no desiredPastLives', () => {
    const life = makeLife({ status: 'planned' })
    expect(getPlannedBuildPastLives(life)).toBe(0)
  })

  it('counts all categories', () => {
    const life = makeLife({
      status: 'planned',
      desiredPastLives: {
        heroic: { barbarian: 3 },
        racial: { dwarf: 1 },
        iconic: {},
        epic: { doublestrike: 3 },
      },
    })
    expect(getPlannedBuildPastLives(life)).toBe(7)
  })
})

describe('computeMismatchWarnings', () => {
  it('returns empty array when no desired past lives', () => {
    const char = makeCharacter()
    expect(computeMismatchWarnings(undefined, char)).toEqual([])
  })

  it('returns empty array when character meets all desired stacks', () => {
    const char = makeCharacter({
      untrackedLives: {
        heroic: { fighter: 3 },
        racial: {},
        iconic: {},
        epic: {},
      },
    })
    const desired: PastLifeCounts = {
      heroic: { fighter: 2 },
      racial: {},
      iconic: {},
      epic: {},
    }
    expect(computeMismatchWarnings(desired, char)).toEqual([])
  })

  it('returns warnings when character is missing desired stacks', () => {
    const char = makeCharacter({
      untrackedLives: {
        heroic: { fighter: 1 },
        racial: {},
        iconic: {},
        epic: {},
      },
    })
    const desired: PastLifeCounts = {
      heroic: { fighter: 3 },
      racial: {},
      iconic: {},
      epic: {},
    }
    const warnings = computeMismatchWarnings(desired, char)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Fighter')
    expect(warnings[0]).toContain('heroic')
  })

  it('accounts for history stacks from completed lives', () => {
    const char = makeCharacter({
      lives: [makeLife({ reincarnation: { type: 'heroic' } })],
      untrackedLives: { heroic: {}, racial: {}, iconic: {}, epic: {} },
    })
    const desired: PastLifeCounts = {
      heroic: { fighter: 1 },
      racial: {},
      iconic: {},
      epic: {},
    }
    expect(computeMismatchWarnings(desired, char)).toEqual([])
  })
})

describe('formatBonusList', () => {
  it('returns empty string for empty array', () => {
    expect(formatBonusList([])).toBe('')
  })

  it('sums matching suffixes', () => {
    expect(formatBonusList(['+10 HP', '+10 HP'])).toBe('+20 HP')
  })

  it('groups different suffixes separately', () => {
    expect(formatBonusList(['+10 HP', '+3 STR'])).toBe('+10 HP, +3 STR')
  })

  it('handles comma-separated parts within a single string', () => {
    expect(formatBonusList(['+1 Balance, +1 CON, +1 Racial AP'])).toBe(
      '+1 Balance, +1 CON, +1 Racial AP',
    )
  })

  it('preserves unsummable parts', () => {
    expect(formatBonusList(['Random effect'])).toBe('Random effect')
  })
})

describe('updateCategoryMap', () => {
  it('sets a value', () => {
    expect(updateCategoryMap({}, 'fighter', 2)).toEqual({ fighter: 2 })
  })

  it('deletes when value <= 0', () => {
    expect(updateCategoryMap({ fighter: 1 }, 'fighter', 0)).toEqual({})
  })

  it('does not mutate original', () => {
    const original = { fighter: 1 }
    updateCategoryMap(original, 'fighter', 0)
    expect(original).toEqual({ fighter: 1 })
  })
})
