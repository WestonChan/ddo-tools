import type { JSX } from 'react'
import type { RowComponentProps } from 'react-window'
import { DropTagChip } from './DropTagChip'
import type { ItemSummary } from '../queries/items'

const EMPTY_CELL = '—'

export interface ItemPickerRowProps {
  items: ItemSummary[]
  selectedItemId: number | null
  onSelect: (row: ItemSummary) => void
}

export function ItemPickerRow(props: RowComponentProps<ItemPickerRowProps>): JSX.Element | null {
  const { index, style, ariaAttributes, items, selectedItemId, onSelect } = props
  const item = items[index]
  if (!item) return null
  const isSelected = item.id === selectedItemId
  return (
    <div {...ariaAttributes} style={style} className="resources-row-shell">
      <button
        type="button"
        className={`resources-row hoverable${isSelected ? ' active' : ''}`}
        aria-current={isSelected || undefined}
        onClick={() => onSelect(item)}
      >
        <span className="resources-list-column resources-list-column--name">
          <span className="resources-row-name">{item.name}</span>
          {item.isRaidLoot && <DropTagChip kind="raid" />}
          {item.isRareLoot && <DropTagChip kind="rare" />}
        </span>
        <span className="resources-list-column resources-list-column--level num">
          {item.minimumLevel ?? EMPTY_CELL}
        </span>
        <span className="resources-list-column resources-list-column--slot">
          {item.equipmentSlot}
        </span>
        <span className="resources-list-column resources-list-column--pack">
          {item.pack || EMPTY_CELL}
        </span>
      </button>
    </div>
  )
}
