import { useEffect, useId, useRef, type JSX, type KeyboardEvent } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useNavigate } from '@tanstack/react-router'
import type { PlaceholderAbility } from '../data/placeholderAbilities'
import type { HotbarSlotAddress } from '../hotbars'
import { AbilityCode } from './AbilityCode'
import { AbilityDetailCard } from './AbilityDetailCard'
import { useHoverCard } from '../../../components'
import {
  hotbarSlotDragId,
  type HotbarDragPayload,
  type HotbarDropPayload,
} from './hotbarDragPayloads'
import './HotbarSlot.css'

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
  const hoverAnchor = useHoverCard({
    kind: 'ability',
    delayMs: 260,
    render: () => <AbilityDetailCard ability={ability} />,
  })
  const lastPointerTypeRef = useRef<string | null>(null)
  const slotNumber = slot.slotIndex + 1

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
        aria-describedby={`${attributes['aria-describedby'] ?? ''} ${statBlockId}`}
        onKeyDown={(event) => {
          hoverAnchor.onKeyDown(event)
          clearOnDeleteKey(event)
        }}
        onKeyUp={(event) => {
          if (event.key === ' ') event.preventDefault()
        }}
        onPointerDown={(event) => {
          lastPointerTypeRef.current = event.pointerType
          listeners?.onPointerDown?.(event)
        }}
        onMouseEnter={(event) => {
          if (active === null) hoverAnchor.onMouseEnter(event)
        }}
        onMouseLeave={hoverAnchor.onMouseLeave}
        onFocus={hoverAnchor.onFocus}
        onBlur={hoverAnchor.onBlur}
        onClick={() => void navigate({ to: '/damage-calc' })}
        onContextMenu={(event) => {
          event.preventDefault()
          if (lastPointerTypeRef.current === 'mouse') onClear(slot)
        }}
      >
        <AbilityCode ability={ability} />
        <span className="hotbar-slot-number num">{slotNumber}</span>
      </button>
      <div id={statBlockId} className="sr-only">
        {ability.name} Type {ability.kind} Cooldown {ability.cooldown} Save {ability.save} Damage{' '}
        {ability.damage} Cost {ability.cost}
      </div>
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
