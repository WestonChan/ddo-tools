import type { JSX } from 'react'
import type { RowComponentProps } from 'react-window'
import type { ItemRow } from '../queries/items'

// Per-row props that we (the caller) supply via `<List rowProps={...}>`.
// react-window injects the rest (`index`, `style`, `ariaAttributes`).
export interface PickerRowOwnProps {
  rows: ItemRow[]
  selectedId: number | null
  onSelect: (row: ItemRow) => void
}

export function PickerRow(
  props: RowComponentProps<PickerRowOwnProps>,
): JSX.Element | null {
  const { index, style, ariaAttributes, rows, selectedId, onSelect } = props
  const row = rows[index]
  if (!row) return null
  const active = row.id === selectedId
  const isRare = row.rarity === 'Rare'
  return (
    <div
      {...ariaAttributes}
      aria-selected={active}
      style={style}
      className={`resources-row hoverable${active ? ' active' : ''}`}
      onClick={() => onSelect(row)}
    >
      <div className="resources-row-title">
        <span className="resources-row-name">{row.name}</span>
        {(row.is_raid || isRare) && (
          <span className="resources-row-chips">
            {row.is_raid && (
              <span className="resources-row-chip" data-kind="raid">
                Raid
              </span>
            )}
            {isRare && (
              <span className="resources-row-chip" data-kind="rare">
                Rare
              </span>
            )}
          </span>
        )}
      </div>
      <span className="resources-row-meta">
        {row.minimum_level !== null && <span>ML {row.minimum_level}</span>}
        {row.equipment_slot && <span>{row.equipment_slot}</span>}
        {row.pack && <span>{row.pack}</span>}
      </span>
    </div>
  )
}
