import { useState, type JSX, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, Circle, CircleCheck, Search } from 'lucide-react'
import {
  ITEMS_WITH_ACTIVE_ABILITY_COUNT,
  PLACEHOLDER_CLICKY_ITEMS,
  type PlaceholderClickyItem,
} from '../data/placeholderClickyItems'
import './ClickyItemPicker.css'

const UNWIRED_FILTER_TITLE = 'Arrives with Phase 12'

function formattedCount(count: number): string {
  return count.toLocaleString('en-US')
}

function itemsToShow(isOwnedOnly: boolean, searchQuery: string): PlaceholderClickyItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  return PLACEHOLDER_CLICKY_ITEMS.filter(
    (item) =>
      (!isOwnedOnly || item.isOwned) &&
      (normalizedQuery === '' ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.clickyName.toLowerCase().includes(normalizedQuery)),
  ).sort((first, second) => first.name.localeCompare(second.name))
}

interface FilterChipProps {
  isSelected: boolean
  children: ReactNode
  title?: string
  onClick?: () => void
  isPressable?: boolean
}

function FilterChip({
  isSelected,
  children,
  title,
  onClick,
  isPressable = false,
}: FilterChipProps): JSX.Element {
  return (
    <button
      type="button"
      className={`filter-chip${isSelected ? ' filter-chip--selected' : ''}`}
      aria-pressed={isPressable ? isSelected : undefined}
      aria-disabled={onClick ? undefined : true}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function UnwiredFilterChip({
  label,
  isSelected = false,
}: {
  label: string
  isSelected?: boolean
}): JSX.Element {
  return (
    <FilterChip isSelected={isSelected} title={UNWIRED_FILTER_TITLE}>
      {label}
      <span className="clicky-picker-filter-chip-icon">
        <ChevronDown size={12} aria-hidden />
      </span>
    </FilterChip>
  )
}

interface ClickyItemRowProps {
  item: PlaceholderClickyItem
  isAdded: boolean
  isSelected: boolean
  onSelect: () => void
  onAdd: () => void
  onRemove: () => void
}

function ClickyItemRow({
  item,
  isAdded,
  isSelected,
  onSelect,
  onAdd,
  onRemove,
}: ClickyItemRowProps): JSX.Element {
  const nameModifierClassName = isSelected
    ? 'clicky-picker-item-name--selected'
    : item.isOwned
      ? 'clicky-picker-item-name--owned'
      : ''
  return (
    <tr
      className={`clicky-picker-row${isSelected ? ' clicky-picker-row--selected' : ''}`}
      aria-current={isSelected || undefined}
      onClick={onSelect}
      onFocus={onSelect}
    >
      <td>
        <span className="clicky-picker-item">
          <span className={`clicky-picker-item-name ${nameModifierClassName}`.trim()}>
            {item.name}
          </span>
          {isAdded && (
            <span className="clicky-picker-added-mark" role="img" aria-label="Added">
              <CircleCheck size={12} aria-hidden />
            </span>
          )}
        </span>
      </td>
      <td className="clicky-picker-cell--ability">{item.clickyName}</td>
      <td className="clicky-picker-cell--uses num">{item.uses}</td>
      <td className="clicky-picker-cell--level num">{item.minimumLevel}</td>
      <td className="clicky-picker-cell--slot">{item.slot}</td>
      <td className="clicky-picker-cell--action">
        {isAdded ? (
          <button
            type="button"
            className="btn-ghost-sm"
            aria-label={`Remove ${item.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary-sm"
            aria-label={`Add ${item.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onAdd()
            }}
          >
            Add
          </button>
        )}
      </td>
    </tr>
  )
}

interface ClickyItemPickerProps {
  id: string
  addedItemIds: readonly string[]
  onAddItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
  onDone: () => void
}

export function ClickyItemPicker({
  id,
  addedItemIds,
  onAddItem,
  onRemoveItem,
  onDone,
}: ClickyItemPickerProps): JSX.Element {
  const [isOwnedOnly, setIsOwnedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const shownItems = itemsToShow(isOwnedOnly, searchQuery)
  const hiddenItemCount = ITEMS_WITH_ACTIVE_ABILITY_COUNT - shownItems.length

  function clearSearchOrClose(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Escape') return
    event.preventDefault()
    if (searchQuery) setSearchQuery('')
    else onDone()
  }

  return (
    <section id={id} className="clicky-picker" aria-label="Item clicky picker">
      <div className="clicky-picker-filters">
        <UnwiredFilterChip label="Slot: any" />
        <UnwiredFilterChip label="Ability: any" />
        <UnwiredFilterChip label="ML ≤ 32" isSelected />
        <span className="clicky-picker-filter-divider" aria-hidden />
        <FilterChip
          isSelected={isOwnedOnly}
          isPressable
          onClick={() => setIsOwnedOnly((isOn) => !isOn)}
        >
          Content you own
          <span className="clicky-picker-filter-chip-icon">
            {isOwnedOnly ? <CircleCheck size={12} aria-hidden /> : <Circle size={12} aria-hidden />}
          </span>
        </FilterChip>
        <span className="clicky-picker-count num" aria-live="polite">
          {shownItems.length} of {formattedCount(ITEMS_WITH_ACTIVE_ABILITY_COUNT)}
        </span>
      </div>

      <label className="search-well focus-ring-proxy focus-ring-proxy--container">
        <Search size={14} aria-hidden />
        <input
          type="search"
          className="search-well-input"
          placeholder="Search items with an active ability…"
          aria-label="Search items with an active ability"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={clearSearchOrClose}
        />
        <kbd className="clicky-picker-search-hint" aria-hidden>
          esc
        </kbd>
      </label>

      <div className="clicky-picker-table-frame">
        <table className="clicky-picker-table">
          <thead>
            <tr>
              <th className="section-label">Item</th>
              <th className="section-label clicky-picker-cell--ability">Ability</th>
              <th className="section-label clicky-picker-cell--uses">Uses</th>
              <th className="section-label clicky-picker-cell--level">ML</th>
              <th className="section-label clicky-picker-cell--slot">Slot</th>
              <th className="clicky-picker-cell--action" aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {shownItems.map((item) => (
              <ClickyItemRow
                key={item.id}
                item={item}
                isAdded={addedItemIds.includes(item.id)}
                isSelected={selectedItemId === item.id}
                onSelect={() => setSelectedItemId(item.id)}
                onAdd={() => onAddItem(item.id)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </tbody>
        </table>
        <div className="clicky-picker-more num">↓ {formattedCount(hiddenItemCount)} more</div>
      </div>

      <div className="clicky-picker-footer">
        <span className="clicky-picker-footer-note">
          {addedItemIds.length > 0
            ? `${addedItemIds.length} added under Item clickies — drag them onto a bar.`
            : 'Added items appear under Item clickies and can be dragged onto a bar.'}
        </span>
        <button type="button" className="btn-ghost-sm" onClick={onDone}>
          Done
        </button>
      </div>
    </section>
  )
}
