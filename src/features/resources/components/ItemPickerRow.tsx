import type { JSX } from 'react'
import type { RowComponentProps } from 'react-window'
import { DropTagChip } from './DropTagChip'
import type { ItemSummary } from '../queries/items'

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
        <div className="resources-row-title">
          <span className="resources-row-name">{item.name}</span>
          {(item.isRaidLoot || item.isRareLoot) && (
            <span className="resources-row-chips">
              {item.isRaidLoot && <DropTagChip kind="raid" />}
              {item.isRareLoot && <DropTagChip kind="rare" />}
            </span>
          )}
        </div>
        <span className="resources-row-meta">
          {item.minimumLevel !== null && <span>ML {item.minimumLevel}</span>}
          <span>{item.equipmentSlot}</span>
          {item.pack && <span>{item.pack}</span>}
        </span>
      </button>
    </div>
  )
}
