import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CategoryTabs } from './components/CategoryTabs'
import { ItemPicker } from './components/ItemPicker'
import { ResourceDetailPane } from './components/ResourceDetailPane'
import { WireframePlaceholder } from '../../components'
import {
  LABEL_BY_RESOURCE_CATEGORY,
  isResourceCategory,
  type ResourceCategory,
} from './resourceCategories'
import './ResourcesView.css'
import { EMPTY_ITEM_FILTERS, type ItemListFilters } from './queries/items'

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
  const detailPaneRef = useRef<HTMLElement | null>(null)
  const lastSelectedItemId = useRef<number | null>(null)
  const [filters, setFilters] = useState<ItemListFilters>(EMPTY_ITEM_FILTERS)
  const [itemToFocus, setItemToFocus] = useState<number | null>(null)

  function navigateToCategory(nextCategory: ResourceCategory): void {
    navigate({ to: `/resources/${nextCategory}` })
  }

  useEffect(() => {
    if (selectedResourceId !== null) {
      lastSelectedItemId.current = selectedResourceId
      return
    }
    const previousItemId = lastSelectedItemId.current
    if (previousItemId !== null) {
      document.querySelector<HTMLElement>(`[data-row-key="${previousItemId}"]`)?.focus()
      lastSelectedItemId.current = null
    }
  }, [selectedResourceId])

  const scrollRenderedDetailIntoView = useCallback((): void => {
    const pane = detailPaneRef.current
    const picker = pane?.previousElementSibling as HTMLElement | null
    if (pane && picker && pane.offsetTop > picker.offsetTop) {
      pane.scrollIntoView({ block: 'start' })
    }
  }, [])

  const closeDetail = useCallback((): void => {
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

  useEffect(() => {
    if (selectedResourceId === null) return
    function closeDetailOnEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      closeDetail()
    }
    document.addEventListener('keydown', closeDetailOnEscape)
    return () => document.removeEventListener('keydown', closeDetailOnEscape)
  }, [selectedResourceId, closeDetail])

  const resourceInUrl = selectedResourceId !== null ? { category, id: selectedResourceId } : null

  function openItemFromHover(id: number): void {
    setItemToFocus(id)
    navigate({ to: `/resources/items/${id}` })
  }

  return (
    <div className="resources-view">
      <header className="resources-header">
        <CategoryTabs activeCategory={category} onSelect={navigateToCategory} />
      </header>
      <div className="resources-body">
        <aside className="resources-picker">
          {category === 'items' ? (
            <ItemPicker
              category={category}
              selectedItemId={selectedResourceId}
              searchInputRef={searchInputRef}
              filters={filters}
              onFiltersChange={setFilters}
              onOpenItemFromHover={openItemFromHover}
            />
          ) : (
            <div className="resources-picker-inner">
              <WireframePlaceholder
                label={`${LABEL_BY_RESOURCE_CATEGORY[category]} coming soon`}
                minHeightPx={COMING_SOON_PLACEHOLDER_MIN_HEIGHT_PX}
              />
            </div>
          )}
        </aside>
        {category === 'items' && (
          <section
            className={`resources-detail-pane${selectedResourceId === null ? ' resources-detail-pane--empty' : ''}`}
            ref={detailPaneRef}
            aria-label="Item details"
          >
            <ResourceDetailPane
              resourceInUrl={resourceInUrl}
              pickerCategory={category}
              matchingEnchantments={filters.enchantments}
              focusItemId={itemToFocus}
              onFocusItem={() => setItemToFocus(null)}
              onDetailRendered={scrollRenderedDetailIntoView}
            />
          </section>
        )}
      </div>
    </div>
  )
}

export default ResourcesView
