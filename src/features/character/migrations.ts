import type { Character } from './types'
import { EMPTY_UNTRACKED } from './utils'
import { STUB_CHARACTERS } from './data/stubCharacters'

export interface Selection {
  characterId: string
  buildId: string // life ID or planned build ID — resolved by lookup
}

const defaultStub = STUB_CHARACTERS[0]
export const defaultSelection: Selection = {
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

/** Migrate old localStorage shape: pastLifeOverrides -> untrackedLives */
export function migrateCharacters(value: unknown): Character[] {
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
