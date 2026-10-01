import type { Character } from './types'
import { EMPTY_PAST_LIFE_COUNTS } from './utils'
import { STUB_CHARACTERS } from './data/stubCharacters'

export interface BuildSelection {
  characterId: string
  buildId: string
  comparisonBuildId: string | null
}

const defaultStubCharacter = STUB_CHARACTERS[0]
export const defaultBuildSelection: BuildSelection = {
  characterId: defaultStubCharacter.id,
  buildId: defaultStubCharacter.lives[defaultStubCharacter.currentLifeIndex]?.id ?? '',
  comparisonBuildId: null,
}

export function migrateBuildSelection(storedSelection: unknown): BuildSelection {
  const storedFields = storedSelection as Record<string, unknown>
  const characterId = (storedFields.characterId as string) ?? defaultBuildSelection.characterId
  const comparisonBuildId =
    typeof storedFields.comparisonBuildId === 'string' ? storedFields.comparisonBuildId : null
  if (typeof storedFields.buildId === 'string')
    return { characterId, buildId: storedFields.buildId, comparisonBuildId }
  const buildId =
    (storedFields.plannedBuildId as string) ??
    (storedFields.lifeId as string) ??
    defaultBuildSelection.buildId
  return { characterId, buildId, comparisonBuildId }
}

export function migrateCharacters(storedCharacters: unknown): Character[] {
  const characters = storedCharacters as Character[]
  return characters.map((character) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyCharacter = character as any
    if (!character.untrackedLives && legacyCharacter.pastLifeOverrides) {
      return { ...character, untrackedLives: legacyCharacter.pastLifeOverrides }
    }
    if (!character.untrackedLives) {
      return { ...character, untrackedLives: EMPTY_PAST_LIFE_COUNTS }
    }
    return character
  })
}
