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
import {
  ApiErrorNotice,
  ApiGate,
  LedgerTable,
  ROW_CARD_OPEN_DELAY_MS,
  type LedgerColumn,
  type LedgerSort,
} from '../../../components'
import { isApiError, type ApiEffectVocabularyRow } from '../../../lib/api'
import { useDebouncedValue } from '../../../hooks'
import { FilterChipRow } from '../filters/FilterChipRow'
import {
  RESOURCE_LIST_CONFIGURATION,
  setResourceListSession,
  useResourceListSession,
} from '../resourceListSessions'
import { appliedFilterValues } from '../filters/filterModel'
import {
  EMPTY_ITEM_FILTERS,
  type ItemListFilters,
  type ItemSummary,
  type RaidQuest,
} from '../queries/items'
import {
  useAdventurePackNames,
  useEffectVocabulary,
  useEquipmentSlotNames,
  useItemPage,
  prefetchItemCard,
  isItemCardReady,
  isDetailQueryReady,
  effectDetailQueryOptions,
  useRaidQuests,
  useSetVocabulary,
} from '../queries/useItems'
import { itemFilterDefinitions } from './itemFilterDefinitions'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemHoverContent } from './detail/ResourceHoverCards'
import { BonusHoverCard } from './detail/BonusDetailCard'

interface ItemPickerProps {
  category: 'items'
  selectedItemId: number | null
  searchInputRef?: RefObject<HTMLInputElement | null>
  onOpenItemFromHover?: (id: number, name: string) => void
  onOpenItem?: (id: number) => void
  rowToFocusId?: number | null
  onRowFocused?: () => void
}
const EMPTY_NAMES: string[] = []
const EMPTY_EFFECT_VOCABULARY: ApiEffectVocabularyRow[] = []
const EMPTY_RAID_QUESTS: RaidQuest[] = []
const EMPTY_ITEMS: ItemSummary[] = []

function rejectedItemFilter(error: unknown, filters: ItemListFilters): 'bonuses' | 'set' | null {
  if (!isApiError(error) || error.httpStatus !== 400) return null
  const parameter = error.message.match(/\b(?:unknown|invalid|unrecognized)\s+(bonus|set)\b/i)?.[1]
  if (parameter === 'bonus' && filters.bonuses.length > 0) return 'bonuses'
  if (parameter === 'set' && filters.set.length > 0) return 'set'
  return null
}

function MatchModeControl({
  subject,
  value,
  onChange,
}: {
  subject: 'Bonus' | 'Set'
  value: 'any' | 'all'
  onChange: (match: 'any' | 'all') => void
}): JSX.Element {
  return (
    <span className="resources-filter-match" aria-label={`${subject} match mode`}>
      {(['any', 'all'] as const).map((match) => (
        <button
          key={match}
          type="button"
          className="focus-ring-proxy"
          aria-pressed={value === match}
          data-tip={
            subject === 'Bonus'
              ? `Match ${match}: item has ${match === 'any' ? 'at least one selected bonus' : 'every selected bonus'}`
              : `Match ${match}: item belongs to ${match === 'any' ? 'at least one selected set' : 'every selected set'}`
          }
          onClick={() => onChange(match)}
        >
          {match === 'any' ? 'Any' : 'All'}
        </button>
      ))}
    </span>
  )
}

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
  const queryClient = useQueryClient()
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
  const [bonusSearchQuery, setBonusSearchQuery] = useState('')
  const debouncedBonusSearchQuery = useDebouncedValue(bonusSearchQuery, 150)
  const [setVocabularySearchQuery, setSetVocabularySearchQuery] = useState('')
  const debouncedSetSearchQuery = useDebouncedValue(setVocabularySearchQuery, 150)
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
  const allEffectsQuery = useEffectVocabulary('', openedPickers.has('bonuses'))
  const searchedEffectsQuery = useEffectVocabulary(
    debouncedBonusSearchQuery,
    openedPickers.has('bonuses') && Boolean(debouncedBonusSearchQuery),
  )
  const packQuery = useAdventurePackNames(openedPickers.has('pack'))
  const allSetsQuery = useSetVocabulary('', openedPickers.has('set'))
  const searchedSetsQuery = useSetVocabulary(
    debouncedSetSearchQuery,
    openedPickers.has('set') && Boolean(debouncedSetSearchQuery),
  )
  const raidQuery = useRaidQuests(openedPickers.has('raid'))
  const activeEffectsQuery = debouncedBonusSearchQuery ? searchedEffectsQuery : allEffectsQuery
  const activeSetsQuery = debouncedSetSearchQuery ? searchedSetsQuery : allSetsQuery
  const pickerErrors = Object.fromEntries(
    [
      { key: 'slot', label: 'Gear slot', path: '/v1/equipment-slots', query: equipmentSlotQuery },
      { key: 'bonuses', label: 'Bonuses', path: '/v1/effects', query: activeEffectsQuery },
      { key: 'set', label: 'Set', path: '/v1/sets', query: activeSetsQuery },
      { key: 'pack', label: 'Pack', path: '/v1/adventure-packs', query: packQuery },
      { key: 'raid', label: 'Raid', path: '/v1/quests', query: raidQuery },
    ]
      .filter(({ query }) => query.error)
      .map(({ key, label, path, query }) => [
        key,
        <ApiErrorNotice
          key={key}
          error={query.error}
          path={path}
          heading={`Could not load ${label} options.`}
          isCompact
          onRetry={() => void query.refetch()}
        />,
      ]),
  )
  const equipmentSlots = equipmentSlotQuery.data ?? EMPTY_NAMES
  const allEffectVocabulary = allEffectsQuery.data?.rows ?? EMPTY_EFFECT_VOCABULARY
  const effectVocabulary = debouncedBonusSearchQuery
    ? (searchedEffectsQuery.data?.rows ?? EMPTY_EFFECT_VOCABULARY)
    : allEffectVocabulary
  const packNames = packQuery.data ?? EMPTY_NAMES
  const setNames = debouncedSetSearchQuery
    ? (searchedSetsQuery.data?.rows ?? EMPTY_NAMES)
    : (allSetsQuery.data?.rows ?? EMPTY_NAMES)
  const raidQuests = raidQuery.data ?? EMPTY_RAID_QUESTS
  const loadingPickers = new Set<string>()
  if (equipmentSlotQuery.isPending) loadingPickers.add('slot')
  if (activeEffectsQuery.isPending) loadingPickers.add('bonuses')
  if (packQuery.isPending) loadingPickers.add('pack')
  if (activeSetsQuery.isPending) loadingPickers.add('set')
  if (raidQuery.isPending) loadingPickers.add('raid')
  const definitions = useMemo(
    () =>
      itemFilterDefinitions(
        equipmentSlots,
        effectVocabulary,
        allEffectVocabulary,
        allEffectsQuery.data?.total ?? effectVocabulary.length,
        setNames,
        allSetsQuery.data?.total ?? setNames.length,
        packNames,
        raidQuests,
        filters,
      ),
    [
      equipmentSlots,
      effectVocabulary,
      allEffectVocabulary,
      allEffectsQuery.data?.total,
      setNames,
      allSetsQuery.data?.total,
      packNames,
      raidQuests,
      filters,
    ],
  )
  const hasActiveFilters = appliedFilterValues(definitions, filters).length > 0
  const rejectedFilter = rejectedItemFilter(itemPageQuery.error, filters)
  const rejectedFilterLabel =
    rejectedFilter === 'bonuses' ? 'Bonuses' : rejectedFilter === 'set' ? 'Set' : null
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
    (item: ItemSummary) => {
      if (onOpenItem) onOpenItem(item.id)
      else void navigate({ to: '/resources/' + category + '/' + item.id })
    },
    [navigate, category, onOpenItem],
  )

  useEffect(() => {
    if (rowToFocusId === null) return
    const picker = pickerRootRef.current
    if (!picker) return
    const returnedItemIndex = itemsToShow.findIndex((item) => item.id === rowToFocusId)
    const itemToFocus = itemsToShow[returnedItemIndex < 0 ? 0 : returnedItemIndex]
    if (!itemToFocus) {
      if (!itemPageQuery.isPending) {
        effectiveSearchInputRef.current?.focus()
        onRowFocused?.()
      }
      return
    }
    const focusReturnedRow = (): boolean => {
      const row = picker.querySelector<HTMLElement>(`[data-row-key="${itemToFocus.id}"]`)
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
  }, [rowToFocusId, onRowFocused, itemsToShow, itemPageQuery.isPending, effectiveSearchInputRef])

  function clearAll(): void {
    onFiltersChange(EMPTY_ITEM_FILTERS)
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
        focusFallbackRef={effectiveSearchInputRef}
        onPickerOpen={(key) => {
          setOpenedPickers((previous) => new Set(previous).add(String(key)))
          if (key === 'bonuses') setBonusSearchQuery('')
          if (key === 'set') setSetVocabularySearchQuery('')
        }}
        loadingPickers={loadingPickers}
        pickerErrors={pickerErrors}
        onPickerSearch={(key, query) => {
          if (key === 'bonuses') setBonusSearchQuery(query)
          if (key === 'set') setSetVocabularySearchQuery(query)
        }}
        renderPickerHover={(key, option) =>
          key === 'bonuses' && option.detailPath ? (
            <BonusHoverCard detailPath={option.detailPath} />
          ) : null
        }
        prefetchPickerHover={(key, option) =>
          key === 'bonuses' && option.detailPath
            ? queryClient.ensureQueryData(effectDetailQueryOptions(option.detailPath))
            : Promise.resolve()
        }
        isPickerHoverReady={(key, option) =>
          key === 'bonuses' && option.detailPath
            ? isDetailQueryReady(queryClient, effectDetailQueryOptions(option.detailPath))
            : true
        }
        searchControls={{
          bonuses: (
            <MatchModeControl
              subject="Bonus"
              value={filters.bonusMatch}
              onChange={(match) => onFiltersChange({ ...filters, bonusMatch: match })}
            />
          ),
          set: (
            <MatchModeControl
              subject="Set"
              value={filters.setMatch}
              onChange={(match) => onFiltersChange({ ...filters, setMatch: match })}
            />
          ),
        }}
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
          prefetch: () => prefetchItemCard(queryClient, item.id),
          isReady: () => isItemCardReady(queryClient, item.id),
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
              <StatusPlaceholder
                error={itemPageQuery.error}
                path="/v1/items"
                heading={
                  rejectedFilterLabel ? `Could not load ${rejectedFilterLabel} filter.` : undefined
                }
                onRetry={() => void itemPageQuery.refetch()}
                additionalActions={
                  <>
                    {rejectedFilter && (
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() =>
                          onFiltersChange(
                            rejectedFilter === 'bonuses'
                              ? { ...filters, bonuses: [], bonusMatch: 'any' }
                              : { ...filters, set: [], setMatch: 'any' },
                          )
                        }
                      >
                        Reset {rejectedFilterLabel} filter
                      </button>
                    )}
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
                        onClick={() => onFiltersChange({ ...filters, bonusMatch: 'any' })}
                      >
                        Reset match
                      </button>
                    )}
                  </>
                }
              />
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
          <ApiErrorNotice
            error={itemPageQuery.error}
            path="/v1/items"
            onRetry={() => void itemPageQuery.fetchNextPage()}
          />
        </div>
      )}
    </div>
  )
}
