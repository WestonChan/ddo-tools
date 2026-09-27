import type { Character, PastLifeCategory } from '../character'
import type { PatchNote } from './data/sitePatchNotes'

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

const PATCH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatPatchDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return PATCH_DATE_FORMATTER.format(new Date(Date.UTC(y, m - 1, d)))
}

export function latestPatchNoteDate(notes: readonly PatchNote[]): string {
  return notes.reduce((latest, note) => (note.date > latest ? note.date : latest), '')
}
