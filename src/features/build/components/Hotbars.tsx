import { useMemo, useState, type JSX, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  KeyboardCode,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { Plus, X } from 'lucide-react'
import {
  DEFAULT_HOTBARS,
  PLACEHOLDER_ABILITIES,
  type PlaceholderAbility,
} from '../data/placeholderAbilities'
import {
  itemIdsWithItemAdded,
  itemIdsWithoutItem,
  PLACEHOLDER_CLICKY_ITEMS,
  toAddedClickyAbility,
} from '../data/placeholderClickyItems'
import {
  hotbarsWithAbilityDropped,
  hotbarsWithBarAdded,
  hotbarsWithLabel,
  hotbarsWithoutAbility,
  hotbarsWithoutBar,
  hotbarsWithSlotCleared,
  type Hotbar,
  type HotbarSlotAddress,
} from '../hotbars'
import { AbilityPools } from './AbilityPools'
import {
  dragPayloadOf,
  dropSlotOf,
  dropTargetOf,
  type HotbarDropPayload,
} from './hotbarDragPayloads'
import { hotbarDropCollisions } from './hotbarDropCollisions'
import { HotbarSlot, HotbarSlotGhost } from './HotbarSlot'
import './Hotbars.css'

const POINTER_DISTANCE_BEFORE_DRAG_PX = 4

const KEYBOARD_DRAG_CODES = {
  start: [KeyboardCode.Space],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab],
}

const ADDED_CLICKY_ABILITIES_BY_ITEM_ID = new Map(
  PLACEHOLDER_CLICKY_ITEMS.map((item) => [item.id, toAddedClickyAbility(item)]),
)

const ABILITIES_BY_ID = new Map(
  [...PLACEHOLDER_ABILITIES, ...ADDED_CLICKY_ABILITIES_BY_ITEM_ID.values()].map((ability) => [
    ability.id,
    ability,
  ]),
)

const centerGhostOnPointer: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  const pointerStart = activatorEvent ? getEventCoordinates(activatorEvent) : null
  if (!pointerStart || !draggingNodeRect) return transform
  return {
    ...transform,
    x: transform.x + pointerStart.x - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + pointerStart.y - draggingNodeRect.top - draggingNodeRect.height / 2,
  }
}

const DRAG_OVERLAY_MODIFIERS = [centerGhostOnPointer]

function barDisplayName(bar: Hotbar): string {
  return bar.label.trim() || 'Untitled'
}

function draggedAbilityOf(active: Active): PlaceholderAbility | undefined {
  const abilityId = dragPayloadOf(active)?.abilityId
  return abilityId ? ABILITIES_BY_ID.get(abilityId) : undefined
}

function hotbarDragAnnouncements(bars: readonly Hotbar[]): Announcements {
  function draggedName(active: Active): string {
    return draggedAbilityOf(active)?.name ?? String(active.id)
  }
  function slotDescription(slot: HotbarSlotAddress): string {
    const bar = bars.find((candidateBar) => candidateBar.id === slot.barId)
    return `slot ${slot.slotIndex + 1} of the ${bar ? barDisplayName(bar) : ''} bar`
  }
  function isFromSlot(active: Active): boolean {
    return dragPayloadOf(active)?.dragSource.kind === 'slot'
  }
  return {
    onDragStart: ({ active }) => `Picked up ${draggedName(active)}.`,
    onDragOver: ({ active, over }) => {
      const dropSlot = dropSlotOf(over)
      return dropSlot
        ? `${draggedName(active)} is over ${slotDescription(dropSlot)}.`
        : `${draggedName(active)} is not over a hotbar slot.`
    },
    onDragEnd: ({ active, over }) => {
      const dropSlot = dropSlotOf(over)
      if (dropSlot) return `${draggedName(active)} was placed in ${slotDescription(dropSlot)}.`
      if (dropTargetOf(over)) {
        return `${draggedName(active)} was released away from every slot and stayed where it was.`
      }
      return isFromSlot(active)
        ? `${draggedName(active)} was removed from the hotbars.`
        : `${draggedName(active)} was dropped outside the hotbars.`
    },
    onDragCancel: ({ active }) =>
      `Dragging was cancelled. ${draggedName(active)} stayed where it was.`,
  }
}

const HOTBARS_AREA_DROP_PAYLOAD: HotbarDropPayload = { dropTarget: { kind: 'hotbarsArea' } }

interface HotbarsAreaProps {
  isKeyboardDrag: boolean
  children: ReactNode
}

function HotbarsArea({ isKeyboardDrag, children }: HotbarsAreaProps): JSX.Element {
  const { setNodeRef } = useDroppable({
    id: 'hotbars-area',
    data: HOTBARS_AREA_DROP_PAYLOAD,
    disabled: isKeyboardDrag,
  })
  return (
    <section ref={setNodeRef} className="hotbars-bars" aria-label="Hotbars">
      {children}
    </section>
  )
}

interface HotbarRowProps {
  bar: Hotbar
  isKeyboardDrag: boolean
  isRemovable: boolean
  onRename: (label: string) => void
  onRemove: () => void
  onClearSlot: (slot: HotbarSlotAddress) => void
  slotIndexToFocus: number | null
  onSlotFocused: () => void
}

function HotbarRow({
  bar,
  isKeyboardDrag,
  isRemovable,
  onRename,
  onRemove,
  onClearSlot,
  slotIndexToFocus,
  onSlotFocused,
}: HotbarRowProps): JSX.Element {
  const displayName = barDisplayName(bar)
  const trayDropPayload: HotbarDropPayload = { dropTarget: { kind: 'tray', barId: bar.id } }
  const { setNodeRef: setTrayNodeRef } = useDroppable({
    id: `tray:${bar.id}`,
    data: trayDropPayload,
    disabled: isKeyboardDrag,
  })
  return (
    <div role="group" aria-label={displayName} className="hotbar-row">
      <input
        className="section-label hotbar-label"
        aria-label="Bar name"
        title="Rename this bar"
        spellCheck={false}
        value={bar.label}
        onChange={(event) => onRename(event.target.value)}
      />
      <ol ref={setTrayNodeRef} className="hotbar-slots">
        {bar.slots.map((abilityId, slotIndex) => (
          <HotbarSlot
            key={slotIndex}
            slot={{ barId: bar.id, slotIndex }}
            ability={abilityId ? (ABILITIES_BY_ID.get(abilityId) ?? null) : null}
            onClear={onClearSlot}
            shouldTakeFocus={slotIndex === slotIndexToFocus}
            onFocusTaken={onSlotFocused}
          />
        ))}
      </ol>
      {isRemovable && (
        <button
          type="button"
          className="hotbar-remove"
          aria-label={`Remove ${displayName} bar`}
          title="Remove bar"
          onClick={onRemove}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}

export function Hotbars(): JSX.Element {
  const [bars, setBars] = useState<readonly Hotbar[]>(DEFAULT_HOTBARS)
  const [addedItemIds, setAddedItemIds] = useState<readonly string[]>([])
  const [draggedAbilityId, setDraggedAbilityId] = useState<string | null>(null)
  const [isKeyboardDrag, setIsKeyboardDrag] = useState(false)
  const [slotToFocus, setSlotToFocus] = useState<HotbarSlotAddress | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_DISTANCE_BEFORE_DRAG_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: KEYBOARD_DRAG_CODES,
    }),
  )
  const announcements = useMemo(() => hotbarDragAnnouncements(bars), [bars])

  const addedClickyAbilities = addedItemIds.flatMap(
    (itemId) => ADDED_CLICKY_ABILITIES_BY_ITEM_ID.get(itemId) ?? [],
  )
  const draggedAbility = draggedAbilityId ? ABILITIES_BY_ID.get(draggedAbilityId) : undefined

  function clearSlot(slot: HotbarSlotAddress): void {
    setBars((currentBars) => hotbarsWithSlotCleared(currentBars, slot))
  }

  function addClickyItem(itemId: string): void {
    setAddedItemIds((itemIds) => itemIdsWithItemAdded(itemIds, itemId))
  }

  function removeClickyItem(itemId: string): void {
    setAddedItemIds((itemIds) => itemIdsWithoutItem(itemIds, itemId))
    const removedAbility = ADDED_CLICKY_ABILITIES_BY_ITEM_ID.get(itemId)
    if (removedAbility) {
      setBars((currentBars) => hotbarsWithoutAbility(currentBars, removedAbility.id))
    }
  }

  function startAbilityDrag({ active, activatorEvent }: DragStartEvent): void {
    setDraggedAbilityId(dragPayloadOf(active)?.abilityId ?? null)
    setIsKeyboardDrag(activatorEvent instanceof KeyboardEvent)
  }

  function endAbilityDrag(): void {
    setDraggedAbilityId(null)
    setIsKeyboardDrag(false)
  }

  function dropDraggedAbility({ active, over, activatorEvent }: DragEndEvent): void {
    const dragPayload = dragPayloadOf(active)
    const dropSlot = dropSlotOf(over)
    const isReleasedOnHotbarsAwayFromSlots = dropSlot === null && dropTargetOf(over) !== null
    if (dragPayload && !isReleasedOnHotbarsAwayFromSlots) {
      setBars((currentBars) =>
        hotbarsWithAbilityDropped(currentBars, dragPayload.dragSource, dropSlot),
      )
    }
    if (dragPayload?.dragSource.kind === 'slot' && activatorEvent instanceof KeyboardEvent) {
      setSlotToFocus(dropSlot)
    }
    endAbilityDrag()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={hotbarDropCollisions}
      accessibility={{ announcements }}
      onDragStart={startAbilityDrag}
      onDragEnd={dropDraggedAbility}
      onDragCancel={endAbilityDrag}
    >
      <div className="hotbars">
        <HotbarsArea isKeyboardDrag={isKeyboardDrag}>
          {bars.map((bar) => (
            <HotbarRow
              key={bar.id}
              bar={bar}
              isKeyboardDrag={isKeyboardDrag}
              isRemovable={bars.length > 1}
              onRename={(label) =>
                setBars((currentBars) => hotbarsWithLabel(currentBars, bar.id, label))
              }
              onRemove={() => setBars((currentBars) => hotbarsWithoutBar(currentBars, bar.id))}
              onClearSlot={clearSlot}
              slotIndexToFocus={slotToFocus?.barId === bar.id ? slotToFocus.slotIndex : null}
              onSlotFocused={() => setSlotToFocus(null)}
            />
          ))}
          <div className="hotbar-row hotbar-row--add">
            <button
              type="button"
              className="hotbars-add-bar"
              onClick={() => setBars(hotbarsWithBarAdded)}
            >
              <Plus size={14} aria-hidden />
              Add hotbar
            </button>
          </div>
        </HotbarsArea>

        <AbilityPools
          addedClickyAbilities={addedClickyAbilities}
          addedItemIds={addedItemIds}
          onAddItem={addClickyItem}
          onRemoveItem={removeClickyItem}
        />
      </div>

      <DragOverlay
        className="hotbars-drag-overlay"
        dropAnimation={null}
        modifiers={DRAG_OVERLAY_MODIFIERS}
      >
        {draggedAbility && <HotbarSlotGhost ability={draggedAbility} />}
      </DragOverlay>
    </DndContext>
  )
}
