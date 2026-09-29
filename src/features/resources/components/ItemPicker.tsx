import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type JSX,
  type Ref,
  type ReactNode,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { List } from 'react-window'
import { ChevronDown, X } from 'lucide-react'
import type { ResourceCategory } from '../resourceCategories'
import type { ItemSummary } from '../queries/items'
import {
  useAdventurePackNames,
  useItemIdsInPack,
  useItemIdsWithAnyStat,
  useStatNames,
} from '../queries/useItems'
import { useDebouncedValue } from '../../../hooks'
import { createItemSearchIndex, itemsMatchingQuery } from '../itemSearch'
import { ItemPickerRow } from './ItemPickerRow'
import { StatusPlaceholder } from './StatusPlaceholder'

interface ItemPickerProps {
  category: ResourceCategory
  items: ItemSummary[]
  selectedItemId: number | null
  searchInputRef?: Ref<HTMLInputElement>
}

interface ItemFilters {
  equipmentSlot: string
  adventurePack: string
  isRareOnly: boolean
  isRaidOnly: boolean
  stats: string[]
  lowestMinimumLevel: string
  highestMinimumLevel: string
}

const EMPTY_FILTERS: ItemFilters = {
  equipmentSlot: '',
  adventurePack: '',
  isRareOnly: false,
  isRaidOnly: false,
  stats: [],
  lowestMinimumLevel: '',
  highestMinimumLevel: '',
}

const ITEM_ROW_HEIGHT_PX = 44
const SEARCH_DEBOUNCE_MS = 120

function SelectWithChevron({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="resources-select-shell">
      {children}
      <ChevronDown size={14} className="resources-select-chevron" aria-hidden />
    </span>
  )
}

function StatMultiSelect({
  options: availableStats,
  selected: selectedStats,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (nextSelectedStats: string[]) => void
}): JSX.Element {
  const dropdownRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function closeOnOutsideClick(e: MouseEvent): void {
      const dropdown = dropdownRef.current
      if (!dropdown?.open) return
      if (!dropdown.contains(e.target as Node)) dropdown.open = false
    }
    function closeOnEscape(e: KeyboardEvent): void {
      const dropdown = dropdownRef.current
      if (!dropdown?.open) return
      if (e.key === 'Escape') {
        dropdown.open = false
        e.stopPropagation()
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape, true)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape, true)
    }
  }, [])

  function setStatSelected(stat: string, isChecked: boolean): void {
    if (isChecked) onChange([...selectedStats, stat])
    else onChange(selectedStats.filter((s) => s !== stat))
  }

  const selectionSummary =
    selectedStats.length === 0
      ? 'Any'
      : selectedStats.length === 1
        ? selectedStats[0]
        : `${selectedStats.length} stats`

  return (
    <details className="resources-multiselect" ref={dropdownRef}>
      <summary className="resources-multiselect-trigger">
        <span className="resources-multiselect-label">{selectionSummary}</span>
        <ChevronDown size={14} className="resources-select-chevron" aria-hidden />
      </summary>
      <div className="resources-multiselect-menu" role="group" aria-label="Stats">
        {availableStats.length === 0 ? (
          <p className="resources-multiselect-empty">No stats available.</p>
        ) : (
          availableStats.map((stat) => (
            <label key={stat} className="resources-multiselect-item">
              <input
                type="checkbox"
                checked={selectedStats.includes(stat)}
                onChange={(e) => setStatSelected(stat, e.target.checked)}
              />
              <span>{stat}</span>
            </label>
          ))
        )}
        {selectedStats.length > 0 && (
          <button
            type="button"
            className="resources-multiselect-clear"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
      </div>
    </details>
  )
}

function itemsMatchingRowFilters(items: ItemSummary[], filters: ItemFilters): ItemSummary[] {
  const lowestMinimumLevel = filters.lowestMinimumLevel ? Number(filters.lowestMinimumLevel) : null
  const highestMinimumLevel = filters.highestMinimumLevel ? Number(filters.highestMinimumLevel) : null
  return items.filter((r) => {
    if (filters.equipmentSlot && r.equipmentSlot !== filters.equipmentSlot) return false
    if (filters.isRareOnly && !r.isRareLoot) return false
    if (filters.isRaidOnly && !r.isRaidLoot) return false
    if (lowestMinimumLevel !== null && (r.minimumLevel === null || r.minimumLevel < lowestMinimumLevel)) return false
    if (highestMinimumLevel !== null && (r.minimumLevel === null || r.minimumLevel > highestMinimumLevel)) return false
    return true
  })
}

function sortedDistinctValues(items: ItemSummary[], toValue: (r: ItemSummary) => string): string[] {
  const distinctValues = new Set<string>()
  for (const r of items) {
    const v = toValue(r)
    if (v) distinctValues.add(v)
  }
  return Array.from(distinctValues).sort()
}

export function ItemPicker({
  category,
  items,
  selectedItemId,
  searchInputRef,
}: ItemPickerProps): JSX.Element {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ItemFilters>(EMPTY_FILTERS)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS)
  const resultCountId = useId()
  const slotFilterLabelId = useId()
  const packFilterLabelId = useId()

  const availableStats = useStatNames().data ?? []
  const availableAdventurePacks = useAdventurePackNames().data ?? []

  const itemIdsWithSelectedStats = useItemIdsWithAnyStat(filters.stats)
  const itemIdsInSelectedPack = useItemIdsInPack(filters.adventurePack)

  const filteredItems = useMemo(() => {
    let matchingItems = itemsMatchingRowFilters(items, filters)
    if (itemIdsWithSelectedStats) {
      matchingItems = matchingItems.filter((r) => itemIdsWithSelectedStats.has(r.id))
    }
    if (itemIdsInSelectedPack) {
      matchingItems = matchingItems.filter((r) => itemIdsInSelectedPack.has(r.id))
    }
    return matchingItems
  }, [items, filters, itemIdsWithSelectedStats, itemIdsInSelectedPack])

  const itemSearchIndex = useMemo(() => createItemSearchIndex(filteredItems), [filteredItems])
  const itemsToShow = useMemo(
    () => itemsMatchingQuery(itemSearchIndex, filteredItems, debouncedSearchQuery),
    [itemSearchIndex, filteredItems, debouncedSearchQuery],
  )

  const equipmentSlots = useMemo(() => sortedDistinctValues(items, (r) => r.equipmentSlot), [items])

  const hasActiveFilters =
    !!filters.equipmentSlot ||
    !!filters.adventurePack ||
    filters.isRareOnly ||
    filters.isRaidOnly ||
    filters.stats.length > 0 ||
    !!filters.lowestMinimumLevel ||
    !!filters.highestMinimumLevel

  function openItemDetail(item: ItemSummary): void {
    navigate({ to: `/resources/${category}/${item.id}` })
  }

  function setItemFilter<K extends keyof ItemFilters>(filterName: K, filterValue: ItemFilters[K]): void {
    setFilters((prev) => ({ ...prev, [filterName]: filterValue }))
  }

  interface ActiveFilterChip {
    key: string
    label: string
    clearFilter: () => void
  }
  const activeFilterChips: ActiveFilterChip[] = []
  if (filters.equipmentSlot) {
    activeFilterChips.push({
      key: 'slot',
      label: filters.equipmentSlot,
      clearFilter: () => setItemFilter('equipmentSlot', ''),
    })
  }
  if (filters.isRareOnly) {
    activeFilterChips.push({
      key: 'rare',
      label: 'Rare',
      clearFilter: () => setItemFilter('isRareOnly', false),
    })
  }
  if (filters.isRaidOnly) {
    activeFilterChips.push({
      key: 'raid',
      label: 'Raid',
      clearFilter: () => setItemFilter('isRaidOnly', false),
    })
  }
  for (const stat of filters.stats) {
    activeFilterChips.push({
      key: `stat-${stat}`,
      label: stat,
      clearFilter: () => setItemFilter('stats', filters.stats.filter((s) => s !== stat)),
    })
  }
  if (filters.lowestMinimumLevel || filters.highestMinimumLevel) {
    const lowestMinimumLevel = filters.lowestMinimumLevel
    const highestMinimumLevel = filters.highestMinimumLevel
    let levelRangeLabel = 'ML '
    if (lowestMinimumLevel && highestMinimumLevel) levelRangeLabel += `${lowestMinimumLevel}–${highestMinimumLevel}`
    else if (lowestMinimumLevel) levelRangeLabel += `≥ ${lowestMinimumLevel}`
    else levelRangeLabel += `≤ ${highestMinimumLevel}`
    activeFilterChips.push({
      key: 'ml',
      label: levelRangeLabel,
      clearFilter: () =>
        setFilters((prev) => ({ ...prev, lowestMinimumLevel: '', highestMinimumLevel: '' })),
    })
  }

  return (
    <div className="resources-picker-inner">
      <div className="resources-search">
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search… (press / to focus)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={`Search ${category}`}
          aria-describedby={resultCountId}
          className="resources-search-input"
        />
        <span id={resultCountId} className="resources-search-count" aria-live="polite">
          {itemsToShow.length} {itemsToShow.length === 1 ? 'result' : 'results'}
        </span>
      </div>
      <div className="resources-filters">
        <label className="resources-filter">
          <span className="resources-filter-label" id={slotFilterLabelId}>
            Slot
          </span>
          <SelectWithChevron>
            <select
              className="resources-filter-select"
              value={filters.equipmentSlot}
              onChange={(e) => setItemFilter('equipmentSlot', e.target.value)}
              aria-labelledby={slotFilterLabelId}
            >
              <option value="">Any</option>
              {equipmentSlots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </SelectWithChevron>
        </label>
        <label className="resources-filter">
          <span className="resources-filter-label" id={packFilterLabelId}>
            Pack
          </span>
          <SelectWithChevron>
            <select
              className="resources-filter-select"
              value={filters.adventurePack}
              onChange={(e) => setItemFilter('adventurePack', e.target.value)}
              aria-labelledby={packFilterLabelId}
            >
              <option value="">Any</option>
              {availableAdventurePacks.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </SelectWithChevron>
        </label>
        <button
          type="button"
          className={`resources-filter-toggle${filters.isRareOnly ? ' active' : ''}`}
          aria-pressed={filters.isRareOnly}
          onClick={() => setItemFilter('isRareOnly', !filters.isRareOnly)}
        >
          Rare only
        </button>
        <button
          type="button"
          className={`resources-filter-toggle${filters.isRaidOnly ? ' active' : ''}`}
          aria-pressed={filters.isRaidOnly}
          onClick={() => setItemFilter('isRaidOnly', !filters.isRaidOnly)}
        >
          Raid only
        </button>
        <div className="resources-filter">
          <span className="resources-filter-label">Stats</span>
          <StatMultiSelect
            options={availableStats}
            selected={filters.stats}
            onChange={(next) => setItemFilter('stats', next)}
          />
        </div>
        <label className="resources-filter">
          <span className="resources-filter-label">Min ML</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            placeholder="—"
            className="resources-filter-input"
            value={filters.lowestMinimumLevel}
            onChange={(e) => setItemFilter('lowestMinimumLevel', e.target.value)}
            aria-label="Minimum character level (lower bound)"
          />
        </label>
        <label className="resources-filter">
          <span className="resources-filter-label">Max ML</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            placeholder="—"
            className="resources-filter-input"
            value={filters.highestMinimumLevel}
            onChange={(e) => setItemFilter('highestMinimumLevel', e.target.value)}
            aria-label="Minimum character level (upper bound)"
          />
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            className="resources-filter-clear"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear filters
          </button>
        )}
      </div>
      {activeFilterChips.length > 0 && (
        <div
          className="resources-active-filters"
          role="region"
          aria-label="Active filters"
        >
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="resources-filter-chip"
              onClick={chip.clearFilter}
              aria-label={`Remove filter: ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X size={12} aria-hidden />
            </button>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <StatusPlaceholder reason="empty-table" category={category} />
      ) : itemsToShow.length === 0 ? (
        <StatusPlaceholder reason="no-results" searchQuery={debouncedSearchQuery} />
      ) : (
        <div className="resources-list-wrap">
          <List
            rowComponent={ItemPickerRow}
            rowCount={itemsToShow.length}
            rowHeight={ITEM_ROW_HEIGHT_PX}
            rowProps={{ items: itemsToShow, selectedItemId, onSelect: openItemDetail }}
            className="resources-list"
            aria-label={`${category} list`}
          />
        </div>
      )}
    </div>
  )
}
