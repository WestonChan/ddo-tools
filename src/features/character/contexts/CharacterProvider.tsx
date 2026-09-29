import { useMemo, type JSX, type ReactNode } from 'react'
import { STUB_CHARACTERS, STUB_PLANNED_BUILDS } from '../data/stubCharacters'
import type { Character, Life, PastLifeCounts } from '../types'
import {
  lifeNumbersOf,
  currentLifeNumberOf,
  EMPTY_PAST_LIFE_COUNTS,
  withStackCount,
} from '../utils'
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
    const selectedCharacter = characters.find((c) => c.id === buildSelection.characterId) ?? characters[0]
    const currentLife = selectedCharacter.lives[selectedCharacter.currentLifeIndex]
    const lifeNumbersByLifeId = lifeNumbersOf(selectedCharacter)
    const currentLifeNumber = currentLifeNumberOf(selectedCharacter)

    const viewedPlannedBuild = plannedBuilds.find((b) => b.id === buildSelection.buildId)
    const viewedLife = selectedCharacter.lives.find((l) => l.id === buildSelection.buildId)
    const viewedBuild = viewedPlannedBuild ?? viewedLife ?? currentLife

    function selectCharacter(characterId: string): void {
      const chosenCharacter = characters.find((c) => c.id === characterId)
      if (!chosenCharacter) return
      setBuildSelection({
        characterId,
        buildId: chosenCharacter.lives[chosenCharacter.currentLifeIndex]?.id ?? '',
      })
    }

    function selectBuild(buildId: string): void {
      setBuildSelection((prev) => ({ ...prev, buildId }))
    }

    function setUntrackedStackCount(category: keyof PastLifeCounts, pastLifeId: string, stackCount: number): void {
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

    function setDesiredStackCount(category: keyof PastLifeCounts, pastLifeId: string, stackCount: number): void {
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
      setBuildSelection,
      plannedBuilds,
      setPlannedBuilds,
      viewedPlannedBuild,
      selectCharacter,
      selectBuild,
      setUntrackedStackCount,
      setDesiredStackCount,
    }
  }, [characters, buildSelection, plannedBuilds, setCharacters, setBuildSelection, setPlannedBuilds])

  return <CharacterContext.Provider value={characterContextValue}>{children}</CharacterContext.Provider>
}
