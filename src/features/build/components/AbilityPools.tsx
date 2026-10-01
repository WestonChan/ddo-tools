import { useCallback, useId, useRef, useState, type JSX, type ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import {
  ABILITY_POOL_GROUPS,
  ITEM_CLICKY_ABILITY_IDS,
  PLACEHOLDER_ABILITIES,
  type PlaceholderAbility,
} from '../data/placeholderAbilities'
import { AbilityCode } from './AbilityCode'
import { ClickyItemPicker } from './ClickyItemPicker'
import { poolAbilityDragId, type HotbarDragPayload } from './hotbarDragPayloads'
import './AbilityPools.css'

const CATALOG_ABILITIES_BY_ID = new Map(
  PLACEHOLDER_ABILITIES.map((ability) => [ability.id, ability]),
)

function catalogAbilities(abilityIds: readonly string[]): PlaceholderAbility[] {
  return abilityIds.flatMap((abilityId) => CATALOG_ABILITIES_BY_ID.get(abilityId) ?? [])
}

interface AbilityChipFaceProps {
  ability: PlaceholderAbility
  kindId: string
}

function AbilityChipFace({ ability, kindId }: AbilityChipFaceProps): JSX.Element {
  const isAwaitingSwap = ability.isEquipped === false
  return (
    <>
      <span className="ability-chip-badge">
        <AbilityCode ability={ability} />
      </span>
      <span className="ability-chip-text">
        <span
          className={`ability-chip-name${isAwaitingSwap ? ' ability-chip-name--unequipped' : ''}`}
        >
          {ability.name}
        </span>
        <span
          id={kindId}
          className={`ability-chip-kind${isAwaitingSwap ? ' ability-chip-kind--unequipped' : ''}`}
        >
          {ability.kind}
        </span>
      </span>
    </>
  )
}

interface AbilityPoolChipProps {
  ability: PlaceholderAbility
}

function AbilityPoolChip({ ability }: AbilityPoolChipProps): JSX.Element {
  const dragId = poolAbilityDragId(ability.id)
  const dragPayload: HotbarDragPayload = {
    dragSource: { kind: 'pool', abilityId: ability.id },
    abilityId: ability.id,
  }
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    isDragging,
  } = useDraggable({ id: dragId, data: dragPayload })
  const { setNodeRef: setKeyboardAnchorNodeRef } = useDroppable({ id: dragId, disabled: true })
  const setChipNodeRef = useCallback(
    (element: HTMLElement | null) => {
      setDraggableNodeRef(element)
      setKeyboardAnchorNodeRef(element)
    },
    [setDraggableNodeRef, setKeyboardAnchorNodeRef],
  )
  const kindId = useId()
  return (
    <button
      ref={setChipNodeRef}
      type="button"
      className={`ability-chip${isDragging ? ' ability-chip--drag-source' : ''}`}
      {...attributes}
      {...listeners}
      aria-label={ability.name}
      aria-describedby={`${kindId} ${attributes['aria-describedby']}`}
      title="Drag onto a hotbar slot"
    >
      <AbilityChipFace ability={ability} kindId={kindId} />
    </button>
  )
}

interface AbilityPoolGroupProps {
  name: string
  abilities: readonly PlaceholderAbility[]
  trailingChip?: ReactNode
  children?: ReactNode
}

function AbilityPoolGroup({
  name,
  abilities,
  trailingChip,
  children,
}: AbilityPoolGroupProps): JSX.Element {
  const headingId = useId()
  return (
    <div role="group" aria-labelledby={headingId} className="ability-pool-group">
      <h3 id={headingId} className="section-label">
        {name} — drag onto a slot
      </h3>
      <div className="ability-pool-chips">
        {abilities.map((ability) => (
          <AbilityPoolChip key={ability.id} ability={ability} />
        ))}
        {trailingChip}
      </div>
      {children}
    </div>
  )
}

interface AbilityPoolsProps {
  addedClickyAbilities: readonly PlaceholderAbility[]
  addedItemIds: readonly string[]
  onAddItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
}

export function AbilityPools({
  addedClickyAbilities,
  addedItemIds,
  onAddItem,
  onRemoveItem,
}: AbilityPoolsProps): JSX.Element {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const pickerToggleRef = useRef<HTMLButtonElement>(null)
  const pickerId = useId()

  function closePicker(): void {
    setIsPickerOpen(false)
    pickerToggleRef.current?.focus()
  }

  const addItemChip = (
    <button
      ref={pickerToggleRef}
      type="button"
      className={`ability-chip-add${isPickerOpen ? ' ability-chip-add--open' : ''}`}
      aria-expanded={isPickerOpen}
      aria-controls={isPickerOpen ? pickerId : undefined}
      title="Search any item with an active ability"
      onClick={() => setIsPickerOpen((isOpen) => !isOpen)}
    >
      <Plus size={12} aria-hidden />
      Add item…
    </button>
  )

  return (
    <section className="ability-pools" aria-label="Ability pools">
      {ABILITY_POOL_GROUPS.map((group) => (
        <AbilityPoolGroup
          key={group.name}
          name={group.name}
          abilities={catalogAbilities(group.abilityIds)}
        />
      ))}
      <AbilityPoolGroup
        name="Item clickies"
        abilities={[...catalogAbilities(ITEM_CLICKY_ABILITY_IDS), ...addedClickyAbilities]}
        trailingChip={addItemChip}
      >
        {isPickerOpen && (
          <ClickyItemPicker
            id={pickerId}
            addedItemIds={addedItemIds}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onDone={closePicker}
          />
        )}
      </AbilityPoolGroup>
    </section>
  )
}
