import { useCallback, useEffect, useRef, type JSX } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CategoryTabs } from './components/CategoryTabs'
import { ItemPicker } from './components/ItemPicker'
import { ResourceDetailDrawer } from './components/ResourceDetailDrawer'
import { ApiGate, Modal, WireframePlaceholder } from '../../components'
import { useItemSummaries } from './queries/useItems'
import {
  DETAIL_DRAWER_TITLE_ID,
  LABEL_BY_RESOURCE_CATEGORY,
  isResourceCategory,
  type ResourceCategory,
} from './resourceCategories'
import './ResourcesView.css'

const COMING_SOON_PLACEHOLDER_MIN_HEIGHT_PX = 420

function useResourceRouteParams(): {
  category: ResourceCategory
  selectedResourceId: number | null
} {
  const params = useParams({ strict: false })
  const category: ResourceCategory =
    params.category && isResourceCategory(params.category) ? params.category : 'items'
  const parsed = params.id !== undefined ? Number(params.id) : NaN
  const selectedResourceId = Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  return { category, selectedResourceId }
}

function ResourcesView(): JSX.Element {
  const { category, selectedResourceId } = useResourceRouteParams()
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const itemSummariesQuery = useItemSummaries(category === 'items')

  function navigateToCategory(nextCategory: ResourceCategory): void {
    navigate({ to: `/resources/${nextCategory}` })
  }

  const closeDrawer = useCallback((): void => {
    navigate({ to: `/resources/${category}`, replace: true })
  }, [navigate, category])

  useEffect(() => {
    function focusSearchOnSlash(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const isTypingInTextField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (e.key === '/' && !isTypingInTextField && selectedResourceId === null) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', focusSearchOnSlash)
    return () => {
      document.removeEventListener('keydown', focusSearchOnSlash)
    }
  }, [selectedResourceId])

  const resourceInUrl = selectedResourceId !== null ? { category, id: selectedResourceId } : null

  return (
    <div className="resources-view">
      <header className="resources-header">
        <CategoryTabs activeCategory={category} onSelect={navigateToCategory} />
      </header>
      <div
        className={`resources-body${selectedResourceId !== null ? ' resources-body--inspect' : ''}`}
      >
        <aside
          className="resources-picker"
          aria-hidden={selectedResourceId !== null || undefined}
          inert={selectedResourceId !== null || undefined}
        >
          {category === 'items' ? (
            <ApiGate
              isPending={itemSummariesQuery.isPending}
              error={itemSummariesQuery.error}
              onRetry={() => void itemSummariesQuery.refetch()}
            >
              <ItemPicker
                category={category}
                items={itemSummariesQuery.data ?? []}
                selectedItemId={selectedResourceId}
                searchInputRef={searchInputRef}
              />
            </ApiGate>
          ) : (
            <div className="resources-picker-inner">
              <WireframePlaceholder
                label={`${LABEL_BY_RESOURCE_CATEGORY[category]} coming soon`}
                minHeightPx={COMING_SOON_PLACEHOLDER_MIN_HEIGHT_PX}
              />
            </div>
          )}
        </aside>
        {selectedResourceId !== null && (
          <Modal
            variant="drawer-right"
            onClose={closeDrawer}
            labelledBy={DETAIL_DRAWER_TITLE_ID}
            label="Item details"
            backdropLabel="Close item details"
          >
            <ResourceDetailDrawer resourceInUrl={resourceInUrl} pickerCategory={category} />
          </Modal>
        )}
      </div>
    </div>
  )
}

export default ResourcesView
