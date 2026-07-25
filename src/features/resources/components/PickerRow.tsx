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
  // The outer div keeps react-window's absolute-positioning `style` and its
  // injected role/aria-posinset. The interactive surface is a real <button>
  // filling it, which buys focusability, Enter/Space activation, and correct
  // screen-reader semantics for free — a div with onClick gave keyboard users
  // no way to open an item at all.
  //
  // Selection uses `aria-current` rather than `aria-selected`: the latter is
  // only valid on option/tab/row-style roles, and react-window injects
  // `role="listitem"`.
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
      </button>
    </div>
  )
}
