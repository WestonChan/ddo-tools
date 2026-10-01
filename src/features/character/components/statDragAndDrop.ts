import {
  closestCorners,
  pointerWithin,
  type Active,
  type Announcements,
  type CollisionDetection,
  type Over,
} from '@dnd-kit/core'
import type { StatDropTarget } from '../pinnedStatGroups'

export interface StatDragPayload {
  statName: string
  groupId: string | null
}

export interface StatDropPayload {
  dropTarget: StatDropTarget
}

export function statDragId(statName: string): string {
  return `stat:${statName}`
}

export function dragPayloadOf(active: Active): StatDragPayload | undefined {
  return active.data.current as StatDragPayload | undefined
}

export function dropTargetOf(over: Over | null): StatDropTarget | null {
  return (over?.data.current as StatDropPayload | undefined)?.dropTarget ?? null
}

export function draggedStatNameOf(active: Active): string {
  return dragPayloadOf(active)?.statName ?? String(active.id)
}

export const statDropCollisions: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCorners(args)

function dropTargetDescription(dropTarget: StatDropTarget): string {
  if (dropTarget.kind === 'pinnedStat') return `the row ${dropTarget.statName}`
  if (dropTarget.kind === 'groupHeader') return 'the top of a pinned group'
  if (dropTarget.kind === 'pinnedGroup') return 'the end of a pinned group'
  if (dropTarget.kind === 'pinnedSection') return 'the pinned section outside every group'
  return 'a new group'
}

function isDraggedFromPinnedGroup(active: Active): boolean {
  return (dragPayloadOf(active)?.groupId ?? null) !== null
}

function dropOutsidePinnedSectionOutcome(active: Active): string {
  return isDraggedFromPinnedGroup(active)
    ? `${draggedStatNameOf(active)} was unpinned.`
    : `${draggedStatNameOf(active)} was dropped outside the pinned groups.`
}

export const STAT_DRAG_ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Picked up ${draggedStatNameOf(active)}.`,
  onDragOver: ({ active, over }) => {
    const dropTarget = dropTargetOf(over)
    return dropTarget
      ? `${draggedStatNameOf(active)} is over ${dropTargetDescription(dropTarget)}.`
      : `${draggedStatNameOf(active)} is outside the pinned section.`
  },
  onDragEnd: ({ active, over }) => {
    const dropTarget = dropTargetOf(over)
    if (!dropTarget) return dropOutsidePinnedSectionOutcome(active)
    if (dropTarget.kind === 'pinnedSection') {
      return `${draggedStatNameOf(active)} was dropped in ${dropTargetDescription(dropTarget)} and stayed where it was.`
    }
    return `${draggedStatNameOf(active)} was dropped on ${dropTargetDescription(dropTarget)}.`
  },
  onDragCancel: ({ active }) =>
    `Dragging was cancelled. ${draggedStatNameOf(active)} stayed where it was.`,
}
