import type { JSX } from 'react'
import type { RowComponentProps } from 'react-window'
import { ResourceChip } from './ResourceChip'
import type { ItemRow } from '../queries/items'

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
  return (
    <div {...ariaAttributes} style={style} className="resources-row-shell">
      <button
        type="button"
        className={`resources-row hoverable${active ? ' active' : ''}`}
        aria-current={active || undefined}
        onClick={() => onSelect(row)}
      >
        <div className="resources-row-title">
          <span className="resources-row-name">{row.name}</span>
          {(row.is_raid || row.is_rare) && (
            <span className="resources-row-chips">
              {row.is_raid && <ResourceChip kind="raid" />}
              {row.is_rare && <ResourceChip kind="rare" />}
            </span>
          )}
        </div>
        <span className="resources-row-meta">
          {row.minimum_level !== null && <span>ML {row.minimum_level}</span>}
          <span>{row.equipment_slot}</span>
          {row.pack && <span>{row.pack}</span>}
        </span>
      </button>
    </div>
  )
}
