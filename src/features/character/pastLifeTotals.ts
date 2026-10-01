import type { Character, PastLifeCategory } from './types'

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
  for (const category of Object.keys(countByCategory) as PastLifeCategory[]) {
    for (const untrackedLifeCount of Object.values(character.untrackedLives[category])) {
      countByCategory[category] += untrackedLifeCount
    }
  }
  const totalCount =
    countByCategory.heroic + countByCategory.racial + countByCategory.iconic + countByCategory.epic
  return { totalCount, countByCategory }
}
