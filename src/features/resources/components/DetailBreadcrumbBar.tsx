import type { JSX } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { HintAnchor } from '../../../components'
import { useDetailNavigation } from '../contexts/DetailNavigationContext'
import { LABEL_BY_RESOURCE_CATEGORY } from '../resourceCategories'
import type { ResourceReference } from '../hooks/useDetailStack'

interface DetailBreadcrumbBarProps {
  detailStack: ResourceReference[]
  onBackOneLevel: () => void
  onJumpToCrumb: (index: number) => void
}

function crumbLabel(entry: ResourceReference): string {
  return entry.name ?? `${entry.category} #${entry.id}`
}

export function DetailBreadcrumbBar({
  detailStack,
  onBackOneLevel,
  onJumpToCrumb,
}: DetailBreadcrumbBarProps): JSX.Element {
  const { closeDetail, pickerCategory } = useDetailNavigation()
  const stackDepth = detailStack.length
  const canGoBackOneLevel = stackDepth > 1
  const lastEntryIndex = stackDepth - 1
  const backToCategoryLabel = `Back to ${LABEL_BY_RESOURCE_CATEGORY[pickerCategory].toLowerCase()}`

  return (
    <div className="resources-detail-bar">
      <div className="resources-detail-bar-nav">
        {canGoBackOneLevel && (
          <HintAnchor text="Back one level">
            <button
              type="button"
              className="resources-detail-bar-back hoverable"
              onClick={onBackOneLevel}
              aria-label="Back one level"
            >
              <ArrowLeft size={14} />
            </button>
          </HintAnchor>
        )}
        <nav className="resources-detail-breadcrumb" aria-label="Detail breadcrumb">
          <span className="resources-detail-breadcrumb-link-wrap">
            <button
              type="button"
              className="resources-detail-breadcrumb-link resources-detail-breadcrumb-back"
              onClick={closeDetail}
              aria-label={backToCategoryLabel}
            >
              <ArrowLeft size={12} aria-hidden />
              {backToCategoryLabel}
            </button>
          </span>
          {detailStack.map((entry, index) => {
            const isLast = index === lastEntryIndex
            const separator = (
              <ChevronRight size={12} className="resources-detail-breadcrumb-sep" aria-hidden />
            )
            if (isLast) {
              return (
                <span
                  key={`${entry.category}-${entry.id}`}
                  className="resources-detail-breadcrumb-current"
                >
                  {separator}
                  <span>{crumbLabel(entry)}</span>
                </span>
              )
            }
            return (
              <span
                key={`${entry.category}-${entry.id}-${index}`}
                className="resources-detail-breadcrumb-link-wrap"
              >
                {separator}
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
