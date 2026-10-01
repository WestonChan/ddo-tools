import {
  closestCenter,
  closestCorners,
  pointerWithin,
  type ClientRect,
  type CollisionDetection,
} from '@dnd-kit/core'
import type { Coordinates } from '@dnd-kit/utilities'
import { dropTargetOf } from './hotbarDragPayloads'

function rectAtPoint(point: Coordinates): ClientRect {
  return { top: point.y, left: point.x, bottom: point.y, right: point.x, width: 0, height: 0 }
}

export const hotbarDropCollisions: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCorners(args)
  const collisionsUnderPointer = pointerWithin(args)
  const innermostDropTarget = dropTargetOf(
    args.droppableContainers.find(
      (droppableContainer) => droppableContainer.id === collisionsUnderPointer[0]?.id,
    ),
  )
  if (innermostDropTarget?.kind !== 'tray') return collisionsUnderPointer
  return closestCenter({
    ...args,
    collisionRect: rectAtPoint(args.pointerCoordinates),
    droppableContainers: args.droppableContainers.filter((droppableContainer) => {
      const dropTarget = dropTargetOf(droppableContainer)
      return dropTarget?.kind === 'slot' && dropTarget.slot.barId === innermostDropTarget.barId
    }),
  })
}
