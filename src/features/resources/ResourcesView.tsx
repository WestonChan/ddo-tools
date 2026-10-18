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
import {
  resourcePath,
  resourceCategoryPath,
  isResourceCategory,
  type ResourceCategory,
} from '../../lib/resourcePaths'
import { slugFromPathSegment, type Slug } from '../../lib/api'
import { CategoryTabs } from './components/CategoryTabs'
import { ItemPicker } from './components/ItemPicker'
import { ResourceDetailPane } from './components/ResourceDetailPane'
import { WireframePlaceholder } from '../../components'
import { LABEL_BY_RESOURCE_CATEGORY } from './resourceCategories'
import './ResourcesView.css'
import { useResourceListSession } from './resourceListSessions'
import { isTypingTarget } from '../../lib/isTypingTarget'

const COMING_SOON_PLACEHOLDER_MIN_HEIGHT_PX = 420
const RESOURCE_COLUMN_MINIMUM_PX = 480

function useResourceRouteParams(): {
  category: ResourceCategory
  selectedResourceSlug: Slug | null
  invalidSegment: string | null
} {
  const params = useParams({ strict: false })
  const category: ResourceCategory =
    params.category && isResourceCategory(params.category) ? params.category : 'items'
  const selectedResourceSlug = params.slug === undefined ? null : slugFromPathSegment(params.slug)
  return {
    category,
    selectedResourceSlug,
    invalidSegment: params.slug !== undefined && selectedResourceSlug === null ? params.slug : null,
  }
}

function ResourcesView(): JSX.Element {
  const { category, selectedResourceSlug, invalidSegment } = useResourceRouteParams()
  const hasDetailLink = selectedResourceSlug !== null || invalidSegment !== null
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const categoryPanelId = useId()
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const pickerRef = useRef<HTMLElement | null>(null)
  const detailPaneRef = useRef<HTMLElement | null>(null)
  const lastSelectedItemSlug = useRef<Slug | null>(null)
  const wasOpenedFromList = useRef(false)
  const { filters } = useResourceListSession('items')
  const [itemToFocus, setItemToFocus] = useState<Slug | null>(null)
  const [rowToFocusSlug, setRowToFocusSlug] = useState<Slug | null>(null)
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
    navigate({ to: resourceCategoryPath(nextCategory) })
  }

  useEffect(() => {
    if (selectedResourceSlug !== null) {
      lastSelectedItemSlug.current = selectedResourceSlug
      return
    }
    const previousItemSlug = lastSelectedItemSlug.current
    if (previousItemSlug !== null) {
      setRowToFocusSlug(previousItemSlug)
      lastSelectedItemSlug.current = null
    }
    wasOpenedFromList.current = false
  }, [selectedResourceSlug])

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
    navigate({ to: resourceCategoryPath(category), replace: true })
  }, [navigate, category, isSingleColumn])

  function closeFocusedDetailOnEscape(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Escape' || event.defaultPrevented || !hasDetailLink) return
    if (isTypingTarget(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    closeDetail()
  }

  useEffect(() => {
    if (
      rowToFocusSlug !== null &&
      selectedResourceSlug === null &&
      document.activeElement === document.body
    )
      pickerRef.current?.focus()
  }, [rowToFocusSlug, selectedResourceSlug])

  useEffect(() => {
    function focusSearchOnSlash(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const isTypingInTextField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      const isListVisible = selectedResourceSlug === null || !isSingleColumn
      if (e.key === '/' && !isTypingInTextField && isListVisible && searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current.focus()
      }
    }
    document.addEventListener('keydown', focusSearchOnSlash)
    return () => {
      document.removeEventListener('keydown', focusSearchOnSlash)
    }
  }, [selectedResourceSlug, isSingleColumn])

  const resourceInUrl =
    selectedResourceSlug !== null ? { category, slug: selectedResourceSlug } : null

  function selectItemFromList(slug: Slug): void {
    const isReplacingSelectedItem = hasDetailLink
    if (!isReplacingSelectedItem) wasOpenedFromList.current = true
    setItemToFocus(slug)
    setListSelectionCount((count) => count + 1)
    navigate({
      to: resourcePath('items', slug),
      ...(isReplacingSelectedItem ? { replace: true } : {}),
    })
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
        {(!isSingleColumn || !hasDetailLink || category !== 'items') && (
          <aside className="resources-picker" ref={pickerRef} tabIndex={-1}>
            {category === 'items' ? (
              <ItemPicker
                category={category}
                selectedItemSlug={selectedResourceSlug}
                searchInputRef={searchInputRef}
                onOpenItemFromHover={selectItemFromList}
                onOpenItem={selectItemFromList}
                rowToFocusSlug={rowToFocusSlug}
                onRowFocused={() => setRowToFocusSlug(null)}
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
        {category === 'items' && (!isSingleColumn || hasDetailLink) && (
          <section
            className={`resources-detail-pane${!hasDetailLink ? ' resources-detail-pane--empty' : ''}`}
            ref={detailPaneRef}
            aria-label="Item details"
            data-detail-pane=""
            onKeyDown={closeFocusedDetailOnEscape}
          >
            <ResourceDetailPane
              invalidLinkSegment={invalidSegment}
              key={listSelectionCount}
              resourceInUrl={resourceInUrl}
              pickerCategory={category}
              matchingBonuses={filters.bonuses}
              focusItemSlug={itemToFocus}
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
