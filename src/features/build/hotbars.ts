export const HOTBAR_SLOT_COUNT = 10

export interface Hotbar {
  id: string
  label: string
  slots: readonly (string | null)[]
}

export interface HotbarSlotAddress {
  barId: string
  slotIndex: number
}

export type HotbarDragSource =
  | { kind: 'pool'; abilityId: string }
  | { kind: 'slot'; slot: HotbarSlotAddress }

const BAR_ID_PREFIX = 'bar-'
const BAR_LABEL_PREFIX = 'Bar '

export function hotbarSlotsFilledFromStart(abilityIds: readonly string[]): (string | null)[] {
  return Array.from({ length: HOTBAR_SLOT_COUNT }, (_, slotIndex) => abilityIds[slotIndex] ?? null)
}

function isSlotOnBars(bars: readonly Hotbar[], slot: HotbarSlotAddress): boolean {
  return (
    Number.isInteger(slot.slotIndex) &&
    slot.slotIndex >= 0 &&
    slot.slotIndex < HOTBAR_SLOT_COUNT &&
    bars.some((bar) => bar.id === slot.barId)
  )
}

function abilityIdInSlot(bars: readonly Hotbar[], slot: HotbarSlotAddress): string | null {
  return bars.find((bar) => bar.id === slot.barId)?.slots[slot.slotIndex] ?? null
}

function hotbarsWithSlotContent(
  bars: readonly Hotbar[],
  slot: HotbarSlotAddress,
  abilityId: string | null,
): Hotbar[] {
  if (!isSlotOnBars(bars, slot)) return [...bars]
  return bars.map((bar) =>
    bar.id === slot.barId
      ? {
          ...bar,
          slots: bar.slots.map((slotted, slotIndex) =>
            slotIndex === slot.slotIndex ? abilityId : slotted,
          ),
        }
      : bar,
  )
}

export function hotbarsWithAbilityPlaced(
  bars: readonly Hotbar[],
  slot: HotbarSlotAddress,
  abilityId: string,
): Hotbar[] {
  return hotbarsWithSlotContent(bars, slot, abilityId)
}

export function hotbarsWithSlotCleared(bars: readonly Hotbar[], slot: HotbarSlotAddress): Hotbar[] {
  return hotbarsWithSlotContent(bars, slot, null)
}

function isSameSlot(first: HotbarSlotAddress, second: HotbarSlotAddress): boolean {
  return first.barId === second.barId && first.slotIndex === second.slotIndex
}

export function hotbarsWithAbilityMoved(
  bars: readonly Hotbar[],
  fromSlot: HotbarSlotAddress,
  toSlot: HotbarSlotAddress,
): Hotbar[] {
  const movedAbilityId = abilityIdInSlot(bars, fromSlot)
  if (movedAbilityId === null || isSameSlot(fromSlot, toSlot) || !isSlotOnBars(bars, toSlot)) {
    return [...bars]
  }
  return hotbarsWithAbilityPlaced(hotbarsWithSlotCleared(bars, fromSlot), toSlot, movedAbilityId)
}

export function hotbarsWithAbilityDropped(
  bars: readonly Hotbar[],
  dragSource: HotbarDragSource,
  dropSlot: HotbarSlotAddress | null,
): Hotbar[] {
  if (dragSource.kind === 'pool') {
    return dropSlot ? hotbarsWithAbilityPlaced(bars, dropSlot, dragSource.abilityId) : [...bars]
  }
  return dropSlot
    ? hotbarsWithAbilityMoved(bars, dragSource.slot, dropSlot)
    : hotbarsWithSlotCleared(bars, dragSource.slot)
}

export function hotbarsWithoutAbility(bars: readonly Hotbar[], abilityId: string): Hotbar[] {
  return bars.map((bar) =>
    bar.slots.includes(abilityId)
      ? { ...bar, slots: bar.slots.map((slotted) => (slotted === abilityId ? null : slotted)) }
      : bar,
  )
}

export function hotbarsWithLabel(bars: readonly Hotbar[], barId: string, label: string): Hotbar[] {
  return bars.map((bar) => (bar.id === barId ? { ...bar, label } : bar))
}

function unusedBarId(bars: readonly Hotbar[]): string {
  const usedIds = new Set(bars.map((bar) => bar.id))
  let barNumber = 1
  while (usedIds.has(`${BAR_ID_PREFIX}${barNumber}`)) barNumber += 1
  return `${BAR_ID_PREFIX}${barNumber}`
}

function unusedNumberedBarLabel(bars: readonly Hotbar[]): string {
  const usedLabels = new Set(bars.map((bar) => bar.label))
  let barNumber = bars.length + 1
  while (usedLabels.has(`${BAR_LABEL_PREFIX}${barNumber}`)) barNumber += 1
  return `${BAR_LABEL_PREFIX}${barNumber}`
}

export function hotbarsWithBarAdded(bars: readonly Hotbar[]): Hotbar[] {
  return [
    ...bars,
    {
      id: unusedBarId(bars),
      label: unusedNumberedBarLabel(bars),
      slots: hotbarSlotsFilledFromStart([]),
    },
  ]
}

export function hotbarsWithoutBar(bars: readonly Hotbar[], barId: string): Hotbar[] {
  if (bars.length <= 1) return [...bars]
  return bars.filter((bar) => bar.id !== barId)
}
