import { useEffect, useId, useRef, type CSSProperties, type JSX, type ReactNode } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical, Pin, TriangleAlert } from 'lucide-react'
import type { PlaceholderStat } from '../data/placeholderStats'

interface StatGripProps {
  statName: string
  title: string
  activatorRef: (element: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
}

export function StatGrip({
  statName,
  title,
  activatorRef,
  attributes,
  listeners,
}: StatGripProps): JSX.Element {
  return (
    <button
      type="button"
      ref={activatorRef}
      className="stats-panel-grip"
      {...attributes}
      {...listeners}
      aria-label={`Move ${statName}`}
      title={title}
    >
      <GripVertical size={12} />
    </button>
  )
}

export interface StatRowPinButton {
  isPinned: boolean
  title: string
  onClick: () => void
  shouldTakeFocus: boolean
  onFocusTaken: () => void
}

function overriddenBonusCountOf(stat: PlaceholderStat): number {
  return stat.bonuses?.filter((bonus) => bonus.isOverridden).length ?? 0
}

function overriddenBonusTitle(count: number): string {
  return count === 1 ? '1 overridden bonus' : `${count} overridden bonuses`
}

interface StatBreakdownProps {
  id: string
  stat: PlaceholderStat
}

function StatBreakdown({ id, stat }: StatBreakdownProps): JSX.Element {
  return (
    <ul id={id} className="stats-panel-breakdown" aria-label={`${stat.name} bonuses`}>
      {stat.bonuses ? (
        stat.bonuses.map((bonus, index) => (
          <li
            key={index}
            className={`stats-panel-ledger-row${bonus.isOverridden ? ' stats-panel-ledger-row--overridden' : ''}${bonus.isUnfilled ? ' stats-panel-ledger-row--unfilled' : ''}`}
          >
            <span className="stats-panel-ledger-type">
              {bonus.isOverridden ? `↳ ${bonus.bonusType}` : bonus.bonusType}
            </span>
            <span className="stats-panel-ledger-detail">{bonus.source}</span>
            <span className="stats-panel-ledger-value num">{bonus.value}</span>
          </li>
        ))
      ) : (
        <li className="stats-panel-ledger-row stats-panel-ledger-row--note">
          Breakdown by bonus type · wired in Phase 6
        </li>
      )}
    </ul>
  )
}

interface StatRowProps {
  stat: PlaceholderStat
  isExpanded: boolean
  onToggleExpanded: () => void
  grip: ReactNode
  pinButton: StatRowPinButton
  rowRef: (element: HTMLElement | null) => void
  rowStyle?: CSSProperties
  rowModifierClassNames?: string
}

export function StatRow({
  stat,
  isExpanded,
  onToggleExpanded,
  grip,
  pinButton,
  rowRef,
  rowStyle,
  rowModifierClassNames = '',
}: StatRowProps): JSX.Element {
  const breakdownId = useId()
  const overriddenCount = overriddenBonusCountOf(stat)
  const pinButtonRef = useRef<HTMLButtonElement>(null)
  const { shouldTakeFocus: shouldPinButtonTakeFocus, onFocusTaken: onPinButtonFocusTaken } =
    pinButton

  useEffect(() => {
    if (!shouldPinButtonTakeFocus) return
    pinButtonRef.current?.focus()
    onPinButtonFocusTaken()
  }, [shouldPinButtonTakeFocus, onPinButtonFocusTaken])
  return (
    <li
      ref={rowRef}
      style={rowStyle}
      className={`stats-panel-stat ${rowModifierClassNames}`.trim()}
    >
      <div className="stats-panel-row">
        {grip}
        <button
          ref={pinButtonRef}
          type="button"
          className={`stats-panel-pin${pinButton.isPinned ? ' stats-panel-pin--pinned' : ''}`}
          aria-label={`${pinButton.isPinned ? 'Unpin' : 'Pin'} ${stat.name}`}
          title={pinButton.title}
          onClick={pinButton.onClick}
        >
          <Pin size={12} />
        </button>
        <button
          type="button"
          className="stats-panel-row-toggle focus-ring-proxy"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? breakdownId : undefined}
          onClick={onToggleExpanded}
        >
          <span className="stats-panel-stat-name">{stat.name}</span>
          <span className="stats-panel-stat-value num">{stat.value}</span>
          {overriddenCount > 0 ? (
            <span
              className="stats-panel-stat-warning"
              role="img"
              aria-label={overriddenBonusTitle(overriddenCount)}
              title={overriddenBonusTitle(overriddenCount)}
            >
              <TriangleAlert size={12} />
            </span>
          ) : (
            <span className="stats-panel-stat-warning" />
          )}
        </button>
      </div>
      {isExpanded && <StatBreakdown id={breakdownId} stat={stat} />}
    </li>
  )
}

interface StatDragGhostProps {
  stat: PlaceholderStat
}

export function StatDragGhost({ stat }: StatDragGhostProps): JSX.Element {
  return (
    <div className="stats-panel-drag-ghost">
      <GripVertical size={12} />
      <span className="stats-panel-stat-name">{stat.name}</span>
      <span className="stats-panel-stat-value num">{stat.value}</span>
    </div>
  )
}
