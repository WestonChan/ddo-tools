import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { Character, Life, PastLifeCounts } from './types'
import type { Selection } from './migrations'

export interface CharacterContextValue {
  characters: Character[]
  setCharacters: Dispatch<SetStateAction<Character[]>>
  character: Character
  currentLife: Life
  lifeNumbers: Map<string, number>
  lifeNumber: number
  activeBuild: Life
  selection: Selection
  setSelection: Dispatch<SetStateAction<Selection>>
  plannedBuilds: Life[]
  setPlannedBuilds: Dispatch<SetStateAction<Life[]>>
  viewingPlannedBuild: Life | undefined
  selectCharacter: (charId: string) => void
  selectBuild: (buildId: string) => void
  setOverride: (category: keyof PastLifeCounts, id: string, value: number) => void
  setBuildDesired: (category: keyof PastLifeCounts, id: string, value: number) => void
}

export const CharacterContext = createContext<CharacterContextValue | null>(null)
