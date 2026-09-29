import { describe, it, expect } from 'vitest'
import { migrateBuildSelection, migrateCharacters } from './migrations'
import { EMPTY_PAST_LIFE_COUNTS } from './utils'

describe('migrateBuildSelection', () => {
  it('passes through a new-shape selection unchanged', () => {
    const currentSelection = { characterId: 'c1', buildId: 'b1' }
    expect(migrateBuildSelection(currentSelection)).toEqual(currentSelection)
  })

  it('migrates old shape with lifeId only', () => {
    const legacySelection = { characterId: 'c1', lifeId: 'life-1', plannedBuildId: null }
    expect(migrateBuildSelection(legacySelection)).toEqual({ characterId: 'c1', buildId: 'life-1' })
  })

  it('migrates old shape with plannedBuildId (takes precedence over lifeId)', () => {
    const legacySelection = { characterId: 'c1', lifeId: '', plannedBuildId: 'plan-1' }
    expect(migrateBuildSelection(legacySelection)).toEqual({ characterId: 'c1', buildId: 'plan-1' })
  })

  it('falls back to default buildId when both lifeId and plannedBuildId are null', () => {
    const legacySelection = { characterId: 'c1', lifeId: null, plannedBuildId: null }
    const migratedSelection = migrateBuildSelection(legacySelection)
    expect(migratedSelection.characterId).toBe('c1')
    expect(typeof migratedSelection.buildId).toBe('string')
    expect(migratedSelection.buildId.length).toBeGreaterThan(0)
  })

  it('falls back to default characterId when missing', () => {
    const legacySelection = { lifeId: 'life-1' }
    const migratedSelection = migrateBuildSelection(legacySelection)
    expect(typeof migratedSelection.characterId).toBe('string')
    expect(migratedSelection.characterId.length).toBeGreaterThan(0)
    expect(migratedSelection.buildId).toBe('life-1')
  })
})

describe('migrateCharacters', () => {
  it('passes through already-migrated characters unchanged', () => {
    const storedCharacters = [
      { id: 'c1', untrackedLives: { heroic: { fighter: 2 }, racial: {}, iconic: {}, epic: {} } },
    ]
    const migratedCharacters = migrateCharacters(storedCharacters)
    expect(migratedCharacters).toEqual(storedCharacters)
  })

  it('renames pastLifeOverrides to untrackedLives', () => {
    const storedCharacters = [
      { id: 'c1', pastLifeOverrides: { heroic: { fighter: 1 }, racial: {}, iconic: {}, epic: {} } },
    ]
    const migratedCharacters = migrateCharacters(storedCharacters)
    expect(migratedCharacters[0].untrackedLives).toEqual({
      heroic: { fighter: 1 },
      racial: {},
      iconic: {},
      epic: {},
    })
  })

  it('adds empty untrackedLives when neither field exists', () => {
    const storedCharacters = [{ id: 'c1' }]
    const migratedCharacters = migrateCharacters(storedCharacters)
    expect(migratedCharacters[0].untrackedLives).toEqual(EMPTY_PAST_LIFE_COUNTS)
  })
})
