import type { CharacterContextValue } from './contexts/characterContext'
import { pastLifeTotalsOf } from './pastLifeTotals'
import { classSplitLabel, raceLabelOf } from './utils'

export interface ActiveCharacterSummary {
  characterName: string
  classLabel: string
  raceLabel: string
  pastLifeTotalCount: number
}

export function activeCharacterSummaryOf({
  characters,
  selectedCharacter,
  viewedBuild,
}: Pick<
  CharacterContextValue,
  'characters' | 'selectedCharacter' | 'viewedBuild'
>): ActiveCharacterSummary | null {
  if (characters.length === 0) return null
  return {
    characterName: selectedCharacter.name,
    classLabel: viewedBuild ? classSplitLabel(viewedBuild) : '',
    raceLabel: viewedBuild ? raceLabelOf(viewedBuild.race) : '',
    pastLifeTotalCount: pastLifeTotalsOf(selectedCharacter).totalCount,
  }
}
