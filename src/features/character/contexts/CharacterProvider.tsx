import { useMemo, type JSX, type ReactNode } from 'react'
import { STUB_CHARACTERS, STUB_PLANNED_BUILDS } from '../data/stubCharacters'
import type { Character, Life, PastLifeCounts } from '../types'
import {
  lifeNumbersOf,
  currentLifeNumberOf,
  EMPTY_PAST_LIFE_COUNTS,
  owningCharacterOf,
  withStackCount,
} from '../utils'
import { buildSelectionViewing, buildSelectionWithoutPlannedBuild } from '../buildSelection'
import { useLocalStorage } from '../../../hooks'
import { defaultBuildSelection, migrateCharacters, migrateBuildSelection } from '../migrations'
import type { BuildSelection } from '../migrations'
import { CharacterContext, type CharacterContextValue } from './characterContext'

export function CharacterProvider({ children }: { children: ReactNode }): JSX.Element {
  const [characters, setCharacters] = useLocalStorage<Character[]>(
    'ddo-characters',
    STUB_CHARACTERS,
    migrateCharacters,
  )
  const [buildSelection, setBuildSelection] = useLocalStorage<BuildSelection>(
    'ddo-selection',
    defaultBuildSelection,
    migrateBuildSelection,
  )
  const [plannedBuilds, setPlannedBuilds] = useLocalStorage<Life[]>(
    'ddo-plannedBuilds',
    STUB_PLANNED_BUILDS,
  )

  const characterContextValue = useMemo<CharacterContextValue>(() => {
    const selectedCharacter =
      characters.find((c) => c.id === buildSelection.characterId) ?? characters[0]
    const currentLife = selectedCharacter.lives[selectedCharacter.currentLifeIndex]
    const lifeNumbersByLifeId = lifeNumbersOf(selectedCharacter)
    const currentLifeNumber = currentLifeNumberOf(selectedCharacter)

    const viewedPlannedBuild = plannedBuilds.find((b) => b.id === buildSelection.buildId)
    const viewedLife = selectedCharacter.lives.find((l) => l.id === buildSelection.buildId)
    const viewedBuild = viewedPlannedBuild ?? viewedLife ?? currentLife

    const comparedBuildId = buildSelection.comparisonBuildId
    const comparisonBuild =
      comparedBuildId && comparedBuildId !== viewedBuild.id
        ? (plannedBuilds.find((b) => b.id === comparedBuildId) ??
          characters.flatMap((c) => c.lives).find((l) => l.id === comparedBuildId) ??
          null)
        : null

    function viewBuild(characterId: string | null, buildId: string): void {
      setBuildSelection((prev) => buildSelectionViewing(prev, characterId, buildId))
    }

    function setComparisonBuildId(buildId: string | null): void {
      setBuildSelection((prev) => ({ ...prev, comparisonBuildId: buildId }))
    }

    function swapViewedAndComparedBuilds(): void {
      if (!comparisonBuild) return
      setBuildSelection({
        characterId: owningCharacterOf(characters, comparisonBuild.id)?.id ?? selectedCharacter.id,
        buildId: comparisonBuild.id,
        comparisonBuildId: viewedBuild.id,
      })
    }

    function deletePlannedBuild(buildId: string): void {
      setPlannedBuilds((prev) => prev.filter((b) => b.id !== buildId))
      setBuildSelection((prev) =>
        buildSelectionWithoutPlannedBuild(prev, buildId, currentLife?.id ?? ''),
      )
    }

    function setUntrackedStackCount(
      category: keyof PastLifeCounts,
      pastLifeId: string,
      stackCount: number,
    ): void {
      setCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== buildSelection.characterId) return c
          const untrackedLives = { ...c.untrackedLives }
          return {
            ...c,
            untrackedLives: {
              ...untrackedLives,
              [category]: withStackCount(untrackedLives[category], pastLifeId, stackCount),
            },
          }
        }),
      )
    }

    function setDesiredStackCount(
      category: keyof PastLifeCounts,
      pastLifeId: string,
      stackCount: number,
    ): void {
      if (!viewedPlannedBuild) return
      const viewedPlannedBuildId = buildSelection.buildId
      setPlannedBuilds((prev) =>
        prev.map((b) => {
          if (b.id !== viewedPlannedBuildId) return b
          const desiredPastLives: PastLifeCounts = b.desiredPastLives ?? EMPTY_PAST_LIFE_COUNTS
          return {
            ...b,
            desiredPastLives: {
              ...desiredPastLives,
              [category]: withStackCount(desiredPastLives[category], pastLifeId, stackCount),
            },
          }
        }),
      )
    }

    return {
      characters,
      setCharacters,
      selectedCharacter,
      currentLife,
      lifeNumbersByLifeId,
      currentLifeNumber,
      viewedBuild,
      buildSelection,
      plannedBuilds,
      setPlannedBuilds,
      viewedPlannedBuild,
      comparisonBuild,
      viewBuild,
      setComparisonBuildId,
      swapViewedAndComparedBuilds,
      deletePlannedBuild,
      setUntrackedStackCount,
      setDesiredStackCount,
    }
  }, [
    characters,
    buildSelection,
    plannedBuilds,
    setCharacters,
    setBuildSelection,
    setPlannedBuilds,
  ])

  return (
    <CharacterContext.Provider value={characterContextValue}>{children}</CharacterContext.Provider>
  )
}
