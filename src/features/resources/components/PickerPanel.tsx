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
import type { Category } from '../types'
import {
  findItemIdsByPack,
  findItemIdsByStats,
  listAdventurePacks,
  listBonusStats,
  RARE_RARITY,
  type ItemRow,
} from '../queries/items'
import { useDatabase } from '../../../hooks/useDatabase'
import { useDebouncedValue } from '../../../hooks'
import { buildItemsIndex, searchItems } from '../search'
import { PickerRow } from './PickerRow'
import { DetailEmpty } from './DetailEmpty'

interface PickerPanelProps {
  category: Category
  rows: ItemRow[]
  selectedId: number | null
  // Forwarded ref so the parent's "/" keyboard shortcut can focus the search.
  searchInputRef?: Ref<HTMLInputElement>
}

interface ItemFilters {
  slot: string
  /** Adventure-pack name. Empty string = any. Filtered via the
   *  `findItemIdsByPack` set lookup (not row-level equality on `pack`),
   *  since the row's `pack` is only the alphabetically-first source. */
  pack: string
  /** Boolean toggle — items.rarity === 'Rare'. Other rarity values aren't
   *  reliably populated by the scraper and "Rare" is the most useful filter
   *  in the meantime. */
  rareOnly: boolean
  /** Boolean toggle — reads `ItemRow.is_raid`, which `listItems` already
   *  stamped onto every row. No extra query. */
  raidOnly: boolean
  /** Multi-select — items match if they boost ANY of these stats. Empty = any. */
  stats: string[]
  /** Stored as raw input strings so partial entry (e.g., "1") doesn't fight
   *  with `<input type="number">` and lose the user's typing position. */
  minLevelMin: string
  minLevelMax: string
}

const EMPTY_FILTERS: ItemFilters = {
  slot: '',
  pack: '',
  rareOnly: false,
  raidOnly: false,
  stats: [],
  minLevelMin: '',
  minLevelMax: '',
}

const ROW_HEIGHT = 44
const SEARCH_DEBOUNCE_MS = 120

// Wraps a native <select> with a custom-themed chevron + matched border.
function SelectShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="resources-select-shell">
      {children}
      <ChevronDown size={14} className="resources-select-chevron" aria-hidden />
    </span>
  )
}

// Multi-select popover built on `<details>` for the open/close state. Click
// outside or Escape closes; checkboxes inside set the active values.
function StatsMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}): JSX.Element {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      const el = ref.current
      if (!el?.open) return
      if (!el.contains(e.target as Node)) el.open = false
    }
    function onKey(e: KeyboardEvent): void {
      const el = ref.current
      if (!el?.open) return
      if (e.key === 'Escape') {
        el.open = false
        e.stopPropagation()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [])

  function toggle(stat: string, checked: boolean): void {
    if (checked) onChange([...selected, stat])
    else onChange(selected.filter((s) => s !== stat))
  }

  const summary =
    selected.length === 0
      ? 'Any'
      : selected.length === 1
        ? selected[0]
        : `${selected.length} stats`

  return (
    <details className="resources-multiselect" ref={ref}>
      <summary className="resources-multiselect-trigger">
        <span className="resources-multiselect-label">{summary}</span>
        <ChevronDown size={14} className="resources-select-chevron" aria-hidden />
      </summary>
      <div className="resources-multiselect-menu" role="group" aria-label="Stats">
        {options.length === 0 ? (
          <p className="resources-multiselect-empty">No stats available.</p>
        ) : (
          options.map((stat) => (
            <label key={stat} className="resources-multiselect-item">
              <input
                type="checkbox"
                checked={selected.includes(stat)}
                onChange={(e) => toggle(stat, e.target.checked)}
              />
              <span>{stat}</span>
            </label>
          ))
        )}
        {selected.length > 0 && (
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

function applyRowFilters(rows: ItemRow[], filters: ItemFilters): ItemRow[] {
  const min = filters.minLevelMin ? Number(filters.minLevelMin) : null
  const max = filters.minLevelMax ? Number(filters.minLevelMax) : null
  return rows.filter((r) => {
    if (filters.slot && r.equipment_slot !== filters.slot) return false
    if (filters.rareOnly && r.rarity !== RARE_RARITY) return false
    if (filters.raidOnly && !r.is_raid) return false
    if (min !== null && (r.minimum_level === null || r.minimum_level < min)) return false
    if (max !== null && (r.minimum_level === null || r.minimum_level > max)) return false
    return true
  })
}

function distinctSorted(rows: ItemRow[], pick: (r: ItemRow) => string | null): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    const v = pick(r)
    if (v) set.add(v)
  }
  return Array.from(set).sort()
}


export function PickerPanel({
  category,
  rows,
  selectedId,
  searchInputRef,
}: PickerPanelProps): JSX.Element {
  const navigate = useNavigate()
  const { db } = useDatabase()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ItemFilters>(EMPTY_FILTERS)
  const debounced = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
  const countId = useId()
  const slotSelectId = useId()
  const packSelectId = useId()

  const statOptions = useMemo(() => (db ? listBonusStats(db) : []), [db])
  const packOptions = useMemo(() => (db ? listAdventurePacks(db) : []), [db])

  // Compute the matching item-id set only when at least one stat is picked,
  // so users not filtering by stat pay nothing for the JOIN.
  const statItemIdSet = useMemo(() => {
    if (!db || filters.stats.length === 0) return null
    return findItemIdsByStats(db, filters.stats)
  }, [db, filters.stats])

  // Pack item-id set — same lazy pattern as raid/stats. Items can drop from
  // multiple packs, so we filter by Set membership rather than by equality
  // on the row's `pack` (which is alphabetically-first only).
  const packItemIdSet = useMemo(() => {
    if (!db || !filters.pack) return null
    return findItemIdsByPack(db, filters.pack)
  }, [db, filters.pack])

  // Filters apply BEFORE Fuse so the index only carries currently-visible
  // rows. Filter changes are infrequent vs. keystrokes; rebuilding the
  // index on filter change is fine, rebuilding it on every keystroke is not.
  //
  // Slot / rarity / raid / ML are all answerable from the row itself, so
  // `applyRowFilters` handles them with no SQL. Only stats and pack need a
  // query: a row carries no stat list, and its `pack` is the alphabetically-
  // first source rather than the full set.
  const filteredRows = useMemo(() => {
    let result = applyRowFilters(rows, filters)
    if (statItemIdSet) {
      result = result.filter((r) => statItemIdSet.has(r.id))
    }
    if (packItemIdSet) {
      result = result.filter((r) => packItemIdSet.has(r.id))
    }
    return result
  }, [rows, filters, statItemIdSet, packItemIdSet])

  const fuse = useMemo(() => buildItemsIndex(filteredRows), [filteredRows])
  const visible = useMemo(
    () => searchItems(fuse, filteredRows, debounced),
    [fuse, filteredRows, debounced],
  )

  const slotOptions = useMemo(() => distinctSorted(rows, (r) => r.equipment_slot), [rows])

  const hasActiveFilters =
    !!filters.slot ||
    !!filters.pack ||
    filters.rareOnly ||
    filters.raidOnly ||
    filters.stats.length > 0 ||
    !!filters.minLevelMin ||
    !!filters.minLevelMax

  function handleSelect(row: ItemRow): void {
    navigate({ to: `/resources/${category}/${row.id}` })
  }

  function updateFilter<K extends keyof ItemFilters>(key: K, value: ItemFilters[K]): void {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // Build the set of "active filter" chips for the row below the controls.
  // Each chip's onRemove resets only that filter dimension. ML range is one
  // chip (showing min–max / ≥min / ≤max) since min and max read together.
  interface Chip {
    key: string
    label: string
    onRemove: () => void
  }
  const activeChips: Chip[] = []
  if (filters.slot) {
    activeChips.push({
      key: 'slot',
      label: filters.slot,
      onRemove: () => updateFilter('slot', ''),
    })
  }
  if (filters.rareOnly) {
    activeChips.push({
      key: 'rare',
      label: 'Rare',
      onRemove: () => updateFilter('rareOnly', false),
    })
  }
  if (filters.raidOnly) {
    activeChips.push({
      key: 'raid',
      label: 'Raid',
      onRemove: () => updateFilter('raidOnly', false),
    })
  }
  for (const stat of filters.stats) {
    activeChips.push({
      key: `stat-${stat}`,
      label: stat,
      onRemove: () => updateFilter('stats', filters.stats.filter((s) => s !== stat)),
    })
  }
  if (filters.minLevelMin || filters.minLevelMax) {
    const min = filters.minLevelMin
    const max = filters.minLevelMax
    let label = 'ML '
    if (min && max) label += `${min}–${max}`
    else if (min) label += `≥ ${min}`
    else label += `≤ ${max}`
    activeChips.push({
      key: 'ml',
      label,
      onRemove: () =>
        setFilters((prev) => ({ ...prev, minLevelMin: '', minLevelMax: '' })),
    })
  }

  return (
    <div className="resources-picker-inner">
      <div className="resources-search">
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search… (press / to focus)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={`Search ${category}`}
          aria-describedby={countId}
          className="resources-search-input"
        />
        <span id={countId} className="resources-search-count" aria-live="polite">
          {visible.length} {visible.length === 1 ? 'result' : 'results'}
        </span>
      </div>
      <div className="resources-filters">
        <label className="resources-filter">
          <span className="resources-filter-label" id={slotSelectId}>
            Slot
          </span>
          <SelectShell>
            <select
              className="resources-filter-select"
              value={filters.slot}
              onChange={(e) => updateFilter('slot', e.target.value)}
              aria-labelledby={slotSelectId}
            >
              <option value="">Any</option>
              {slotOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </SelectShell>
        </label>
        <label className="resources-filter">
          <span className="resources-filter-label" id={packSelectId}>
            Pack
          </span>
          <SelectShell>
            <select
              className="resources-filter-select"
              value={filters.pack}
              onChange={(e) => updateFilter('pack', e.target.value)}
              aria-labelledby={packSelectId}
            >
              <option value="">Any</option>
              {packOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </SelectShell>
        </label>
        <button
          type="button"
          className={`resources-filter-toggle${filters.rareOnly ? ' active' : ''}`}
          aria-pressed={filters.rareOnly}
          onClick={() => updateFilter('rareOnly', !filters.rareOnly)}
        >
          Rare only
        </button>
        <button
          type="button"
          className={`resources-filter-toggle${filters.raidOnly ? ' active' : ''}`}
          aria-pressed={filters.raidOnly}
          onClick={() => updateFilter('raidOnly', !filters.raidOnly)}
        >
          Raid only
        </button>
        <div className="resources-filter">
          <span className="resources-filter-label">Stats</span>
          <StatsMultiSelect
            options={statOptions}
            selected={filters.stats}
            onChange={(next) => updateFilter('stats', next)}
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
            value={filters.minLevelMin}
            onChange={(e) => updateFilter('minLevelMin', e.target.value)}
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
            value={filters.minLevelMax}
            onChange={(e) => updateFilter('minLevelMax', e.target.value)}
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
      {activeChips.length > 0 && (
        <div
          className="resources-active-filters"
          role="region"
          aria-label="Active filters"
        >
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="resources-filter-chip"
              onClick={chip.onRemove}
              aria-label={`Remove filter: ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X size={12} aria-hidden />
            </button>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <DetailEmpty kind="empty-table" category={category} />
      ) : visible.length === 0 ? (
        <DetailEmpty kind="no-results" query={debounced} />
      ) : (
        <div className="resources-list-wrap">
          <List
            rowComponent={PickerRow}
            rowCount={visible.length}
            rowHeight={ROW_HEIGHT}
            rowProps={{ rows: visible, selectedId, onSelect: handleSelect }}
            className="resources-list"
            aria-label={`${category} list`}
          />
        </div>
      )}
    </div>
  )
}
