import type { JSX, ReactNode } from 'react'
import { ApiErrorNotice, WireframePlaceholder } from '../../../components'

export type StatusPlaceholderReason =
  'no-selection' | 'no-results' | 'empty-table' | 'not-found' | 'loading'

const STATUS_PLACEHOLDER_MIN_HEIGHT_PX = 140

interface EmptyStatusPlaceholderProps {
  reason: StatusPlaceholderReason
  searchQuery?: string
  missingItemId?: number | null
  category?: string
}

interface ErrorStatusPlaceholderProps {
  error: unknown
  path: string
  onRetry: () => void
  missingResourceName?: string
  additionalActions?: ReactNode
  heading?: string
}

type StatusPlaceholderProps = EmptyStatusPlaceholderProps | ErrorStatusPlaceholderProps

function placeholderMessage({
  reason,
  searchQuery,
  missingItemId,
  category,
}: EmptyStatusPlaceholderProps): { title: string; hint?: string } {
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
  }
}

export function StatusPlaceholder(props: StatusPlaceholderProps): JSX.Element {
  if ('error' in props) {
    return (
      <div className="resources-status">
        <ApiErrorNotice {...props} />
      </div>
    )
  }
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
