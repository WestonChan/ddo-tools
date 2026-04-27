import type { Character, PastLifeCategory } from '../character'

export const PAST_LIFE_ORDER: { key: PastLifeCategory; label: string }[] = [
  { key: 'heroic', label: 'heroic' },
  { key: 'epic', label: 'epic' },
  { key: 'racial', label: 'racial' },
  { key: 'iconic', label: 'iconic' },
]

export interface PastLifeTotals {
  total: number
  byCategory: Record<PastLifeCategory, number>
}

/**
 * Per-category past life count for a character — sums completed lives'
 * reincarnation events plus user-entered untracked lives. The category
 * total is what we display on the landing page.
 */
export function countPastLives(character: Character): PastLifeTotals {
  const byCategory: Record<PastLifeCategory, number> = {
    heroic: 0,
    racial: 0,
    iconic: 0,
    epic: 0,
  }
  for (const life of character.lives) {
    if (life.status === 'completed' && life.reincarnation) {
      byCategory[life.reincarnation.type]++
    }
  }
  for (const { key } of PAST_LIFE_ORDER) {
    for (const value of Object.values(character.untrackedLives[key])) {
      byCategory[key] += value
    }
  }
  const total = byCategory.heroic + byCategory.racial + byCategory.iconic + byCategory.epic
  return { total, byCategory }
}

// timeZone: 'UTC' keeps the rendered date matching the ISO input — without it,
// '2026-04-26' gets shifted to Apr 25 in negative-UTC locales.
const PATCH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Render a YYYY-MM-DD ISO date as `Apr 22, 2026` in en-US, locale-stable. */
export function formatPatchDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return PATCH_DATE_FORMATTER.format(new Date(Date.UTC(y, m - 1, d)))
}
