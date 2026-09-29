import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { Character, Life, PastLifeCounts } from '../types'
import type { BuildSelection } from '../migrations'

export interface CharacterContextValue {
  characters: Character[]
  setCharacters: Dispatch<SetStateAction<Character[]>>
  selectedCharacter: Character
  currentLife: Life
  lifeNumbersByLifeId: Map<string, number>
  currentLifeNumber: number
  viewedBuild: Life
  buildSelection: BuildSelection
  setBuildSelection: Dispatch<SetStateAction<BuildSelection>>
  plannedBuilds: Life[]
  setPlannedBuilds: Dispatch<SetStateAction<Life[]>>
  viewedPlannedBuild: Life | undefined
  selectCharacter: (characterId: string) => void
  selectBuild: (buildId: string) => void
  setUntrackedStackCount: (category: keyof PastLifeCounts, pastLifeId: string, stackCount: number) => void
  setDesiredStackCount: (category: keyof PastLifeCounts, pastLifeId: string, stackCount: number) => void
}

export const CharacterContext = createContext<CharacterContextValue | null>(null)
