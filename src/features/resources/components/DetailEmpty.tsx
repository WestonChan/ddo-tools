import type { JSX } from 'react'

// Discriminated empty-state kinds. Each maps to a copy table below so that
// adding a new state forces a corresponding copy entry — a future
// `partial-detail` or `loading` kind would surface as a TS error here first.
export type DetailEmptyKind =
  | 'no-selection'
  | 'no-results'
  | 'empty-table'
  | 'not-found'

interface DetailEmptyProps {
  kind: DetailEmptyKind
  // Optional context strings used by some kinds (search query, missing id).
  query?: string
  id?: number | null
  category?: string
}

function getCopy({ kind, query, id, category }: DetailEmptyProps): { title: string; hint?: string } {
  switch (kind) {
    case 'no-selection':
      return { title: 'Select an item to view details.' }
    case 'no-results':
      return {
        title: query ? `No matches for "${query}".` : 'No matches.',
        hint: 'Try a shorter or different search term.',
      }
    case 'empty-table':
      return { title: `No ${category ?? 'rows'} in database.` }
    case 'not-found':
      return {
        title: id !== null && id !== undefined ? `No item with id ${id}.` : 'Not found.',
        hint: 'Pick another row from the list.',
      }
  }
}

export function DetailEmpty(props: DetailEmptyProps): JSX.Element {
  const { title, hint } = getCopy(props)
  return (
    <div className="resources-detail-empty section-placeholder">
      <p>{title}</p>
      {hint && <p className="resources-detail-empty-hint">{hint}</p>}
    </div>
  )
}
