import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type RefObject,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import { resourcePath } from '../../../lib/resourcePaths'
import { type Slug } from '../../../lib/api'
import {
  ApiErrorNotice,
  ApiGate,
  LedgerTable,
  ROW_CARD_OPEN_DELAY_MS,
  type LedgerColumn,
  type LedgerSort,
} from '../../../components'
import { useDebouncedValue } from '../../../hooks'
import { DeclaredFilterChipRow } from '../filters/DeclaredFilterChipRow'
import { FilteredListErrorNotice } from '../filters/FilteredListErrorNotice'
import {
  RESOURCE_LIST_CONFIGURATION,
  setResourceListState,
  useResourceListColumnLayout,
  useResourceListState,
} from '../resourceListState'
import { hasAppliedFilters } from '../filters/filterModel'
import { type ItemSummary } from '../queries/items'
import {
  declaredItemFilters,
  EMPTY_ITEM_FILTERS,
  type ItemColumnKey,
  type ItemListFilters,
} from '../queries/itemList'
import {
  useItemPage,
  itemPageQueryKey,
  prefetchItemCard,
  isItemCardReady,
  isDetailQueryReady,
  effectDetailQueryOptions,
} from '../queries/useItems'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemHoverContent } from './detail/ResourceHoverCards'
import { BonusHoverCard } from './detail/BonusDetailCard'

interface ItemPickerProps {
  category: 'items'
  selectedItemSlug: Slug | null
  searchInputRef?: RefObject<HTMLInputElement | null>
  onOpenItemFromHover?: (slug: Slug, name: string) => void
  onOpenItem?: (slug: Slug) => void
  rowToFocusSlug?: Slug | null
  onRowFocused?: () => void
}
const EMPTY_ITEMS: ItemSummary[] = []

const ITEM_LIST_SCOPE = { canListWeapons: true }

const ITEM_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    isFlexible: true,
    isPrimary: true,
    minWidth: 120,
    sortValue: (item) => item.name,
    render: (item) => item.name,
  },
  {
    key: 'ml',
    label: 'ML',
    width: 44,
    minWidth: 40,
    isMonospaced: true,
    align: 'right',
    defaultSortDirection: 'desc',
    sortValue: (item) => item.minimumLevel,
    render: (item) => item.minimumLevel ?? '—',
  },
  {
    key: 'slot',
    label: 'Slot',
    width: 92,
    minWidth: 72,
    sortValue: (item) => item.equipmentSlot,
    render: (item) => item.equipmentSlot,
  },
  {
    key: 'pack',
    label: 'Pack',
    width: 168,
    minWidth: 90,
    hiddenBelowPx: 600,
    sortValue: (item) => item.pack,
    render: (item) => item.pack || '—',
  },
  {
    key: 'raid',
    label: 'Raid',
    width: 52,
    minWidth: 48,
    hiddenBelowPx: 600,
    defaultSortDirection: 'desc',
    sortValue: (item) => (item.isRaidLoot ? 1 : 0),
    render: (item) => (
      <span
        className={
          'resources-ledger-loot' + (item.isRaidLoot ? ' resources-ledger-loot--raid' : '')
        }
      >
        {item.isRaidLoot ? 'Yes' : '—'}
      </span>
    ),
  },
  {
    key: 'rare',
    label: 'Rare',
    width: 52,
    minWidth: 48,
    hiddenBelowPx: 600,
    defaultSortDirection: 'desc',
    sortValue: (item) => (item.isRareLoot ? 1 : 0),
    render: (item) => (
      <span
        className={
          'resources-ledger-loot' + (item.isRareLoot ? ' resources-ledger-loot--rare' : '')
        }
      >
        {item.isRareLoot ? 'Yes' : '—'}
      </span>
    ),
  },
] satisfies (LedgerColumn<ItemSummary> & { key: ItemColumnKey })[]

export function ItemPicker({
  category,
  selectedItemSlug,
  searchInputRef,
  onOpenItemFromHover,
  onOpenItem,
  rowToFocusSlug = null,
  onRowFocused,
}: ItemPickerProps): JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { filters, searchQuery, selectedSort, includesSetBonuses, scrollTop } =
    useResourceListState(category)
  const columnLayout = useResourceListColumnLayout(category)
  const setFilters = (filters: ItemListFilters): void => {
    setResourceListState(category, { filters })
  }
  const setSearchQuery = (searchQuery: string): void => {
    setResourceListState(category, { searchQuery })
  }
  const setSelectedSort = (selectedSort: LedgerSort | null): void => {
    setResourceListState(category, { selectedSort })
  }
  const setIncludesSetBonuses = (includesSetBonuses: boolean): void => {
    setResourceListState(category, { includesSetBonuses })
  }
  const pickerRootRef = useRef<HTMLDivElement>(null)
  const ownSearchInputRef = useRef<HTMLInputElement>(null)
  const effectiveSearchInputRef = searchInputRef ?? ownSearchInputRef
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)
  const activeSearchQuery = searchQuery ? debouncedSearchQuery : ''
  const [hasResolvedFirstPage, setHasResolvedFirstPage] = useState(false)
  const [initialScrollTop] = useState(scrollTop)
  const hasRestoredScrollRef = useRef(false)
  const lastRequestedPage = useRef<{ query: string; loadedCount: number } | null>(null)
  const resultCountId = useId()
  const effectiveSort =
    selectedSort ?? (activeSearchQuery ? null : RESOURCE_LIST_CONFIGURATION[category].initialSort)
  const itemPageQuery = useItemPage(
    filters,
    activeSearchQuery,
    includesSetBonuses,
    effectiveSort,
    ITEM_LIST_SCOPE,
  )

  useLayoutEffect(() => {
    const body = pickerRootRef.current?.querySelector<HTMLElement>('.ledger-body')
    if (!body) return
    if (!hasRestoredScrollRef.current && itemPageQuery.data && !itemPageQuery.isPlaceholderData) {
      body.scrollTop = initialScrollTop
      hasRestoredScrollRef.current = true
    }
    const rememberScroll = (): void => {
      setResourceListState(category, { scrollTop: body.scrollTop })
    }
    body.addEventListener('scroll', rememberScroll)
    return () => body.removeEventListener('scroll', rememberScroll)
  }, [category, initialScrollTop, itemPageQuery.data, itemPageQuery.isPlaceholderData])
  useEffect(() => {
    if (
      hasResolvedFirstPage ||
      (!itemPageQuery.data && !itemPageQuery.error) ||
      itemPageQuery.isPlaceholderData
    )
      return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasResolvedFirstPage(true)
  }, [
    hasResolvedFirstPage,
    itemPageQuery.data,
    itemPageQuery.error,
    itemPageQuery.isPlaceholderData,
  ])
  const itemsToShow = useMemo(
    () => itemPageQuery.data?.pages.flatMap((page) => page.items) ?? EMPTY_ITEMS,
    [itemPageQuery.data],
  )
  const resultCount = itemPageQuery.data?.pages[0]?.total ?? 0
  const declarations = useMemo(() => declaredItemFilters(ITEM_LIST_SCOPE), [])
  const hasActiveFilters = hasAppliedFilters(declarations, filters)
  function hasBonusHover(key: keyof ItemListFilters): boolean {
    return declarations.some(
      (declaration) =>
        declaration.key === key &&
        declaration.kind === 'multi' &&
        declaration.hoverKind === 'bonus',
    )
  }
  const rowAt = useCallback((index: number) => itemsToShow[index], [itemsToShow])
  const rowKey = useCallback((item: ItemSummary) => item.slug, [])
  const pageQueryKey = JSON.stringify(
    itemPageQueryKey(
      filters,
      activeSearchQuery,
      includesSetBonuses,
      effectiveSort,
      ITEM_LIST_SCOPE,
    ),
  )
  const fetchNextPageNearEnd = useCallback(() => {
    if (
      itemPageQuery.hasNextPage &&
      !itemPageQuery.isFetchingNextPage &&
      !itemPageQuery.isPlaceholderData &&
      !itemPageQuery.isFetchNextPageError
    ) {
      if (
        lastRequestedPage.current?.query === pageQueryKey &&
        lastRequestedPage.current.loadedCount === itemsToShow.length
      )
        return
      lastRequestedPage.current = { query: pageQueryKey, loadedCount: itemsToShow.length }
      void itemPageQuery.fetchNextPage()
    }
  }, [itemPageQuery, pageQueryKey, itemsToShow.length])
  const openItemDetail = useCallback(
    (item: ItemSummary) => {
      if (onOpenItem) onOpenItem(item.slug)
      else void navigate({ to: resourcePath(category, item.slug) })
    },
    [navigate, category, onOpenItem],
  )

  useEffect(() => {
    if (rowToFocusSlug === null) return
    const picker = pickerRootRef.current
    if (!picker) return
    const returnedItemIndex = itemsToShow.findIndex((item) => item.slug === rowToFocusSlug)
    const itemToFocus = itemsToShow[returnedItemIndex < 0 ? 0 : returnedItemIndex]
    if (!itemToFocus) {
      if (!itemPageQuery.isPending) {
        effectiveSearchInputRef.current?.focus()
        onRowFocused?.()
      }
      return
    }
    const focusReturnedRow = (): boolean => {
      const row = picker.querySelector<HTMLElement>(`[data-row-key="${itemToFocus.slug}"]`)
      if (!row) return false
      row.scrollIntoView?.({ block: 'nearest' })
      row.focus()
      onRowFocused?.()
      return true
    }
    if (focusReturnedRow()) return
    const body = picker.querySelector<HTMLElement>('.ledger-body')
    if (body) {
      const rowHeightPx = body.scrollHeight / itemsToShow.length
      body.scrollTop = Math.max(0, returnedItemIndex) * rowHeightPx
    }
    const observer = new MutationObserver(() => {
      if (focusReturnedRow()) observer.disconnect()
    })
    observer.observe(picker, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [rowToFocusSlug, onRowFocused, itemsToShow, itemPageQuery.isPending, effectiveSearchInputRef])

  function applyRemainingFilters(remainingFilters: ItemListFilters): void {
    setFilters(remainingFilters)
    queueMicrotask(() => effectiveSearchInputRef.current?.focus())
  }

  function clearAll(): void {
    setFilters(EMPTY_ITEM_FILTERS)
    setIncludesSetBonuses(false)
    queueMicrotask(() => effectiveSearchInputRef.current?.focus())
  }

  if (!hasResolvedFirstPage && !itemPageQuery.data && !itemPageQuery.error) {
    return (
      <ApiGate isPending={itemPageQuery.isPending}>
        <StatusPlaceholder reason="loading" />
      </ApiGate>
    )
  }

  return (
    <div className="resources-picker-inner" ref={pickerRootRef}>
      <div className="resources-search">
        <label className="search-well resources-search-well focus-ring-proxy focus-ring-proxy--container">
          <Search size={14} aria-hidden />
          <input
            ref={effectiveSearchInputRef}
            type="search"
            placeholder="Search…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              event.stopPropagation()
              if (event.defaultPrevented) return
              event.preventDefault()
              if (searchQuery) setSearchQuery('')
            }}
            aria-label={'Search ' + category}
            aria-describedby={resultCountId}
            aria-keyshortcuts="/"
            className="search-well-input"
          />
          <kbd className="resources-search-shortcut" aria-hidden>
            /
          </kbd>
        </label>
      </div>
      <DeclaredFilterChipRow
        declarations={declarations}
        values={filters}
        onChange={setFilters}
        onClearAll={clearAll}
        resultCount={
          <span className="resources-result-count" id={resultCountId} aria-live="polite">
            {itemPageQuery.error &&
            !itemPageQuery.isFetchNextPageError ? null : (itemPageQuery.isFetching &&
                !itemPageQuery.isFetchingNextPage) ||
              itemPageQuery.isPlaceholderData ||
              (itemPageQuery.fetchStatus === 'paused' && !itemPageQuery.isFetchingNextPage) ? (
              'Loading…'
            ) : (
              <>
                <span className="num">{resultCount}</span>
                {resultCount === 1 ? ' result' : ' results'}
              </>
            )}
          </span>
        }
        focusFallbackRef={effectiveSearchInputRef}
        renderPickerHover={(key, option) =>
          hasBonusHover(key) && option.detailSlug ? (
            <BonusHoverCard detailSlug={option.detailSlug} />
          ) : null
        }
        prefetchPickerHover={(key, option) =>
          hasBonusHover(key) && option.detailSlug
            ? queryClient.ensureQueryData(effectDetailQueryOptions(option.detailSlug))
            : Promise.resolve()
        }
        isPickerHoverReady={(key, option) =>
          hasBonusHover(key) && option.detailSlug
            ? isDetailQueryReady(queryClient, effectDetailQueryOptions(option.detailSlug))
            : true
        }
        extraControls={{
          bonuses: (
            <label
              className="resources-include-sets focus-ring-proxy focus-ring-proxy--container"
              data-tip="Also match items whose set bonuses grant these"
            >
              <input
                type="checkbox"
                checked={includesSetBonuses}
                onChange={(event) => setIncludesSetBonuses(event.target.checked)}
              />
              <span className="resources-include-sets-box" aria-hidden>
                {includesSetBonuses && <Check size={10} />}
              </span>
              Include set bonuses
            </label>
          ),
        }}
      />
      <LedgerTable
        columns={ITEM_COLUMNS}
        {...columnLayout}
        rowCount={
          itemPageQuery.error && !itemPageQuery.isFetchNextPageError ? 0 : itemsToShow.length
        }
        rowAt={rowAt}
        rowKey={rowKey}
        onRowActivate={openItemDetail}
        navigationInputRef={effectiveSearchInputRef}
        hoverCard={(item) => ({
          kind: 'item',
          delayMs: ROW_CARD_OPEN_DELAY_MS,
          prefetch: () => prefetchItemCard(queryClient, item.slug),
          isReady: () => isItemCardReady(queryClient, item.slug),
          render: () => <ItemHoverContent itemSlug={item.slug} onOpenItem={onOpenItemFromHover} />,
        })}
        selectedRowKey={selectedItemSlug}
        isSortedExternally
        onNearEnd={fetchNextPageNearEnd}
        sort={effectiveSort}
        onSortChange={setSelectedSort}
        label={category + ' list'}
        emptyState={
          itemPageQuery.error && !itemPageQuery.isFetchNextPageError ? (
            <div className="resources-list-error">
              <div className="resources-status">
                <FilteredListErrorNotice
                  error={itemPageQuery.error}
                  declarations={declarations}
                  values={filters}
                  onChange={applyRemainingFilters}
                >
                  <ApiErrorNotice
                    error={itemPageQuery.error}
                    path="/v1/items"
                    onRetry={() => void itemPageQuery.refetch()}
                    additionalActions={
                      <>
                        {selectedSort && (
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            onClick={() => setSelectedSort(null)}
                          >
                            Reset sort
                          </button>
                        )}
                        {filters.bonuses.length > 0 && filters.bonusMatch === 'all' && (
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            onClick={() => setFilters({ ...filters, bonusMatch: 'any' })}
                          >
                            Reset match
                          </button>
                        )}
                      </>
                    }
                  />
                </FilteredListErrorNotice>
              </div>
            </div>
          ) : itemPageQuery.isPending ? (
            <StatusPlaceholder reason="loading" />
          ) : (
            <>
              <span>
                {hasActiveFilters
                  ? 'No items match your filters.'
                  : searchQuery
                    ? 'No items match your search.'
                    : 'No items found.'}
              </span>
              {hasActiveFilters && (
                <button type="button" className="btn-ghost-sm" onClick={clearAll}>
                  Clear filters
                </button>
              )}
            </>
          )
        }
      />
      {itemPageQuery.isFetchNextPageError && (
        <div className="resources-page-error">
          <FilteredListErrorNotice
            error={itemPageQuery.error}
            declarations={declarations}
            values={filters}
            onChange={applyRemainingFilters}
          >
            <ApiErrorNotice
              error={itemPageQuery.error}
              path="/v1/items"
              onRetry={() => void itemPageQuery.fetchNextPage()}
            />
          </FilteredListErrorNotice>
        </div>
      )}
    </div>
  )
}
