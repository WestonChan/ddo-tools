import type { JSX } from 'react'
import { WireframePlaceholder } from '../../../components'

export type StatusPlaceholderReason =
  | 'no-selection'
  | 'no-results'
  | 'empty-table'
  | 'not-found'
  | 'loading'
  | 'error'
  | 'filter-error'
  | 'sort-error'

const STATUS_PLACEHOLDER_MIN_HEIGHT_PX = 140

interface StatusPlaceholderProps {
  reason: StatusPlaceholderReason
  searchQuery?: string
  missingItemId?: number | null
  category?: string
}

function placeholderMessage({
  reason,
  searchQuery,
  missingItemId,
  category,
}: StatusPlaceholderProps): { title: string; hint?: string } {
  switch (reason) {
    case 'no-selection':
      return { title: 'Select an item' }
    case 'no-results':
      return {
        title: searchQuery ? `No matches for "${searchQuery}".` : 'No matches.',
        hint: 'Try a shorter or different search term.',
      }
    case 'empty-table':
      return { title: `No ${category ?? 'rows'} in database.` }
    case 'not-found':
      return {
        title:
          missingItemId !== null && missingItemId !== undefined
            ? `No item with id ${missingItemId}.`
            : 'Not found.',
        hint: 'Pick another row from the list.',
      }
    case 'loading':
      return { title: 'Loading\u2026' }
    case 'error':
      return {
        title: 'Could not load this item.',
        hint: 'Check your connection and pick the row again.',
      }
    case 'filter-error':
      return { title: 'Could not load filters.', hint: 'Check your connection, then try again.' }
    case 'sort-error':
      return { title: 'Could not load sorted items.', hint: 'Reset the sort or try again.' }
  }
}

export function StatusPlaceholder(props: StatusPlaceholderProps): JSX.Element {
  const { title, hint } = placeholderMessage(props)
  return (
    <div className="resources-status" role="status">
      <WireframePlaceholder
        label={title}
        hint={hint}
        minHeightPx={STATUS_PLACEHOLDER_MIN_HEIGHT_PX}
      />
    </div>
  )
}
