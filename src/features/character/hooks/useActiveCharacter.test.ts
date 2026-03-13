import { describe, it, expect } from 'vitest'
import { migrateSelection } from './useActiveCharacter'

describe('migrateSelection', () => {
  it('passes through a new-shape selection unchanged', () => {
    const sel = { characterId: 'c1', buildId: 'b1' }
    expect(migrateSelection(sel)).toEqual(sel)
  })

  it('migrates old shape with lifeId only', () => {
    const old = { characterId: 'c1', lifeId: 'life-1', plannedBuildId: null }
    expect(migrateSelection(old)).toEqual({ characterId: 'c1', buildId: 'life-1' })
  })

  it('migrates old shape with plannedBuildId (takes precedence over lifeId)', () => {
    const old = { characterId: 'c1', lifeId: '', plannedBuildId: 'plan-1' }
    expect(migrateSelection(old)).toEqual({ characterId: 'c1', buildId: 'plan-1' })
  })

  it('falls back to default buildId when both lifeId and plannedBuildId are null', () => {
    const old = { characterId: 'c1', lifeId: null, plannedBuildId: null }
    const result = migrateSelection(old)
    expect(result.characterId).toBe('c1')
    expect(typeof result.buildId).toBe('string')
    expect(result.buildId.length).toBeGreaterThan(0)
  })

  it('falls back to default characterId when missing', () => {
    const old = { lifeId: 'life-1' }
    const result = migrateSelection(old)
    expect(typeof result.characterId).toBe('string')
    expect(result.characterId.length).toBeGreaterThan(0)
    expect(result.buildId).toBe('life-1')
  })
})
