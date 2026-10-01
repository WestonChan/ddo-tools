import { describe, expect, it } from 'vitest'
import {
  newGroupGapIndexes,
  pinnedGroupsWithLabel,
  pinnedGroupsWithoutGroup,
  pinnedGroupsWithoutStat,
  pinnedGroupsWithStatDropped,
  pinnedGroupsWithStatPinned,
  type PinnedStatGroup,
} from './pinnedStatGroups'

const OFFENSE: PinnedStatGroup = {
  id: 'home:Offense',
  label: 'Offense',
  statNames: ['Evocation DC', 'Spell power (fire)', 'Spell crit'],
}
const RESOURCES: PinnedStatGroup = {
  id: 'home:Resources',
  label: 'Resources',
  statNames: ['Spell points'],
}
const GROUPS: readonly PinnedStatGroup[] = [OFFENSE, RESOURCES]

function statNamesByLabel(groups: readonly PinnedStatGroup[]): Record<string, readonly string[]> {
  return Object.fromEntries(groups.map((group) => [group.label, group.statNames]))
}

function expectEachStatInAtMostOneGroup(groups: readonly PinnedStatGroup[]): void {
  const statNames = groups.flatMap((group) => group.statNames)
  expect(new Set(statNames).size).toBe(statNames.length)
}

describe('pinnedGroupsWithStatPinned', () => {
  it('appends the stat to the group that owns its home group, by id or by label', () => {
    expect(statNamesByLabel(pinnedGroupsWithStatPinned(GROUPS, 'Spell pen', 'Offense'))).toEqual({
      Offense: [...OFFENSE.statNames, 'Spell pen'],
      Resources: RESOURCES.statNames,
    })

    const renamed = pinnedGroupsWithLabel(GROUPS, OFFENSE.id, 'Casting')
    expect(statNamesByLabel(pinnedGroupsWithStatPinned(renamed, 'Spell pen', 'Offense'))).toEqual({
      Casting: [...OFFENSE.statNames, 'Spell pen'],
      Resources: RESOURCES.statNames,
    })

    const labelledByHand: PinnedStatGroup[] = [{ id: 'custom', label: 'defense', statNames: [] }]
    expect(pinnedGroupsWithStatPinned(labelledByHand, 'AC', 'Defense')).toEqual([
      { id: 'custom', label: 'defense', statNames: ['AC'] },
    ])
  })

  it('creates the home group at the end when no group matches', () => {
    expect(pinnedGroupsWithStatPinned(GROUPS, 'HP', 'Defense')).toEqual([
      ...GROUPS,
      { id: 'home:Defense', label: 'Defense', statNames: ['HP'] },
    ])
  })

  it('leaves the groups alone when the stat is already pinned', () => {
    expect(pinnedGroupsWithStatPinned(GROUPS, 'Spell points', 'Offense')).toEqual(GROUPS)
  })
})

describe('pinnedGroupsWithoutStat', () => {
  it('removes the stat and drops the group it emptied', () => {
    expect(pinnedGroupsWithoutStat(GROUPS, 'Spell crit')).toEqual([
      { ...OFFENSE, statNames: ['Evocation DC', 'Spell power (fire)'] },
      RESOURCES,
    ])
    expect(pinnedGroupsWithoutStat(GROUPS, 'Spell points')).toEqual([OFFENSE])
  })
})

describe('pinnedGroupsWithoutGroup and pinnedGroupsWithLabel', () => {
  it('deletes a group with its stats and relabels one in place', () => {
    expect(pinnedGroupsWithoutGroup(GROUPS, OFFENSE.id)).toEqual([RESOURCES])
    expect(pinnedGroupsWithLabel(GROUPS, RESOURCES.id, 'Mana')).toEqual([
      OFFENSE,
      { ...RESOURCES, label: 'Mana' },
    ])
  })
})

describe('pinnedGroupsWithStatDropped', () => {
  it('reorders within a group the way the sortable list shows it, in both directions', () => {
    const movedDown = pinnedGroupsWithStatDropped(
      GROUPS,
      'Evocation DC',
      { kind: 'pinnedStat', statName: 'Spell crit' },
      'Offense',
    )
    expect(movedDown[0].statNames).toEqual(['Spell power (fire)', 'Spell crit', 'Evocation DC'])

    const movedUp = pinnedGroupsWithStatDropped(
      GROUPS,
      'Spell crit',
      { kind: 'pinnedStat', statName: 'Evocation DC' },
      'Offense',
    )
    expect(movedUp[0].statNames).toEqual(['Spell crit', 'Evocation DC', 'Spell power (fire)'])
  })

  it('moves a stat into another group before the row it was dropped on, removing the group it emptied', () => {
    const moved = pinnedGroupsWithStatDropped(
      GROUPS,
      'Spell points',
      { kind: 'pinnedStat', statName: 'Spell power (fire)' },
      'Resources',
    )
    expect(moved).toEqual([
      {
        ...OFFENSE,
        statNames: ['Evocation DC', 'Spell points', 'Spell power (fire)', 'Spell crit'],
      },
    ])
    expectEachStatInAtMostOneGroup(moved)
  })

  it('pins an unpinned stat before the row it was dropped on', () => {
    expect(
      pinnedGroupsWithStatDropped(
        GROUPS,
        'HP',
        { kind: 'pinnedStat', statName: 'Spell points' },
        'Defense',
      ),
    ).toEqual([OFFENSE, { ...RESOURCES, statNames: ['HP', 'Spell points'] }])
  })

  it('puts a stat dropped on a group header at the top of that group', () => {
    expect(
      pinnedGroupsWithStatDropped(
        GROUPS,
        'Spell crit',
        { kind: 'groupHeader', groupId: OFFENSE.id },
        'Offense',
      )[0].statNames,
    ).toEqual(['Spell crit', 'Evocation DC', 'Spell power (fire)'])
    expect(
      pinnedGroupsWithStatDropped(
        GROUPS,
        'Spell points',
        { kind: 'groupHeader', groupId: RESOURCES.id },
        'Resources',
      ),
    ).toEqual(GROUPS)
    expect(
      pinnedGroupsWithStatDropped(
        GROUPS,
        'Evocation DC',
        { kind: 'groupHeader', groupId: RESOURCES.id },
        'Offense',
      ),
    ).toEqual([
      { ...OFFENSE, statNames: ['Spell power (fire)', 'Spell crit'] },
      { ...RESOURCES, statNames: ['Evocation DC', 'Spell points'] },
    ])
  })

  it('appends a stat dropped on a group outside its rows to the end of that group', () => {
    expect(
      pinnedGroupsWithStatDropped(
        GROUPS,
        'Evocation DC',
        { kind: 'pinnedGroup', groupId: OFFENSE.id },
        'Offense',
      )[0].statNames,
    ).toEqual(['Spell power (fire)', 'Spell crit', 'Evocation DC'])
    expect(
      pinnedGroupsWithStatDropped(
        GROUPS,
        'Spell crit',
        { kind: 'pinnedGroup', groupId: RESOURCES.id },
        'Offense',
      ),
    ).toEqual([
      { ...OFFENSE, statNames: ['Evocation DC', 'Spell power (fire)'] },
      { ...RESOURCES, statNames: ['Spell points', 'Spell crit'] },
    ])
    expect(
      pinnedGroupsWithStatDropped(
        GROUPS,
        'HP',
        { kind: 'pinnedGroup', groupId: OFFENSE.id },
        'Defense',
      )[0].statNames,
    ).toEqual([...OFFENSE.statNames, 'HP'])
  })

  it('leaves every group alone when a stat is dropped in the pinned section outside any group', () => {
    const pinnedSectionDrop = { kind: 'pinnedSection' } as const
    expect(
      pinnedGroupsWithStatDropped(GROUPS, 'Spell points', pinnedSectionDrop, 'Resources'),
    ).toEqual(GROUPS)
    expect(pinnedGroupsWithStatDropped(GROUPS, 'HP', pinnedSectionDrop, 'Defense')).toEqual(GROUPS)
  })

  it('creates a group labelled after the stat’s home group at the gap it was dropped on', () => {
    const created = pinnedGroupsWithStatDropped(
      GROUPS,
      'Spell crit',
      { kind: 'newGroupGap', groupIndex: 1 },
      'Offense',
    )
    expect(created.map((group) => group.label)).toEqual(['Offense', 'Offense', 'Resources'])
    expect(created[1].statNames).toEqual(['Spell crit'])
    expect(new Set(created.map((group) => group.id)).size).toBe(3)
    expectEachStatInAtMostOneGroup(created)

    const fromUnpinned = pinnedGroupsWithStatDropped(
      [],
      'HP',
      { kind: 'newGroupGap', groupIndex: 0 },
      'Defense',
    )
    expect(statNamesByLabel(fromUnpinned)).toEqual({ Defense: ['HP'] })
  })

  it('keeps group ids unique when new groups are created repeatedly', () => {
    const twice = pinnedGroupsWithStatDropped(
      pinnedGroupsWithStatDropped(GROUPS, 'HP', { kind: 'newGroupGap', groupIndex: 2 }, 'Defense'),
      'AC',
      { kind: 'newGroupGap', groupIndex: 3 },
      'Defense',
    )
    expect(new Set(twice.map((group) => group.id)).size).toBe(twice.length)
  })

  it('moves a lone stat to a new group without leaving its old group behind', () => {
    const moved = pinnedGroupsWithStatDropped(
      GROUPS,
      'Spell points',
      { kind: 'newGroupGap', groupIndex: 1 },
      'Resources',
    )
    expect(moved.map((group) => group.statNames)).toEqual([OFFENSE.statNames, ['Spell points']])
    expect(moved[1].id).not.toBe(RESOURCES.id)
  })

  it('unpins a stat dropped outside every target and ignores an unpinned one', () => {
    expect(pinnedGroupsWithStatDropped(GROUPS, 'Spell points', null, 'Resources')).toEqual([
      OFFENSE,
    ])
    expect(pinnedGroupsWithStatDropped(GROUPS, 'HP', null, 'Defense')).toEqual(GROUPS)
  })

  it('never leaves a stat in two groups across a run of drops', () => {
    const dropSequence: [string, Parameters<typeof pinnedGroupsWithStatDropped>[2], string][] = [
      ['HP', { kind: 'newGroupGap', groupIndex: 2 }, 'Defense'],
      ['Evocation DC', { kind: 'pinnedStat', statName: 'HP' }, 'Offense'],
      ['HP', { kind: 'groupHeader', groupId: OFFENSE.id }, 'Defense'],
      ['Spell points', { kind: 'pinnedStat', statName: 'Spell points' }, 'Resources'],
      ['Spell crit', { kind: 'newGroupGap', groupIndex: 0 }, 'Offense'],
      ['Evocation DC', null, 'Offense'],
    ]
    let groups: readonly PinnedStatGroup[] = GROUPS
    for (const [statName, dropTarget, homeGroupName] of dropSequence) {
      groups = pinnedGroupsWithStatDropped(groups, statName, dropTarget, homeGroupName)
      expectEachStatInAtMostOneGroup(groups)
      expect(groups.every((group) => group.statNames.length > 0)).toBe(true)
    }
  })
})

describe('newGroupGapIndexes', () => {
  it('offers a gap between groups and at the end, never above the first group', () => {
    expect(newGroupGapIndexes(GROUPS, 'HP')).toEqual([1, 2])
    expect(newGroupGapIndexes(GROUPS, 'Evocation DC')).toEqual([1, 2])
  })

  it('hides the gaps beside a group that holds only the dragged stat', () => {
    expect(newGroupGapIndexes(GROUPS, 'Spell points')).toEqual([])
    const threeGroups = [RESOURCES, OFFENSE, { id: 'x', label: 'X', statNames: ['AC'] }]
    expect(newGroupGapIndexes(threeGroups, 'Spell points')).toEqual([2, 3])
  })

  it('offers the one empty-state gap when there are no groups', () => {
    expect(newGroupGapIndexes([], 'HP')).toEqual([0])
  })
})
