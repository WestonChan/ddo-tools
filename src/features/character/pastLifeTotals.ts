import type { Character, PastLifeCategory } from './types'

export const ORDERED_PAST_LIFE_CATEGORIES: { category: PastLifeCategory; label: string }[] = [
  { category: 'heroic', label: 'heroic' },
  { category: 'epic', label: 'epic' },
  { category: 'racial', label: 'racial' },
  { category: 'iconic', label: 'iconic' },
]

export interface PastLifeTotals {
  totalCount: number
  countByCategory: Record<PastLifeCategory, number>
}

export function pastLifeTotalsOf(character: Character): PastLifeTotals {
  const countByCategory: Record<PastLifeCategory, number> = {
    heroic: 0,
    racial: 0,
    iconic: 0,
    epic: 0,
  }
  for (const life of character.lives) {
    if (life.status === 'completed' && life.reincarnation) {
      countByCategory[life.reincarnation.type]++
    }
  }
  for (const { category } of ORDERED_PAST_LIFE_CATEGORIES) {
    for (const untrackedLifeCount of Object.values(character.untrackedLives[category])) {
      countByCategory[category] += untrackedLifeCount
    }
  }
  const totalCount =
    countByCategory.heroic + countByCategory.racial + countByCategory.iconic + countByCategory.epic
  return { totalCount, countByCategory }
}
