import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CategoryTabs } from './components/CategoryTabs'
import { ItemPicker, type ItemPickerSession } from './components/ItemPicker'
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
const RESOURCE_COLUMN_MINIMUM_PX = 480

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
  const [pickerSession, setPickerSession] = useState<ItemPickerSession>({
    searchQuery: '',
    selectedSort: null,
    includesSetBonuses: false,
    hasResolvedFirstPage: false,
    scrollTop: 0,
  })
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const detailPaneRef = useRef<HTMLElement | null>(null)
  const lastSelectedItemId = useRef<number | null>(null)
  const wasOpenedFromList = useRef(false)
  const [filters, setFilters] = useState<ItemListFilters>(EMPTY_ITEM_FILTERS)
  const [itemToFocus, setItemToFocus] = useState<number | null>(null)
  const [rowToFocusId, setRowToFocusId] = useState<number | null>(null)
  const [isSingleColumn, setIsSingleColumn] = useState(true)

  const rememberPickerSession = useCallback((change: Partial<ItemPickerSession>): void => {
    setPickerSession((previous) => ({ ...previous, ...change }))
  }, [])

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const measure = (observedContentWidth?: number): void => {
      const style = getComputedStyle(body)
      const columnGap = Number.parseFloat(style.columnGap) || 0
      const horizontalPadding =
        (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
      const contentWidth =
        observedContentWidth ?? (body.clientWidth || window.innerWidth) - horizontalPadding
      setIsSingleColumn(contentWidth < RESOURCE_COLUMN_MINIMUM_PX * 2 + columnGap)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width !== undefined) measure(width)
    })
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

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
      setRowToFocusId(previousItemId)
      lastSelectedItemId.current = null
    }
    wasOpenedFromList.current = false
  }, [selectedResourceId])

  const scrollRenderedDetailIntoView = useCallback((): void => {
    const pane = detailPaneRef.current
    const picker = pane?.previousElementSibling as HTMLElement | null
    if (pane && picker && pane.offsetTop > picker.offsetTop) {
      pane.scrollIntoView({ block: 'start' })
    }
  }, [])

  const closeDetail = useCallback((): void => {
    if (isSingleColumn && wasOpenedFromList.current) {
      window.history.back()
      return
    }
    navigate({ to: `/resources/${category}`, replace: true })
  }, [navigate, category, isSingleColumn])

  useEffect(() => {
    function focusSearchOnSlash(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const isTypingInTextField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      const isListVisible = selectedResourceId === null || !isSingleColumn
      if (e.key === '/' && !isTypingInTextField && isListVisible && searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current.focus()
      }
    }
    document.addEventListener('keydown', focusSearchOnSlash)
    return () => {
      document.removeEventListener('keydown', focusSearchOnSlash)
    }
  }, [selectedResourceId, isSingleColumn])

  const resourceInUrl = selectedResourceId !== null ? { category, id: selectedResourceId } : null

  function openItemFromHover(id: number): void {
    if (selectedResourceId === null) wasOpenedFromList.current = true
    setItemToFocus(id)
    navigate({ to: `/resources/items/${id}` })
  }

  function openItemFromList(id: number, activationSource: 'pointer' | 'keyboard'): void {
    wasOpenedFromList.current = true
    if (activationSource === 'keyboard' && isSingleColumn) setItemToFocus(id)
    navigate({ to: `/resources/items/${id}` })
  }

  return (
    <div className="resources-view">
      <header className="resources-header">
        <CategoryTabs activeCategory={category} onSelect={navigateToCategory} />
      </header>
      <div
        className="resources-body"
        ref={bodyRef}
        style={
          { '--resources-column-min-width': `${RESOURCE_COLUMN_MINIMUM_PX}px` } as CSSProperties
        }
      >
        {(!isSingleColumn || selectedResourceId === null || category !== 'items') && (
          <aside className="resources-picker">
            {category === 'items' ? (
              <ItemPicker
                category={category}
                selectedItemId={selectedResourceId}
                searchInputRef={searchInputRef}
                filters={filters}
                onFiltersChange={setFilters}
                onOpenItemFromHover={openItemFromHover}
                onOpenItem={openItemFromList}
                rowToFocusId={rowToFocusId}
                onRowFocused={() => setRowToFocusId(null)}
                session={pickerSession}
                onSessionChange={rememberPickerSession}
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
        )}
        {category === 'items' && (!isSingleColumn || selectedResourceId !== null) && (
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
              onCloseDetail={closeDetail}
            />
          </section>
        )}
      </div>
    </div>
  )
}

export default ResourcesView
