import { describe, it, expect } from 'vitest'
import { activeCharacterSummaryOf } from './activeCharacterSummary'
import type { Character, Life } from './types'

function createLife(overrides: Partial<Life> = {}): Life {
  return {
    id: 'life-1',
    name: '',
    race: 'human',
    classes: [
      { classId: 'paladin', levels: 18 },
      { classId: 'rogue', levels: 2 },
    ],
    feats: [],
    enhancements: [],
    status: 'current',
    ...overrides,
  }
}

function createCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    name: 'Thordak',
    lives: [createLife()],
    currentLifeIndex: 0,
    untrackedLives: { heroic: {}, racial: {}, iconic: {}, epic: {} },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('activeCharacterSummaryOf', () => {
  it('returns null when there are no characters', () => {
    const selectedCharacter = createCharacter()
    expect(
      activeCharacterSummaryOf({
        characters: [],
        selectedCharacter,
        viewedBuild: selectedCharacter.lives[0],
      }),
    ).toBeNull()
  })

  it('summarizes the character name, the viewed build and the past-life total', () => {
    const viewedBuild = createLife({ name: ' Holy Sword ' })
    const selectedCharacter = createCharacter({
      lives: [viewedBuild],
      untrackedLives: { heroic: { fighter: 2 }, racial: {}, iconic: {}, epic: { arcane: 1 } },
    })
    expect(
      activeCharacterSummaryOf({
        characters: [selectedCharacter],
        selectedCharacter,
        viewedBuild,
      }),
    ).toEqual({
      characterName: 'Thordak',
      classLabel: '18 Paladin / 2 Rogue',
      raceLabel: 'Human',
      pastLifeTotalCount: 3,
    })
  })
})
