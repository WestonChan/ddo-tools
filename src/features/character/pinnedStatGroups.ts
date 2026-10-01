export interface PinnedStatGroup {
  id: string
  label: string
  statNames: readonly string[]
}

export type StatDropTarget =
  | { kind: 'pinnedStat'; statName: string }
  | { kind: 'groupHeader'; groupId: string }
  | { kind: 'pinnedGroup'; groupId: string }
  | { kind: 'newGroupGap'; groupIndex: number }
  | { kind: 'pinnedSection' }

const HOME_GROUP_ID_PREFIX = 'home:'
const CREATED_GROUP_ID_PREFIX = 'pinned-group-'

function groupHoldingStat(
  groups: readonly PinnedStatGroup[],
  statName: string,
): PinnedStatGroup | undefined {
  return groups.find((group) => group.statNames.includes(statName))
}

function groupsWithStatRemoved(
  groups: readonly PinnedStatGroup[],
  statName: string,
): PinnedStatGroup[] {
  return groups.map((group) =>
    group.statNames.includes(statName)
      ? { ...group, statNames: group.statNames.filter((name) => name !== statName) }
      : group,
  )
}

function groupsWithoutEmptiedGroup(
  groups: readonly PinnedStatGroup[],
  emptiedGroupId: string | undefined,
): PinnedStatGroup[] {
  return groups.filter((group) => group.id !== emptiedGroupId || group.statNames.length > 0)
}

function statNamesWithStatInserted(
  statNames: readonly string[],
  statName: string,
  insertIndex: number,
): string[] {
  return [...statNames.slice(0, insertIndex), statName, ...statNames.slice(insertIndex)]
}

function unusedCreatedGroupId(groups: readonly PinnedStatGroup[]): string {
  const usedIds = new Set(groups.map((group) => group.id))
  let groupNumber = 1
  while (usedIds.has(`${CREATED_GROUP_ID_PREFIX}${groupNumber}`)) groupNumber += 1
  return `${CREATED_GROUP_ID_PREFIX}${groupNumber}`
}

function statNamesWithStatMoved(
  statNames: readonly string[],
  movedStatName: string,
  overStatName: string,
): string[] {
  const reordered = statNames.filter((name) => name !== movedStatName)
  reordered.splice(statNames.indexOf(overStatName), 0, movedStatName)
  return reordered
}

function insertIndexInTargetGroup(
  targetGroup: PinnedStatGroup,
  dropTarget: Exclude<StatDropTarget, { kind: 'newGroupGap' | 'pinnedSection' }>,
): number {
  if (dropTarget.kind === 'groupHeader') return 0
  if (dropTarget.kind === 'pinnedGroup') return targetGroup.statNames.length
  return targetGroup.statNames.indexOf(dropTarget.statName)
}

function groupsWithStatPlaced(
  groups: readonly PinnedStatGroup[],
  statName: string,
  dropTarget: Exclude<StatDropTarget, { kind: 'pinnedSection' }>,
  homeGroupName: string,
): PinnedStatGroup[] | null {
  if (dropTarget.kind === 'newGroupGap') {
    const createdGroup: PinnedStatGroup = {
      id: unusedCreatedGroupId(groups),
      label: homeGroupName,
      statNames: [statName],
    }
    const groupIndex = Math.min(Math.max(dropTarget.groupIndex, 0), groups.length)
    return [...groups.slice(0, groupIndex), createdGroup, ...groups.slice(groupIndex)]
  }
  const targetGroup =
    dropTarget.kind === 'pinnedStat'
      ? groupHoldingStat(groups, dropTarget.statName)
      : groups.find((group) => group.id === dropTarget.groupId)
  if (!targetGroup) return null
  const insertIndex = insertIndexInTargetGroup(targetGroup, dropTarget)
  return groups.map((group) =>
    group === targetGroup
      ? {
          ...group,
          statNames: statNamesWithStatInserted(group.statNames, statName, insertIndex),
        }
      : group,
  )
}

export function pinnedGroupsWithStatPinned(
  groups: readonly PinnedStatGroup[],
  statName: string,
  homeGroupName: string,
): PinnedStatGroup[] {
  if (groupHoldingStat(groups, statName)) return [...groups]
  const homeGroupId = `${HOME_GROUP_ID_PREFIX}${homeGroupName}`
  const homeGroup =
    groups.find((group) => group.id === homeGroupId) ??
    groups.find((group) => group.label.trim().toLowerCase() === homeGroupName.toLowerCase())
  if (!homeGroup)
    return [...groups, { id: homeGroupId, label: homeGroupName, statNames: [statName] }]
  return groups.map((group) =>
    group === homeGroup ? { ...group, statNames: [...group.statNames, statName] } : group,
  )
}

export function pinnedGroupsWithoutStat(
  groups: readonly PinnedStatGroup[],
  statName: string,
): PinnedStatGroup[] {
  return groupsWithoutEmptiedGroup(
    groupsWithStatRemoved(groups, statName),
    groupHoldingStat(groups, statName)?.id,
  )
}

export function pinnedGroupsWithoutGroup(
  groups: readonly PinnedStatGroup[],
  groupId: string,
): PinnedStatGroup[] {
  return groups.filter((group) => group.id !== groupId)
}

export function pinnedGroupsWithLabel(
  groups: readonly PinnedStatGroup[],
  groupId: string,
  label: string,
): PinnedStatGroup[] {
  return groups.map((group) => (group.id === groupId ? { ...group, label } : group))
}

export function pinnedGroupsWithStatDropped(
  groups: readonly PinnedStatGroup[],
  statName: string,
  dropTarget: StatDropTarget | null,
  homeGroupName: string,
): PinnedStatGroup[] {
  if (dropTarget === null) return pinnedGroupsWithoutStat(groups, statName)
  if (dropTarget.kind === 'pinnedSection') return [...groups]
  const sourceGroup = groupHoldingStat(groups, statName)
  if (dropTarget.kind === 'pinnedStat' && sourceGroup?.statNames.includes(dropTarget.statName)) {
    return groups.map((group) =>
      group === sourceGroup
        ? {
            ...group,
            statNames: statNamesWithStatMoved(group.statNames, statName, dropTarget.statName),
          }
        : group,
    )
  }
  const placedGroups = groupsWithStatPlaced(
    groupsWithStatRemoved(groups, statName),
    statName,
    dropTarget,
    homeGroupName,
  )
  if (!placedGroups) return [...groups]
  return groupsWithoutEmptiedGroup(placedGroups, sourceGroup?.id)
}

export function newGroupGapIndexes(
  groups: readonly PinnedStatGroup[],
  draggedStatName: string,
): number[] {
  if (groups.length === 0) return [0]
  const sourceGroup = groupHoldingStat(groups, draggedStatName)
  const loneSourceGroupIndex =
    sourceGroup && sourceGroup.statNames.length === 1 ? groups.indexOf(sourceGroup) : -1
  const gapIndexes: number[] = []
  for (let gapIndex = 1; gapIndex <= groups.length; gapIndex += 1) {
    const isBesideLoneSourceGroup =
      loneSourceGroupIndex !== -1 &&
      (gapIndex === loneSourceGroupIndex || gapIndex === loneSourceGroupIndex + 1)
    if (!isBesideLoneSourceGroup) gapIndexes.push(gapIndex)
  }
  return gapIndexes
}
