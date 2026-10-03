import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type JSX,
  type RefObject,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { ApiGate, LedgerTable, type LedgerColumn, type LedgerSort } from '../../../components'
import { useDebouncedValue } from '../../../hooks'
import { FilterChipRow } from '../filters/FilterChipRow'
import type { ResourceCategory } from '../resourceCategories'
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
import { DropTagChip } from './DropTagChip'
import { itemFilterDefinitions } from './itemFilterDefinitions'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemHoverContent } from './detail/ResourceHoverCards'

interface ItemPickerProps {
  category: ResourceCategory
  selectedItemId: number | null
  searchInputRef?: RefObject<HTMLInputElement | null>
  filters: ItemListFilters
  onFiltersChange: (filters: ItemListFilters) => void
  onOpenItemFromHover?: (id: number, name: string) => void
}
const EMPTY_NAMES: string[] = []
const EMPTY_RAID_QUESTS: RaidQuest[] = []
const EMPTY_ITEMS: ItemSummary[] = []
const ITEM_INITIAL_SORT: LedgerSort = { key: 'name', direction: 'asc' }

const ITEM_COLUMNS: LedgerColumn<ItemSummary>[] = [
  {
    key: 'name',
    label: 'Name',
    isFlexible: true,
    minWidth: 120,
    sortValue: (item) => item.name,
    render: (item) => (
      <span className="resources-ledger-name">
        <span>{item.name}</span>
        {item.isRaidLoot && <DropTagChip kind="raid" />}
        {item.isRareLoot && <DropTagChip kind="rare" />}
      </span>
    ),
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
    render: (item) => (item.isRaidLoot ? 'Yes' : '—'),
  },
  {
    key: 'rare',
    label: 'Rare',
    width: 52,
    minWidth: 48,
    hiddenBelowPx: 600,
    isSortable: false,
    sortValue: (item) => (item.isRareLoot ? 0 : 1),
    render: (item) => (item.isRareLoot ? 'Yes' : '—'),
  },
]

export function ItemPicker({
  category,
  selectedItemId,
  searchInputRef,
  filters,
  onFiltersChange,
  onOpenItemFromHover,
}: ItemPickerProps): JSX.Element {
  const navigate = useNavigate()
  const ownSearchInputRef = useRef<HTMLInputElement>(null)
  const effectiveSearchInputRef = searchInputRef ?? ownSearchInputRef
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)
  const activeSearchQuery = searchQuery ? debouncedSearchQuery : ''
  const [selectedSort, setSelectedSort] = useState<LedgerSort | null>(null)
  const [openedPickers, setOpenedPickers] = useState<ReadonlySet<string>>(() => new Set())
  const [includesSetBonuses, setIncludesSetBonuses] = useState(false)
  const [hasResolvedFirstPage, setHasResolvedFirstPage] = useState(false)
  const lastRequestedPage = useRef<{ query: string; loadedCount: number } | null>(null)
  const resultCountId = useId()
  const itemPageQuery = useItemPage(filters, activeSearchQuery, includesSetBonuses, selectedSort)
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
    () => itemFilterDefinitions(equipmentSlots, enchantmentNames, packNames, raidQuests),
    [equipmentSlots, enchantmentNames, packNames, raidQuests],
  )
  const rowAt = useCallback((index: number) => itemsToShow[index], [itemsToShow])
  const rowKey = useCallback((item: ItemSummary) => item.id, [])
  const pageQueryKey = JSON.stringify([
    filters,
    activeSearchQuery,
    includesSetBonuses,
    selectedSort,
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
    (item: ItemSummary) => navigate({ to: '/resources/' + category + '/' + item.id }),
    [navigate, category],
  )

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
    <div className="resources-picker-inner">
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
              event.preventDefault()
              event.stopPropagation()
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
        hasSearchTerm={!!searchQuery}
        focusFallbackRef={effectiveSearchInputRef}
        onPickerOpen={(key) => setOpenedPickers((previous) => new Set(previous).add(String(key)))}
        loadingPickers={loadingPickers}
        extraControls={{
          enchantments: (
            <label className="resources-include-sets">
              <input
                type="checkbox"
                checked={includesSetBonuses}
                onChange={(event) => setIncludesSetBonuses(event.target.checked)}
              />
              Include set bonuses
            </label>
          ),
        }}
      />
      <div className="resources-result-count" id={resultCountId} aria-live="polite">
        {itemPageQuery.error && !itemPageQuery.isFetchNextPageError
          ? null
          : (itemPageQuery.isFetching && !itemPageQuery.isFetchingNextPage) ||
              itemPageQuery.isPlaceholderData ||
              (itemPageQuery.fetchStatus === 'paused' && !itemPageQuery.isFetchingNextPage)
            ? 'Loading…'
            : `${itemPageQuery.data?.pages[0]?.total ?? 0}${itemPageQuery.data?.pages[0]?.total === 1 ? ' result' : ' results'}`}
      </div>
      <LedgerTable
        columns={ITEM_COLUMNS}
        rowCount={
          itemPageQuery.error && !itemPageQuery.isFetchNextPageError ? 0 : itemsToShow.length
        }
        rowAt={rowAt}
        rowKey={rowKey}
        onRowActivate={openItemDetail}
        hoverCard={(item) => ({
          kind: 'item',
          delayMs: 260,
          render: () => <ItemHoverContent itemId={item.id} onOpenItem={onOpenItemFromHover} />,
        })}
        selectedRowKey={selectedItemId}
        isSortedExternally
        onNearEnd={fetchNextPageNearEnd}
        sort={selectedSort ?? (activeSearchQuery ? null : ITEM_INITIAL_SORT)}
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
              </div>
            </div>
          ) : itemPageQuery.isPending ? (
            <StatusPlaceholder reason="loading" />
          ) : (
            <>
              <span>No items match your filters.</span>
              <button type="button" className="resources-empty-clear" onClick={clearAll}>
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
