import type { JSX } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { TooltipWrapper } from '../../../components'
import { useDetailNav } from '../contexts/DetailNavContext'
import { CATEGORY_LABELS } from '../types'
import type { StackEntry } from '../hooks/useDetailStack'

interface DetailBarProps {
  stack: StackEntry[]
  onBack: () => void
  onJumpToCrumb: (index: number) => void
}

function crumbLabel(entry: StackEntry): string {
  return entry.name ?? `${entry.category} #${entry.id}`
}

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
