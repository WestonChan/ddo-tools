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
  plannedBuilds: Life[]
  setPlannedBuilds: Dispatch<SetStateAction<Life[]>>
  viewedPlannedBuild: Life | undefined
  comparisonBuild: Life | null
  viewBuild: (characterId: string | null, buildId: string) => void
  setComparisonBuildId: (buildId: string | null) => void
  swapViewedAndComparedBuilds: () => void
  deletePlannedBuild: (buildId: string) => void
  setUntrackedStackCount: (
    category: keyof PastLifeCounts,
    pastLifeId: string,
    stackCount: number,
  ) => void
  setDesiredStackCount: (
    category: keyof PastLifeCounts,
    pastLifeId: string,
    stackCount: number,
  ) => void
}

export const CharacterContext = createContext<CharacterContextValue | null>(null)
