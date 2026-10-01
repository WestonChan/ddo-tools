import { describe, expect, it } from 'vitest'
import { buildSelectionViewing, buildSelectionWithoutPlannedBuild } from './buildSelection'
import type { BuildSelection } from './migrations'

const comparingLife14: BuildSelection = {
  characterId: 'char-2',
  buildId: '10',
  comparisonBuildId: '3b',
}

describe('buildSelectionViewing', () => {
  it('keeps the comparison when another life of the compared character is viewed', () => {
    expect(buildSelectionViewing(comparingLife14, 'char-1', '3a')).toEqual({
      characterId: 'char-1',
      buildId: '3a',
      comparisonBuildId: '3b',
    })
  })

  it('clears the comparison exactly when the compared build becomes the viewed build', () => {
    expect(buildSelectionViewing(comparingLife14, 'char-1', '3b')).toEqual({
      characterId: 'char-1',
      buildId: '3b',
      comparisonBuildId: null,
    })
  })

  it('keeps the selected character when a planned build is viewed', () => {
    expect(buildSelectionViewing(comparingLife14, null, '4')).toEqual({
      characterId: 'char-2',
      buildId: '4',
      comparisonBuildId: '3b',
    })
  })
})

describe('buildSelectionWithoutPlannedBuild', () => {
  it('falls back to the current life and drops a comparison equal to it', () => {
    const viewingPlannedBuild: BuildSelection = {
      characterId: 'char-1',
      buildId: '4',
      comparisonBuildId: '3b',
    }
    expect(buildSelectionWithoutPlannedBuild(viewingPlannedBuild, '4', '3b')).toEqual({
      characterId: 'char-1',
      buildId: '3b',
      comparisonBuildId: null,
    })
  })

  it('drops the comparison when the compared planned build is deleted', () => {
    const comparingPlannedBuild: BuildSelection = {
      characterId: 'char-1',
      buildId: '3b',
      comparisonBuildId: '4',
    }
    expect(buildSelectionWithoutPlannedBuild(comparingPlannedBuild, '4', '3b')).toEqual({
      characterId: 'char-1',
      buildId: '3b',
      comparisonBuildId: null,
    })
  })

  it('leaves an unrelated selection alone', () => {
    expect(buildSelectionWithoutPlannedBuild(comparingLife14, '4', '3b')).toBe(comparingLife14)
  })
})
