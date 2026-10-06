import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
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
import { useResourceListSession } from './resourceListSessions'

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
  const categoryPanelId = useId()
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const pickerRef = useRef<HTMLElement | null>(null)
  const detailPaneRef = useRef<HTMLElement | null>(null)
  const lastSelectedItemId = useRef<number | null>(null)
  const wasOpenedFromList = useRef(false)
  const { filters } = useResourceListSession('items')
  const [itemToFocus, setItemToFocus] = useState<number | null>(null)
  const [rowToFocusId, setRowToFocusId] = useState<number | null>(null)
  const [isSingleColumn, setIsSingleColumn] = useState(true)
  const [listSelectionCount, setListSelectionCount] = useState(0)

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

  function closeFocusedDetailOnEscape(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Escape' || event.defaultPrevented || selectedResourceId === null) return
    const focusedElement = event.target
    if (
      focusedElement instanceof HTMLElement &&
      (focusedElement.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(focusedElement.tagName))
    )
      return
    event.preventDefault()
    event.stopPropagation()
    closeDetail()
  }

  useEffect(() => {
    if (
      rowToFocusId !== null &&
      selectedResourceId === null &&
      document.activeElement === document.body
    )
      pickerRef.current?.focus()
  }, [rowToFocusId, selectedResourceId])

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

  function selectItemFromList(id: number): void {
    const isReplacingSelectedItem = selectedResourceId !== null
    if (!isReplacingSelectedItem) wasOpenedFromList.current = true
    setListSelectionCount((count) => count + 1)
    navigate({
      to: `/resources/items/${id}`,
      ...(isReplacingSelectedItem ? { replace: true } : {}),
    })
  }

  function openItemFromHover(id: number): void {
    setItemToFocus(id)
    selectItemFromList(id)
  }

  function openItemFromList(id: number, activationSource: 'pointer' | 'keyboard'): void {
    if (activationSource === 'keyboard' && isSingleColumn) setItemToFocus(id)
    selectItemFromList(id)
  }

  return (
    <div className="resources-view">
      <header className="resources-header">
        <CategoryTabs
          activeCategory={category}
          onSelect={navigateToCategory}
          panelId={categoryPanelId}
        />
      </header>
      <div
        className="resources-body"
        id={categoryPanelId}
        role="tabpanel"
        aria-labelledby={`${categoryPanelId}-${category}-tab`}
        ref={bodyRef}
        style={
          { '--resources-column-min-width': `${RESOURCE_COLUMN_MINIMUM_PX}px` } as CSSProperties
        }
      >
        {(!isSingleColumn || selectedResourceId === null || category !== 'items') && (
          <aside className="resources-picker" ref={pickerRef} tabIndex={-1}>
            {category === 'items' ? (
              <ItemPicker
                category={category}
                selectedItemId={selectedResourceId}
                searchInputRef={searchInputRef}
                onOpenItemFromHover={openItemFromHover}
                onOpenItem={openItemFromList}
                rowToFocusId={rowToFocusId}
                onRowFocused={() => setRowToFocusId(null)}
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
            data-detail-pane=""
            onKeyDown={closeFocusedDetailOnEscape}
          >
            <ResourceDetailPane
              key={listSelectionCount}
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
