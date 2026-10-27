import { useMemo, type Dispatch, type JSX, type ReactNode, type SetStateAction } from 'react'
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
import { usePersistedState } from '../../../hooks'
import { createPersistedValue, type PersistedState } from '../../../lib/persistedState'
import { defaultBuildSelection, migrateCharacters, migrateBuildSelection } from '../migrations'
import type { BuildSelection } from '../migrations'
import { CharacterContext, type CharacterContextValue } from './characterContext'

const charactersStore = createPersistedValue<Character[]>({
  storageArea: 'localStorage',
  storageKey: 'ddo-characters',
  codec: 'json',
  defaultValue: STUB_CHARACTERS,
  validatedValue: migrateCharacters,
})

const buildSelectionStore = createPersistedValue<BuildSelection>({
  storageArea: 'localStorage',
  storageKey: 'ddo-selection',
  codec: 'json',
  defaultValue: defaultBuildSelection,
  validatedValue: migrateBuildSelection,
})

const plannedBuildsStore = createPersistedValue<Life[]>({
  storageArea: 'localStorage',
  storageKey: 'ddo-plannedBuilds',
  codec: 'json',
  defaultValue: STUB_PLANNED_BUILDS,
  validatedValue: (candidate) => (Array.isArray(candidate) ? (candidate as Life[]) : undefined),
})

function setterOf<Value>(
  persistedState: PersistedState<Value, Value>,
): Dispatch<SetStateAction<Value>> {
  return (valueOrUpdater) => {
    persistedState.save(
      typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (previous: Value) => Value)(persistedState.snapshot())
        : valueOrUpdater,
    )
  }
}

const setCharacters = setterOf(charactersStore)
const setBuildSelection = setterOf(buildSelectionStore)
const setPlannedBuilds = setterOf(plannedBuildsStore)

export function CharacterProvider({ children }: { children: ReactNode }): JSX.Element {
  const characters = usePersistedState(charactersStore)
  const buildSelection = usePersistedState(buildSelectionStore)
  const plannedBuilds = usePersistedState(plannedBuildsStore)

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
  }, [characters, buildSelection, plannedBuilds])

  return (
    <CharacterContext.Provider value={characterContextValue}>{children}</CharacterContext.Provider>
  )
}
