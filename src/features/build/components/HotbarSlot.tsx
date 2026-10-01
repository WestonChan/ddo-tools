import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
} from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useNavigate } from '@tanstack/react-router'
import type { PlaceholderAbility } from '../data/placeholderAbilities'
import type { HotbarSlotAddress } from '../hotbars'
import { AbilityCode } from './AbilityCode'
import {
  hotbarSlotDragId,
  type HotbarDragPayload,
  type HotbarDropPayload,
} from './hotbarDragPayloads'
import './HotbarSlot.css'

type StatBlockPlacement = 'above' | 'below'

interface StatBlockPosition {
  placement: StatBlockPlacement
  roomToBarsLeftPx: number
  roomToBarsRightPx: number
}

const ROOM_ABOVE_FOR_STAT_BLOCK_PX = 180

interface AbilityStatBlockProps {
  id: string
  ability: PlaceholderAbility
  position: StatBlockPosition
}

function AbilityStatBlock({ id, ability, position }: AbilityStatBlockProps): JSX.Element {
  const rows: readonly [string, string][] = [
    ['Type', ability.kind],
    ['Cooldown', ability.cooldown],
    ['Save', ability.save],
    ['Damage', ability.damage],
    ['Cost', ability.cost],
  ]
  return (
    <div
      id={id}
      role="tooltip"
      className={`hotbar-stat-block hotbar-stat-block--${position.placement}`}
      style={
        {
          '--room-to-bars-left': `${position.roomToBarsLeftPx}px`,
          '--room-to-bars-right': `${position.roomToBarsRightPx}px`,
        } as CSSProperties
      }
    >
      <div className="hotbar-stat-block-name">{ability.name}</div>
      <dl className="hotbar-stat-block-rows">
        {rows.map(([rowLabel, rowValue]) => (
          <div key={rowLabel} className="hotbar-stat-block-row">
            <dt>{rowLabel}</dt>
            <dd className="num">{rowValue}</dd>
          </div>
        ))}
      </dl>
      <p className="hotbar-stat-block-footer">Click → full breakdown in Damage calc</p>
    </div>
  )
}

function statBlockPositionBeside(slotElement: HTMLElement): StatBlockPosition {
  const slotRect = slotElement.getBoundingClientRect()
  const barsRect = (slotElement.closest('.hotbars-bars') ?? slotElement).getBoundingClientRect()
  return {
    placement: slotRect.top < ROOM_ABOVE_FOR_STAT_BLOCK_PX ? 'below' : 'above',
    roomToBarsLeftPx: barsRect.left - slotRect.left,
    roomToBarsRightPx: barsRect.right - slotRect.left,
  }
}

interface SlotFocusRequest {
  shouldTakeFocus: boolean
  onFocusTaken: () => void
}

interface FilledHotbarSlotProps extends SlotFocusRequest {
  slot: HotbarSlotAddress
  ability: PlaceholderAbility
  onClear: (slot: HotbarSlotAddress) => void
}

function FilledHotbarSlot({
  slot,
  ability,
  onClear,
  shouldTakeFocus,
  onFocusTaken,
}: FilledHotbarSlotProps): JSX.Element {
  const dragPayload: HotbarDragPayload = {
    dragSource: { kind: 'slot', slot },
    abilityId: ability.id,
  }
  const { attributes, listeners, setNodeRef, isDragging, active } = useDraggable({
    id: hotbarSlotDragId(slot),
    data: dragPayload,
  })
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const navigate = useNavigate()
  const statBlockId = useId()
  const [statBlockPosition, setStatBlockPosition] = useState<StatBlockPosition | null>(null)
  const lastPointerTypeRef = useRef<string | null>(null)
  const isStatBlockShown = statBlockPosition !== null && active === null
  const slotNumber = slot.slotIndex + 1

  useEffect(() => {
    if (!isStatBlockShown) return
    function hideStatBlockOnEscape(event: globalThis.KeyboardEvent): void {
      if (event.key === 'Escape') setStatBlockPosition(null)
    }
    document.addEventListener('keydown', hideStatBlockOnEscape)
    return () => document.removeEventListener('keydown', hideStatBlockOnEscape)
  }, [isStatBlockShown])

  useEffect(() => {
    if (!shouldTakeFocus) return
    buttonRef.current?.focus()
    onFocusTaken()
  }, [shouldTakeFocus, onFocusTaken])

  function setButtonNodeRef(element: HTMLButtonElement | null): void {
    buttonRef.current = element
    setNodeRef(element)
  }

  function clearOnDeleteKey(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onClear(slot)
      return
    }
    listeners?.onKeyDown?.(event)
  }

  return (
    <>
      <button
        ref={setButtonNodeRef}
        type="button"
        className={`hotbar-slot-button${isDragging ? ' hotbar-slot-button--drag-source' : ''}`}
        {...attributes}
        {...listeners}
        aria-label={`Slot ${slotNumber}: ${ability.name}`}
        aria-describedby={
          isStatBlockShown
            ? `${statBlockId} ${attributes['aria-describedby']}`
            : attributes['aria-describedby']
        }
        onKeyDown={clearOnDeleteKey}
        onKeyUp={(event) => {
          if (event.key === ' ') event.preventDefault()
        }}
        onPointerDown={(event) => {
          lastPointerTypeRef.current = event.pointerType
          listeners?.onPointerDown?.(event)
        }}
        onMouseEnter={(event) => setStatBlockPosition(statBlockPositionBeside(event.currentTarget))}
        onMouseLeave={() => setStatBlockPosition(null)}
        onFocus={(event) => setStatBlockPosition(statBlockPositionBeside(event.currentTarget))}
        onBlur={() => setStatBlockPosition(null)}
        onClick={() => void navigate({ to: '/damage-calc' })}
        onContextMenu={(event) => {
          event.preventDefault()
          if (lastPointerTypeRef.current === 'mouse') onClear(slot)
        }}
      >
        <AbilityCode ability={ability} />
        <span className="hotbar-slot-number num">{slotNumber}</span>
      </button>
      {isStatBlockShown && (
        <AbilityStatBlock id={statBlockId} ability={ability} position={statBlockPosition} />
      )}
    </>
  )
}

interface HotbarSlotProps extends SlotFocusRequest {
  slot: HotbarSlotAddress
  ability: PlaceholderAbility | null
  onClear: (slot: HotbarSlotAddress) => void
}

export function HotbarSlot({
  slot,
  ability,
  onClear,
  shouldTakeFocus,
  onFocusTaken,
}: HotbarSlotProps): JSX.Element {
  const dropPayload: HotbarDropPayload = { dropTarget: { kind: 'slot', slot } }
  const { setNodeRef, isOver } = useDroppable({ id: hotbarSlotDragId(slot), data: dropPayload })
  const slotNumber = slot.slotIndex + 1
  const modifierClassNames = [
    ability ? 'hotbar-slot--filled' : 'hotbar-slot--empty',
    isOver && 'hotbar-slot--drop-target',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <li
      ref={setNodeRef}
      className={`hotbar-slot ${modifierClassNames}`}
      aria-label={ability ? undefined : `Slot ${slotNumber}: empty`}
    >
      {ability ? (
        <FilledHotbarSlot
          slot={slot}
          ability={ability}
          onClear={onClear}
          shouldTakeFocus={shouldTakeFocus}
          onFocusTaken={onFocusTaken}
        />
      ) : (
        <span className="hotbar-slot-number num" aria-hidden>
          {slotNumber}
        </span>
      )}
    </li>
  )
}

interface HotbarSlotGhostProps {
  ability: PlaceholderAbility
}

export function HotbarSlotGhost({ ability }: HotbarSlotGhostProps): JSX.Element {
  return (
    <div className="hotbar-slot hotbar-slot--filled hotbar-slot--ghost">
      <AbilityCode ability={ability} />
    </div>
  )
}
