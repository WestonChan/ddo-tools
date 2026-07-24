import type { JSX } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { TooltipWrapper } from '../../../components'
import { useDetailNav } from '../contexts/DetailNavContext'
import { CATEGORY_LABELS } from '../types'
import type { StackEntry } from '../hooks/useDetailStack'

interface DetailBarProps {
  stack: StackEntry[]
  /** popDetail — back one level (or close at depth 1). */
  onBack: () => void
  /** jumpToCrumb — truncate the stack to that index. */
  onJumpToCrumb: (index: number) => void
}

function crumbLabel(entry: StackEntry): string {
  return entry.name ?? `${entry.category} #${entry.id}`
}

/**
 * Top bar of the detail popover. The breadcrumb leads with a "Back to
 * <category>" crumb (the close-all action) followed by one entry per
 * stacked detail. The depth-1 case still surfaces both: "Back to items >
 * Alpha", so the user can always exit to the picker. A separate one-step
 * back-arrow appears at depth 2+ for popping a single layer. The
 * copy-link and wiki icons live next to the item name in EntityHeader.
 */
export function DetailBar({ stack, onBack, onJumpToCrumb }: DetailBarProps): JSX.Element {
  const { closeDrawer, baseCategory } = useDetailNav()
  const depth = stack.length
  const showBack = depth > 1
  const lastIndex = depth - 1
  const backLabel = `Back to ${CATEGORY_LABELS[baseCategory].toLowerCase()}`

  return (
    <div className="resources-detail-bar">
      <div className="resources-detail-bar-nav">
        {showBack && (
          <TooltipWrapper text="Back one level">
            <button
              type="button"
              className="resources-detail-bar-back hoverable"
              onClick={onBack}
              aria-label="Back one level"
            >
              <ArrowLeft size={14} />
            </button>
          </TooltipWrapper>
        )}
        <nav className="resources-detail-breadcrumb" aria-label="Detail breadcrumb">
          <span className="resources-detail-breadcrumb-link-wrap">
            <button
              type="button"
              className="resources-detail-breadcrumb-link resources-detail-breadcrumb-back"
              onClick={closeDrawer}
              aria-label={backLabel}
            >
              <ArrowLeft size={12} aria-hidden />
              {backLabel}
            </button>
          </span>
          {stack.map((entry, index) => {
            const isLast = index === lastIndex
            const sep = (
              <ChevronRight
                size={12}
                className="resources-detail-breadcrumb-sep"
                aria-hidden
              />
            )
            if (isLast) {
              return (
                <span
                  key={`${entry.category}-${entry.id}`}
                  className="resources-detail-breadcrumb-current"
                >
                  {sep}
                  <span>{crumbLabel(entry)}</span>
                </span>
              )
            }
            return (
              <span
                key={`${entry.category}-${entry.id}-${index}`}
                className="resources-detail-breadcrumb-link-wrap"
              >
                {sep}
                <button
                  type="button"
                  className="resources-detail-breadcrumb-link"
                  onClick={() => onJumpToCrumb(index)}
                >
                  {crumbLabel(entry)}
                </button>
              </span>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
