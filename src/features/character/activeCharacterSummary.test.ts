import { describe, it, expect } from 'vitest'
import { activeCharacterSummaryOf } from './activeCharacterSummary'
import type { Character, Life } from './types'

function createLife(overrides: Partial<Life> = {}): Life {
  return {
    id: 'life-1',
    name: '',
    race: 'human',
    classes: [{ classId: 'paladin', levels: 18 }, { classId: 'rogue', levels: 2 }],
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
        currentLifeNumber: 1,
        plannedBuilds: [],
      }),
    ).toBeNull()
  })

  it('summarizes the viewed build, past lives and planned builds', () => {
    const viewedBuild = createLife({ name: ' Holy Sword ' })
    const selectedCharacter = createCharacter({
      server: 'Thrane',
      lives: [viewedBuild],
      untrackedLives: { heroic: { fighter: 2 }, racial: {}, iconic: {}, epic: { arcane: 1 } },
    })
    expect(
      activeCharacterSummaryOf({
        characters: [selectedCharacter],
        selectedCharacter,
        viewedBuild,
        currentLifeNumber: 4,
        plannedBuilds: [createLife({ id: 'plan-1' })],
      }),
    ).toEqual({
      characterName: 'Thordak',
      buildName: 'Holy Sword',
      buildSubtitle: 'Human · Life 4 · Thrane server',
      classLabel: '18 Paladin / 2 Rogue',
      pastLifeTotalCount: 3,
      pastLifeCategoryCounts: [
        { category: 'heroic', label: 'heroic', count: 2 },
        { category: 'epic', label: 'epic', count: 1 },
      ],
      plannedBuildCount: 1,
    })
  })

  it('leaves out the server when the character has none', () => {
    const selectedCharacter = createCharacter()
    const summary = activeCharacterSummaryOf({
      characters: [selectedCharacter],
      selectedCharacter,
      viewedBuild: selectedCharacter.lives[0],
      currentLifeNumber: 1,
      plannedBuilds: [],
    })
    expect(summary?.buildSubtitle).toBe('Human · Life 1')
    expect(summary?.buildName).toBe('')
  })
})
