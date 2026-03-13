import { STUB_CHARACTERS, STUB_PLANNED_BUILDS } from '../data/stubCharacters'
import type { Character, Life, PastLifeCounts } from '../types'
import {
  computeLifeNumbers,
  getCurrentLifeNumber,
  EMPTY_UNTRACKED,
  updateCategoryMap,
} from '../utils'
import { useLocalStorage } from '../../../hooks'

export interface Selection {
  characterId: string
  buildId: string // life ID or planned build ID — resolved by lookup
}

const defaultStub = STUB_CHARACTERS[0]
const defaultSelection: Selection = {
  characterId: defaultStub.id,
  buildId: defaultStub.lives[defaultStub.currentLifeIndex]?.id ?? '',
}

/** Migrate old Selection shape (lifeId + plannedBuildId) to unified buildId. */
export function migrateSelection(sel: unknown): Selection {
  const raw = sel as Record<string, unknown>
  if ('buildId' in raw && typeof raw.buildId === 'string') return raw as unknown as Selection
  const buildId =
    (raw.plannedBuildId as string) ?? (raw.lifeId as string) ?? defaultSelection.buildId
  return {
    characterId: (raw.characterId as string) ?? defaultSelection.characterId,
    buildId,
  }
}

/** Migrate old localStorage shape: pastLifeOverrides → untrackedLives */
function migrateCharacters(value: unknown): Character[] {
  const chars = value as Character[]
  return chars.map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = c as any
    if (!c.untrackedLives && raw.pastLifeOverrides) {
      return { ...c, untrackedLives: raw.pastLifeOverrides }
    }
    if (!c.untrackedLives) {
      return { ...c, untrackedLives: EMPTY_UNTRACKED }
    }
    return c
  })
}

/** Shared hook for reading the active character, selection, and planned builds from localStorage. */
export function useActiveCharacter() {
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

  const character = characters.find((c) => c.id === selection.characterId) ?? characters[0]
  const currentLife = character.lives[character.currentLifeIndex]
  const lifeNumbers = computeLifeNumbers(character)
  const lifeNumber = getCurrentLifeNumber(character)

  // Resolve buildId into the viewed life or planned build
  const viewingPlannedBuild = plannedBuilds.find((b) => b.id === selection.buildId)
  const viewingLife = character.lives.find((l) => l.id === selection.buildId)
  const activeBuild = viewingPlannedBuild ?? viewingLife ?? currentLife

  function selectCharacter(charId: string) {
    const char = characters.find((c) => c.id === charId)
    if (!char) return
    setSelection({
      characterId: charId,
      buildId: char.lives[char.currentLifeIndex]?.id ?? '',
    })
  }

  function selectBuild(buildId: string) {
    setSelection((prev) => ({ ...prev, buildId }))
  }

  function setOverride(category: keyof PastLifeCounts, id: string, value: number) {
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

  function setBuildDesired(category: keyof PastLifeCounts, id: string, value: number) {
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
}
