import type { Active, DroppableContainer, Over } from '@dnd-kit/core'
import type { HotbarDragSource, HotbarSlotAddress } from '../hotbars'

export interface HotbarDragPayload {
  dragSource: HotbarDragSource
  abilityId: string
}

export type HotbarDropTarget =
  | { kind: 'slot'; slot: HotbarSlotAddress }
  | { kind: 'tray'; barId: string }
  | { kind: 'hotbarsArea' }

export interface HotbarDropPayload {
  dropTarget: HotbarDropTarget
}

export function poolAbilityDragId(abilityId: string): string {
  return `ability:${abilityId}`
}

export function hotbarSlotDragId(slot: HotbarSlotAddress): string {
  return `slot:${slot.barId}:${slot.slotIndex}`
}

export function dragPayloadOf(active: Active): HotbarDragPayload | undefined {
  return active.data.current as HotbarDragPayload | undefined
}

export function dropTargetOf(
  droppable: Over | DroppableContainer | null | undefined,
): HotbarDropTarget | null {
  return (droppable?.data.current as HotbarDropPayload | undefined)?.dropTarget ?? null
}

export function dropSlotOf(over: Over | null): HotbarSlotAddress | null {
  const dropTarget = dropTargetOf(over)
  return dropTarget?.kind === 'slot' ? dropTarget.slot : null
}
