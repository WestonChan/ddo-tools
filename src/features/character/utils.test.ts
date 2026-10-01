import { describe, it, expect } from 'vitest'
import {
  capitalized,
  lifeNumbersOf,
  missingPastLifeWarnings,
  stackCountsEarnedBy,
  summedBonusText,
  classSplitLabel,
  raceLabelOf,
  currentLifeNumberOf,
  desiredPastLifeCountOf,
  totalStackCountOf,
  withStackCount,
  owningCharacterOf,
  lifeLabelOf,
  raceAndClassLabelOf,
} from './utils'
import type { Character, Life, PastLifeCounts } from './types'

function createTestCharacter(fields: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
    name: 'Test',
    lives: [],
    currentLifeIndex: 0,
    untrackedLives: { heroic: {}, racial: {}, iconic: {}, epic: {} },
    createdAt: '',
    updatedAt: '',
    ...fields,
  }
}

function createTestLife(fields: Partial<Life> = {}): Life {
  return {
    id: 'life-1',
    name: '',
    race: 'human',
    classes: [{ classId: 'fighter', levels: 20 }],
    feats: [],
    enhancements: [],
    status: 'completed',
    ...fields,
  }
}

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalized('fighter')).toBe('Fighter')
  })

  it('handles empty string', () => {
    expect(capitalized('')).toBe('')
  })
})

describe('classSplitLabel', () => {
  it('formats single class', () => {
    const life = createTestLife({ classes: [{ classId: 'paladin', levels: 20 }] })
    expect(classSplitLabel(life)).toBe('20 Paladin')
  })

  it('formats multiclass with separator', () => {
    const life = createTestLife({
      classes: [
        { classId: 'paladin', levels: 18 },
        { classId: 'rogue', levels: 2 },
      ],
    })
    expect(classSplitLabel(life)).toBe('18 Paladin / 2 Rogue')
  })
})

describe('stackCountsEarnedBy', () => {
  it('counts heroic TRs by class', () => {
    const lives = [createTestLife({ reincarnation: { type: 'heroic' } })]
    expect(stackCountsEarnedBy(lives)).toEqual({ fighter: 1 })
  })

  it('counts epic TRs by feat', () => {
    const lives = [createTestLife({ reincarnation: { type: 'epic', epicFeatId: 'doublestrike' } })]
    expect(stackCountsEarnedBy(lives)).toEqual({ doublestrike: 1 })
  })

  it('skips epic TRs without epicFeatId', () => {
    const lives = [createTestLife({ reincarnation: { type: 'epic' } })]
    expect(stackCountsEarnedBy(lives)).toEqual({})
  })

  it('counts only majority class for multiclass heroic TR', () => {
    const lives = [
      createTestLife({
        classes: [
          { classId: 'paladin', levels: 18 },
          { classId: 'rogue', levels: 2 },
        ],
        reincarnation: { type: 'heroic' },
      }),
    ]
    expect(stackCountsEarnedBy(lives)).toEqual({ paladin: 1 })
  })

  it('ignores non-completed lives', () => {
    const lives = [createTestLife({ status: 'current', reincarnation: undefined })]
    expect(stackCountsEarnedBy(lives)).toEqual({})
  })
})

describe('totalStackCountOf', () => {
  it('sums all categories', () => {
    const pastLifeCounts: PastLifeCounts = {
      heroic: { fighter: 2, paladin: 1 },
      racial: { human: 2 },
      iconic: {},
      epic: { doublestrike: 3 },
    }
    expect(totalStackCountOf(pastLifeCounts)).toBe(8)
  })

  it('returns 0 for empty stacks', () => {
    expect(totalStackCountOf({ heroic: {}, racial: {}, iconic: {}, epic: {} })).toBe(0)
  })
})

describe('raceLabelOf', () => {
  it('capitalizes race name', () => {
    expect(raceLabelOf('human')).toBe('Human')
  })

  it('handles single-word races', () => {
    expect(raceLabelOf('elf')).toBe('Elf')
  })

  it('title-cases hyphenated race ids', () => {
    expect(raceLabelOf('eladrin-chaosmancer')).toBe('Eladrin Chaosmancer')
  })
})

describe('classSplitLabel kebab-case classes', () => {
  it('title-cases hyphenated class ids', () => {
    const life = createTestLife({
      classes: [
        { classId: 'favored-soul', levels: 12 },
        { classId: 'artificer', levels: 6 },
      ],
    })
    expect(classSplitLabel(life)).toBe('12 Favored Soul / 6 Artificer')
  })
})

describe('lifeNumbersOf', () => {
  it('starts at 1 with no untracked lives', () => {
    const character = createTestCharacter({
      lives: [createTestLife({ id: 'a', status: 'current', reincarnation: undefined })],
    })
    const lifeNumbersByLifeId = lifeNumbersOf(character)
    expect(lifeNumbersByLifeId.get('a')).toBe(1)
  })

  it('offsets by untracked lives count', () => {
    const character = createTestCharacter({
      untrackedLives: { heroic: { fighter: 3 }, racial: {}, iconic: {}, epic: {} },
      lives: [createTestLife({ id: 'a', status: 'current', reincarnation: undefined })],
    })
    const lifeNumbersByLifeId = lifeNumbersOf(character)
    expect(lifeNumbersByLifeId.get('a')).toBe(4)
  })

  it('increments on each reincarnation', () => {
    const character = createTestCharacter({
      lives: [
        createTestLife({ id: 'a', reincarnation: { type: 'heroic' } }),
        createTestLife({
          id: 'b',
          reincarnation: { type: 'epic', epicFeatId: 'doublestrike' },
        }),
        createTestLife({ id: 'c', status: 'current', reincarnation: undefined }),
      ],
      currentLifeIndex: 2,
    })
    const lifeNumbersByLifeId = lifeNumbersOf(character)
    expect(lifeNumbersByLifeId.get('a')).toBe(1)
    expect(lifeNumbersByLifeId.get('b')).toBe(2)
    expect(lifeNumbersByLifeId.get('c')).toBe(3)
  })
})

describe('currentLifeNumberOf', () => {
  it('returns current life number', () => {
    const character = createTestCharacter({
      untrackedLives: { heroic: { fighter: 2 }, racial: {}, iconic: {}, epic: {} },
      lives: [
        createTestLife({ id: 'a', reincarnation: { type: 'heroic' } }),
        createTestLife({ id: 'b', status: 'current', reincarnation: undefined }),
      ],
      currentLifeIndex: 1,
    })
    expect(currentLifeNumberOf(character)).toBe(4)
  })

  it('returns 1 for empty character', () => {
    const character = createTestCharacter({ lives: [], currentLifeIndex: 0 })
    expect(currentLifeNumberOf(character)).toBe(1)
  })
})

describe('desiredPastLifeCountOf', () => {
  it('returns 0 when no desiredPastLives', () => {
    const life = createTestLife({ status: 'planned' })
    expect(desiredPastLifeCountOf(life)).toBe(0)
  })

  it('counts all categories', () => {
    const life = createTestLife({
      status: 'planned',
      desiredPastLives: {
        heroic: { barbarian: 3 },
        racial: { dwarf: 1 },
        iconic: {},
        epic: { doublestrike: 3 },
      },
    })
    expect(desiredPastLifeCountOf(life)).toBe(7)
  })
})

describe('missingPastLifeWarnings', () => {
  it('returns empty array when no desired past lives', () => {
    const character = createTestCharacter()
    expect(missingPastLifeWarnings(undefined, character)).toEqual([])
  })

  it('returns empty array when character meets all desired stacks', () => {
    const character = createTestCharacter({
      untrackedLives: {
        heroic: { fighter: 3 },
        racial: {},
        iconic: {},
        epic: {},
      },
    })
    const desiredPastLives: PastLifeCounts = {
      heroic: { fighter: 2 },
      racial: {},
      iconic: {},
      epic: {},
    }
    expect(missingPastLifeWarnings(desiredPastLives, character)).toEqual([])
  })

  it('returns warnings when character is missing desired stacks', () => {
    const character = createTestCharacter({
      untrackedLives: {
        heroic: { fighter: 1 },
        racial: {},
        iconic: {},
        epic: {},
      },
    })
    const desiredPastLives: PastLifeCounts = {
      heroic: { fighter: 3 },
      racial: {},
      iconic: {},
      epic: {},
    }
    const warnings = missingPastLifeWarnings(desiredPastLives, character)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Fighter')
    expect(warnings[0]).toContain('heroic')
  })

  it('accounts for history stacks from completed lives', () => {
    const character = createTestCharacter({
      lives: [createTestLife({ reincarnation: { type: 'heroic' } })],
      untrackedLives: { heroic: {}, racial: {}, iconic: {}, epic: {} },
    })
    const desiredPastLives: PastLifeCounts = {
      heroic: { fighter: 1 },
      racial: {},
      iconic: {},
      epic: {},
    }
    expect(missingPastLifeWarnings(desiredPastLives, character)).toEqual([])
  })
})

describe('summedBonusText', () => {
  it('returns empty string for empty array', () => {
    expect(summedBonusText([])).toBe('')
  })

  it('sums matching suffixes', () => {
    expect(summedBonusText(['+10 HP', '+10 HP'])).toBe('+20 HP')
  })

  it('groups different suffixes separately', () => {
    expect(summedBonusText(['+10 HP', '+3 STR'])).toBe('+10 HP, +3 STR')
  })

  it('handles comma-separated parts within a single string', () => {
    expect(summedBonusText(['+1 Balance, +1 CON, +1 Racial AP'])).toBe(
      '+1 Balance, +1 CON, +1 Racial AP',
    )
  })

  it('preserves unsummable parts', () => {
    expect(summedBonusText(['Random effect'])).toBe('Random effect')
  })
})

describe('withStackCount', () => {
  it('sets a value', () => {
    expect(withStackCount({}, 'fighter', 2)).toEqual({ fighter: 2 })
  })

  it('deletes when value <= 0', () => {
    expect(withStackCount({ fighter: 1 }, 'fighter', 0)).toEqual({})
  })

  it('does not mutate original', () => {
    const original = { fighter: 1 }
    withStackCount(original, 'fighter', 0)
    expect(original).toEqual({ fighter: 1 })
  })
})

describe('owningCharacterOf', () => {
  const firstLife = createTestLife({ id: 'life-a' })
  const secondLife = createTestLife({ id: 'life-b' })
  const characters = [
    createTestCharacter({ id: 'first', lives: [firstLife] }),
    createTestCharacter({ id: 'second', lives: [secondLife] }),
  ]

  it('finds the character whose lives include the build', () => {
    expect(owningCharacterOf(characters, 'life-b')?.id).toBe('second')
  })

  it('returns undefined for a planned build no character owns', () => {
    expect(owningCharacterOf(characters, 'planned-1')).toBeUndefined()
  })
})

describe('lifeLabelOf', () => {
  const lifeNumbersByLifeId = new Map([['life-1', 7]])

  it('uses the life name when it has one', () => {
    expect(lifeLabelOf(createTestLife({ name: '  Sorc run ' }), lifeNumbersByLifeId)).toBe(
      'Sorc run',
    )
  })

  it('falls back to the life number', () => {
    expect(lifeLabelOf(createTestLife({ name: ' ' }), lifeNumbersByLifeId)).toBe('Life 7')
  })

  it('shows a question mark for a life missing from the numbering', () => {
    expect(lifeLabelOf(createTestLife({ id: 'other' }), lifeNumbersByLifeId)).toBe('Life ?')
  })
})

describe('raceAndClassLabelOf', () => {
  it('joins the race and the class split with a middot', () => {
    const build = createTestLife({
      race: 'half-elf',
      classes: [
        { classId: 'paladin', levels: 18 },
        { classId: 'rogue', levels: 2 },
      ],
    })
    expect(raceAndClassLabelOf(build)).toBe('Half Elf · 18 Paladin / 2 Rogue')
  })
})
