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
import { Check, Search } from 'lucide-react'
import { ApiGate, LedgerTable, type LedgerColumn, type LedgerSort } from '../../../components'
import { useDebouncedValue } from '../../../hooks'
import { FilterChipRow } from '../filters/FilterChipRow'
import {
  RESOURCE_LIST_CONFIGURATION,
  setResourceListSession,
  useResourceListSession,
} from '../resourceListSessions'
import {
  EMPTY_ITEM_FILTERS,
  type ItemListFilters,
  type ItemSummary,
  type RaidQuest,
} from '../queries/items'
import {
  useAdventurePackNames,
  useEnchantmentNames,
  useEquipmentSlotNames,
  useItemPage,
  useRaidQuests,
} from '../queries/useItems'
import { itemFilterDefinitions } from './itemFilterDefinitions'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemHoverContent } from './detail/ResourceHoverCards'

interface ItemPickerProps {
  category: 'items'
  selectedItemId: number | null
  searchInputRef?: RefObject<HTMLInputElement | null>
  onOpenItemFromHover?: (id: number, name: string) => void
  onOpenItem?: (id: number, activationSource: 'pointer' | 'keyboard') => void
  rowToFocusId?: number | null
  onRowFocused?: () => void
}
const EMPTY_NAMES: string[] = []
const EMPTY_RAID_QUESTS: RaidQuest[] = []
const EMPTY_ITEMS: ItemSummary[] = []

const ITEM_COLUMNS: LedgerColumn<ItemSummary>[] = [
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
    isSortable: false,
    sortValue: (item) => (item.isRaidLoot ? 0 : 1),
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
    isSortable: false,
    sortValue: (item) => (item.isRareLoot ? 0 : 1),
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
]

export function ItemPicker({
  category,
  selectedItemId,
  searchInputRef,
  onOpenItemFromHover,
  onOpenItem,
  rowToFocusId = null,
  onRowFocused,
}: ItemPickerProps): JSX.Element {
  const navigate = useNavigate()
  const { filters, searchQuery, selectedSort, includesSetBonuses, scrollTop } =
    useResourceListSession(category)
  const onFiltersChange = (filters: ItemListFilters): void => {
    setResourceListSession(category, { filters })
  }
  const setSearchQuery = (searchQuery: string): void => {
    setResourceListSession(category, { searchQuery })
  }
  const setSelectedSort = (selectedSort: LedgerSort | null): void => {
    setResourceListSession(category, { selectedSort })
  }
  const setIncludesSetBonuses = (includesSetBonuses: boolean): void => {
    setResourceListSession(category, { includesSetBonuses })
  }
  const pickerRootRef = useRef<HTMLDivElement>(null)
  const ownSearchInputRef = useRef<HTMLInputElement>(null)
  const effectiveSearchInputRef = searchInputRef ?? ownSearchInputRef
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)
  const activeSearchQuery = searchQuery ? debouncedSearchQuery : ''
  const [openedPickers, setOpenedPickers] = useState<ReadonlySet<string>>(() => new Set())
  const [hasResolvedFirstPage, setHasResolvedFirstPage] = useState(false)
  const [initialScrollTop] = useState(scrollTop)
  const hasRestoredScrollRef = useRef(false)
  const lastRequestedPage = useRef<{ query: string; loadedCount: number } | null>(null)
  const resultCountId = useId()
  const effectiveSort =
    selectedSort ?? (activeSearchQuery ? null : RESOURCE_LIST_CONFIGURATION[category].initialSort)
  const itemPageQuery = useItemPage(filters, activeSearchQuery, includesSetBonuses, effectiveSort)

  useLayoutEffect(() => {
    const body = pickerRootRef.current?.querySelector<HTMLElement>('.ledger-body')
    if (!body) return
    if (!hasRestoredScrollRef.current && itemPageQuery.data && !itemPageQuery.isPlaceholderData) {
      body.scrollTop = initialScrollTop
      hasRestoredScrollRef.current = true
    }
    const rememberScroll = (): void => {
      setResourceListSession(category, { scrollTop: body.scrollTop })
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
  const equipmentSlotQuery = useEquipmentSlotNames(openedPickers.has('slot'))
  const enchantmentQuery = useEnchantmentNames(openedPickers.has('enchantments'))
  const packQuery = useAdventurePackNames(openedPickers.has('pack'))
  const raidQuery = useRaidQuests(openedPickers.has('raid'))
  const equipmentSlots = equipmentSlotQuery.data ?? EMPTY_NAMES
  const enchantmentNames = enchantmentQuery.data ?? EMPTY_NAMES
  const packNames = packQuery.data ?? EMPTY_NAMES
  const raidQuests = raidQuery.data ?? EMPTY_RAID_QUESTS
  const loadingPickers = new Set<string>()
  if (equipmentSlotQuery.isPending) loadingPickers.add('slot')
  if (enchantmentQuery.isPending) loadingPickers.add('enchantments')
  if (packQuery.isPending) loadingPickers.add('pack')
  if (raidQuery.isPending) loadingPickers.add('raid')
  const definitions = useMemo(
    () => itemFilterDefinitions(equipmentSlots, enchantmentNames, packNames, raidQuests, filters),
    [equipmentSlots, enchantmentNames, packNames, raidQuests, filters],
  )
  const rowAt = useCallback((index: number) => itemsToShow[index], [itemsToShow])
  const rowKey = useCallback((item: ItemSummary) => item.id, [])
  const pageQueryKey = JSON.stringify([
    filters,
    activeSearchQuery,
    includesSetBonuses,
    effectiveSort,
  ])
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
    (item: ItemSummary, activationSource: 'pointer' | 'keyboard') => {
      if (onOpenItem) onOpenItem(item.id, activationSource)
      else void navigate({ to: '/resources/' + category + '/' + item.id })
    },
    [navigate, category, onOpenItem],
  )

  useEffect(() => {
    if (rowToFocusId === null) return
    const picker = pickerRootRef.current
    if (!picker) return
    const focusReturnedRow = (): boolean => {
      const row = picker.querySelector<HTMLElement>(`[data-row-key="${rowToFocusId}"]`)
      if (!row) return false
      row.focus()
      onRowFocused?.()
      return true
    }
    if (focusReturnedRow()) return
    const observer = new MutationObserver(() => {
      if (focusReturnedRow()) observer.disconnect()
    })
    observer.observe(picker, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [rowToFocusId, onRowFocused, itemsToShow])

  function clearAll(): void {
    onFiltersChange(EMPTY_ITEM_FILTERS)
    setSearchQuery('')
    setIncludesSetBonuses(false)
    queueMicrotask(() => effectiveSearchInputRef.current?.focus())
  }

  if (!hasResolvedFirstPage && !itemPageQuery.data && !itemPageQuery.error) {
    return (
      <ApiGate
        isPending={itemPageQuery.isPending}
        error={itemPageQuery.error}
        onRetry={() => void itemPageQuery.refetch()}
      >
        <StatusPlaceholder reason="loading" />
      </ApiGate>
    )
  }

  return (
    <div className="resources-picker-inner" ref={pickerRootRef}>
      <div className="resources-search">
        <label className="search-well resources-search-well">
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
      <FilterChipRow
        definitions={definitions}
        values={filters}
        onChange={onFiltersChange}
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
        hasSearchTerm={!!searchQuery}
        focusFallbackRef={effectiveSearchInputRef}
        onPickerOpen={(key) => setOpenedPickers((previous) => new Set(previous).add(String(key)))}
        loadingPickers={loadingPickers}
        searchControls={{
          enchantments: (
            <span className="resources-enchantment-match" aria-label="Enchantment match mode">
              {(['any', 'all'] as const).map((match) => (
                <button
                  key={match}
                  type="button"
                  aria-pressed={filters.enchantmentMatch === match}
                  data-tip={`Match ${match}: item has ${match === 'any' ? 'at least one selected bonus' : 'every selected bonus'}`}
                  onClick={() => onFiltersChange({ ...filters, enchantmentMatch: match })}
                >
                  {match === 'any' ? 'Any' : 'All'}
                </button>
              ))}
            </span>
          ),
        }}
        extraControls={{
          enchantments: (
            <label
              className="resources-include-sets"
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
        rowCount={
          itemPageQuery.error && !itemPageQuery.isFetchNextPageError ? 0 : itemsToShow.length
        }
        rowAt={rowAt}
        rowKey={rowKey}
        onRowActivate={openItemDetail}
        navigationInputRef={effectiveSearchInputRef}
        hoverCard={(item) => ({
          kind: 'item',
          delayMs: 260,
          render: () => <ItemHoverContent itemId={item.id} onOpenItem={onOpenItemFromHover} />,
        })}
        selectedRowKey={selectedItemId}
        isSortedExternally
        onNearEnd={fetchNextPageNearEnd}
        sort={effectiveSort}
        onSortChange={setSelectedSort}
        label={category + ' list'}
        emptyState={
          itemPageQuery.error && !itemPageQuery.isFetchNextPageError ? (
            <div className="resources-list-error">
              <StatusPlaceholder reason={selectedSort ? 'sort-error' : 'filter-error'} />
              <div className="resources-list-error-actions">
                <button type="button" onClick={() => void itemPageQuery.refetch()}>
                  Retry
                </button>
                {selectedSort && (
                  <button type="button" onClick={() => setSelectedSort(null)}>
                    Reset sort
                  </button>
                )}
                {filters.enchantments.length > 0 && filters.enchantmentMatch === 'all' && (
                  <button
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, enchantmentMatch: 'any' })}
                  >
                    Reset match
                  </button>
                )}
              </div>
            </div>
          ) : itemPageQuery.isPending ? (
            <StatusPlaceholder reason="loading" />
          ) : (
            <>
              <span>No items match your filters.</span>
              <button type="button" className="btn-ghost-sm" onClick={clearAll}>
                Clear filters
              </button>
            </>
          )
        }
      />
      {itemPageQuery.isFetchNextPageError && (
        <div className="resources-page-error" role="alert">
          Could not load more items.
          <button type="button" onClick={() => void itemPageQuery.fetchNextPage()}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
