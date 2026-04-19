import { useMemo, type JSX, type ReactNode } from 'react'
import { STUB_CHARACTERS, STUB_PLANNED_BUILDS } from './data/stubCharacters'
import type { Character, Life, PastLifeCounts } from './types'
import {
  computeLifeNumbers,
  getCurrentLifeNumber,
  EMPTY_UNTRACKED,
  updateCategoryMap,
} from './utils'
import { useLocalStorage } from '../../hooks'
import { defaultSelection, migrateCharacters, migrateSelection } from './migrations'
import type { Selection } from './migrations'
import { CharacterContext, type CharacterContextValue } from './context'

export function CharacterProvider({ children }: { children: ReactNode }): JSX.Element {
  const [characters, setCharacters] = useLocalStorage<Character[]>(
    'ddo-characters',
    STUB_CHARACTERS,
    migrateCharacters,
  )
  const [selection, setSelection] = useLocalStorage<Selection>(
    'ddo-selection',
    defaultSelection,
    migrateSelection,
  )
  const [plannedBuilds, setPlannedBuilds] = useLocalStorage<Life[]>(
    'ddo-plannedBuilds',
    STUB_PLANNED_BUILDS,
  )

  const value = useMemo<CharacterContextValue>(() => {
    const character = characters.find((c) => c.id === selection.characterId) ?? characters[0]
    const currentLife = character.lives[character.currentLifeIndex]
    const lifeNumbers = computeLifeNumbers(character)
    const lifeNumber = getCurrentLifeNumber(character)

    const viewingPlannedBuild = plannedBuilds.find((b) => b.id === selection.buildId)
    const viewingLife = character.lives.find((l) => l.id === selection.buildId)
    const activeBuild = viewingPlannedBuild ?? viewingLife ?? currentLife

    function selectCharacter(charId: string): void {
      const char = characters.find((c) => c.id === charId)
      if (!char) return
      setSelection({
        characterId: charId,
        buildId: char.lives[char.currentLifeIndex]?.id ?? '',
      })
    }

    function selectBuild(buildId: string): void {
      setSelection((prev) => ({ ...prev, buildId }))
    }

    function setOverride(category: keyof PastLifeCounts, id: string, value: number): void {
      setCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== selection.characterId) return c
          const untracked = { ...c.untrackedLives }
          return {
            ...c,
            untrackedLives: {
              ...untracked,
              [category]: updateCategoryMap(untracked[category], id, value),
            },
          }
        }),
      )
    }

    function setBuildDesired(category: keyof PastLifeCounts, id: string, value: number): void {
      if (!viewingPlannedBuild) return
      const currentBuildId = selection.buildId
      setPlannedBuilds((prev) =>
        prev.map((b) => {
          if (b.id !== currentBuildId) return b
          const desired: PastLifeCounts = b.desiredPastLives ?? EMPTY_UNTRACKED
          return {
            ...b,
            desiredPastLives: {
              ...desired,
              [category]: updateCategoryMap(desired[category], id, value),
            },
          }
        }),
      )
    }

    return {
      characters,
      setCharacters,
      character,
      currentLife,
      lifeNumbers,
      lifeNumber,
      activeBuild,
      selection,
      setSelection,
      plannedBuilds,
      setPlannedBuilds,
      viewingPlannedBuild,
      selectCharacter,
      selectBuild,
      setOverride,
      setBuildDesired,
    }
  }, [characters, selection, plannedBuilds, setCharacters, setSelection, setPlannedBuilds])

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>
}
