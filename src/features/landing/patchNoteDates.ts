import type { PatchNote } from './data/sitePatchNotes'

const PATCH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formattedPatchDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return PATCH_DATE_FORMATTER.format(new Date(Date.UTC(y, m - 1, d)))
}

export function latestPatchNoteDate(notes: readonly PatchNote[]): string {
  return notes.reduce((latest, note) => (note.date > latest ? note.date : latest), '')
}
