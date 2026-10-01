import { describe, expect, it } from 'vitest'
import {
  HOTBAR_SLOT_COUNT,
  hotbarSlotsFilledFromStart,
  hotbarsWithAbilityDropped,
  hotbarsWithAbilityMoved,
  hotbarsWithAbilityPlaced,
  hotbarsWithBarAdded,
  hotbarsWithLabel,
  hotbarsWithoutAbility,
  hotbarsWithoutBar,
  hotbarsWithSlotCleared,
  type Hotbar,
} from './hotbars'

const NUKES: Hotbar = {
  id: 'bar-1',
  label: 'Nukes',
  slots: hotbarSlotsFilledFromStart(['dbf', 'ms']),
}
const SLAS: Hotbar = { id: 'bar-2', label: 'SLAs', slots: hotbarSlotsFilledFromStart(['fb']) }
const BARS: readonly Hotbar[] = [NUKES, SLAS]

function slotsOf(bars: readonly Hotbar[], barId: string): readonly (string | null)[] {
  return bars.find((bar) => bar.id === barId)!.slots
}

function expectTenSlotsOnEveryBar(bars: readonly Hotbar[]): void {
  for (const bar of bars) expect(bar.slots).toHaveLength(HOTBAR_SLOT_COUNT)
}

describe('hotbarSlotsFilledFromStart', () => {
  it('fills from slot 1 and pads the rest of the ten slots with empties', () => {
    expect(hotbarSlotsFilledFromStart(['dbf', 'ms'])).toEqual([
      'dbf',
      'ms',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ])
  })

  it('drops abilities past the tenth slot', () => {
    const elevenAbilityIds = Array.from({ length: 11 }, (_, index) => `ability-${index}`)
    expect(hotbarSlotsFilledFromStart(elevenAbilityIds)).toEqual(elevenAbilityIds.slice(0, 10))
  })
})

describe('hotbarsWithAbilityPlaced', () => {
  it('places an ability in an empty slot', () => {
    const placed = hotbarsWithAbilityPlaced(BARS, { barId: 'bar-2', slotIndex: 3 }, 'dbf')
    expect(slotsOf(placed, 'bar-2')[3]).toBe('dbf')
    expect(slotsOf(placed, 'bar-1')).toEqual(NUKES.slots)
    expectTenSlotsOnEveryBar(placed)
  })

  it('replaces the ability in a filled slot and lets one ability sit in several slots', () => {
    const placed = hotbarsWithAbilityPlaced(BARS, { barId: 'bar-1', slotIndex: 1 }, 'dbf')
    expect(slotsOf(placed, 'bar-1').slice(0, 3)).toEqual(['dbf', 'dbf', null])
  })

  it('leaves the bars unchanged for an unknown bar or an out-of-range slot', () => {
    expect(hotbarsWithAbilityPlaced(BARS, { barId: 'bar-9', slotIndex: 0 }, 'dbf')).toEqual(BARS)
    expect(hotbarsWithAbilityPlaced(BARS, { barId: 'bar-1', slotIndex: 10 }, 'dbf')).toEqual(BARS)
    expect(hotbarsWithAbilityPlaced(BARS, { barId: 'bar-1', slotIndex: -1 }, 'dbf')).toEqual(BARS)
  })
})

describe('hotbarsWithSlotCleared', () => {
  it('empties one slot and keeps ten slots', () => {
    const cleared = hotbarsWithSlotCleared(BARS, { barId: 'bar-1', slotIndex: 0 })
    expect(slotsOf(cleared, 'bar-1').slice(0, 2)).toEqual([null, 'ms'])
    expectTenSlotsOnEveryBar(cleared)
  })
})

describe('hotbarsWithAbilityMoved', () => {
  it('moves an ability to an empty slot on another bar, leaving the source empty', () => {
    const moved = hotbarsWithAbilityMoved(
      BARS,
      { barId: 'bar-1', slotIndex: 1 },
      { barId: 'bar-2', slotIndex: 4 },
    )
    expect(slotsOf(moved, 'bar-1').slice(0, 2)).toEqual(['dbf', null])
    expect(slotsOf(moved, 'bar-2')[4]).toBe('ms')
    expectTenSlotsOnEveryBar(moved)
  })

  it('replaces the ability in a filled target slot', () => {
    const moved = hotbarsWithAbilityMoved(
      BARS,
      { barId: 'bar-1', slotIndex: 0 },
      { barId: 'bar-1', slotIndex: 1 },
    )
    expect(slotsOf(moved, 'bar-1').slice(0, 2)).toEqual([null, 'dbf'])
  })

  it('leaves the bars unchanged when dropped on its own slot or moved from an empty slot', () => {
    const ownSlot = { barId: 'bar-1', slotIndex: 0 }
    expect(hotbarsWithAbilityMoved(BARS, ownSlot, ownSlot)).toEqual(BARS)
    expect(
      hotbarsWithAbilityMoved(
        BARS,
        { barId: 'bar-1', slotIndex: 5 },
        { barId: 'bar-1', slotIndex: 0 },
      ),
    ).toEqual(BARS)
  })
})

describe('hotbarsWithAbilityDropped', () => {
  const targetSlot = { barId: 'bar-2', slotIndex: 9 }

  it('places a pool ability on the slot it lands on and ignores a drop off the bars', () => {
    expect(
      slotsOf(
        hotbarsWithAbilityDropped(BARS, { kind: 'pool', abilityId: 'pr' }, targetSlot),
        'bar-2',
      )[9],
    ).toBe('pr')
    expect(hotbarsWithAbilityDropped(BARS, { kind: 'pool', abilityId: 'pr' }, null)).toEqual(BARS)
  })

  it('moves a slotted ability to the slot it lands on and clears it when dropped off the bars', () => {
    const sourceSlot = { barId: 'bar-1', slotIndex: 0 }
    const moved = hotbarsWithAbilityDropped(BARS, { kind: 'slot', slot: sourceSlot }, targetSlot)
    expect(slotsOf(moved, 'bar-1')[0]).toBeNull()
    expect(slotsOf(moved, 'bar-2')[9]).toBe('dbf')

    const cleared = hotbarsWithAbilityDropped(BARS, { kind: 'slot', slot: sourceSlot }, null)
    expect(slotsOf(cleared, 'bar-1').slice(0, 2)).toEqual([null, 'ms'])
  })
})

describe('hotbarsWithoutAbility', () => {
  it('empties every slot holding the ability', () => {
    const withDuplicate = hotbarsWithAbilityPlaced(BARS, { barId: 'bar-2', slotIndex: 5 }, 'dbf')
    const withoutFireball = hotbarsWithoutAbility(withDuplicate, 'dbf')
    expect(withoutFireball.flatMap((bar) => bar.slots)).not.toContain('dbf')
    expect(slotsOf(withoutFireball, 'bar-1')[1]).toBe('ms')
    expectTenSlotsOnEveryBar(withoutFireball)
  })
})

describe('hotbarsWithLabel', () => {
  it('renames only the named bar', () => {
    const renamed = hotbarsWithLabel(BARS, 'bar-2', 'Clickies')
    expect(renamed.map((bar) => bar.label)).toEqual(['Nukes', 'Clickies'])
    expect(renamed[1].slots).toEqual(SLAS.slots)
  })
})

describe('hotbarsWithBarAdded', () => {
  it('appends an empty ten-slot bar labelled by its position with an unused id', () => {
    const added = hotbarsWithBarAdded(BARS)
    expect(added).toHaveLength(3)
    expect(added[2].label).toBe('Bar 3')
    expect(added[2].slots).toEqual(Array(HOTBAR_SLOT_COUNT).fill(null))
    expect(new Set(added.map((bar) => bar.id)).size).toBe(3)
  })

  it('labels a bar added after a removal with the next Bar number no bar uses yet', () => {
    const barsAfterRemoval = hotbarsWithoutBar(hotbarsWithBarAdded(BARS), 'bar-1')
    const usedLabels = new Set(barsAfterRemoval.map((bar) => bar.label))
    let nextUnusedBarNumber = barsAfterRemoval.length + 1
    while (usedLabels.has(`Bar ${nextUnusedBarNumber}`)) nextUnusedBarNumber += 1

    const afterAdding = hotbarsWithBarAdded(barsAfterRemoval)

    expect(afterAdding.at(-1)!.label).toBe(`Bar ${nextUnusedBarNumber}`)
    expect(new Set(afterAdding.map((bar) => bar.label)).size).toBe(afterAdding.length)
    expect(new Set(afterAdding.map((bar) => bar.id)).size).toBe(afterAdding.length)
  })
})

describe('hotbarsWithoutBar', () => {
  it('removes the named bar', () => {
    expect(hotbarsWithoutBar(BARS, 'bar-1')).toEqual([SLAS])
  })

  it('never removes the last bar', () => {
    expect(hotbarsWithoutBar([NUKES], 'bar-1')).toEqual([NUKES])
  })
})
