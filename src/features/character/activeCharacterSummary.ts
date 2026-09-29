import type { CharacterContextValue } from './contexts/characterContext'
import { ORDERED_PAST_LIFE_CATEGORIES, pastLifeTotalsOf } from './pastLifeTotals'
import type { PastLifeCategory } from './types'
import { classSplitLabel, raceLabelOf } from './utils'

export interface ActiveCharacterSummary {
  characterName: string
  buildName: string
  buildSubtitle: string
  classLabel: string
  pastLifeTotalCount: number
  pastLifeCategoryCounts: { category: PastLifeCategory; label: string; count: number }[]
  plannedBuildCount: number
}

export function activeCharacterSummaryOf({
  characters,
  selectedCharacter,
  viewedBuild,
  currentLifeNumber,
  plannedBuilds,
}: Pick<
  CharacterContextValue,
  'characters' | 'selectedCharacter' | 'viewedBuild' | 'currentLifeNumber' | 'plannedBuilds'
>): ActiveCharacterSummary | null {
  if (characters.length === 0) return null
  const serverLabel = selectedCharacter.server ? `${selectedCharacter.server} server` : ''
  const pastLifeTotals = pastLifeTotalsOf(selectedCharacter)
  return {
    characterName: selectedCharacter.name,
    buildName: viewedBuild?.name?.trim() ?? '',
    buildSubtitle: [viewedBuild ? raceLabelOf(viewedBuild.race) : '', `Life ${currentLifeNumber}`, serverLabel]
      .filter(Boolean)
      .join(' · '),
    classLabel: viewedBuild ? classSplitLabel(viewedBuild) : '',
    pastLifeTotalCount: pastLifeTotals.totalCount,
    pastLifeCategoryCounts: ORDERED_PAST_LIFE_CATEGORIES.map(({ category, label }) => ({
      category,
      label,
      count: pastLifeTotals.countByCategory[category],
    })).filter(({ count }) => count > 0),
    plannedBuildCount: plannedBuilds.length,
  }
}
