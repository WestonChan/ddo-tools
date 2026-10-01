import { describe, expect, it } from 'vitest'
import { PLACEHOLDER_ABILITIES } from './placeholderAbilities'
import {
  itemIdsWithItemAdded,
  itemIdsWithoutItem,
  PLACEHOLDER_CLICKY_ITEMS,
  toAddedClickyAbility,
} from './placeholderClickyItems'

describe('item ids added from the clicky picker', () => {
  it('adds an item once and removes it again', () => {
    const added = itemIdsWithItemAdded(itemIdsWithItemAdded([], 'mists'), 'mists')
    expect(added).toEqual(['mists'])
    expect(itemIdsWithItemAdded(added, 'night')).toEqual(['mists', 'night'])
    expect(itemIdsWithoutItem(['mists', 'night'], 'mists')).toEqual(['night'])
    expect(itemIdsWithoutItem(['night'], 'mists')).toEqual(['night'])
  })
})

describe('toAddedClickyAbility', () => {
  it('gives every added item an ability id no catalog ability or other item uses', () => {
    const catalogAbilityIds = new Set(PLACEHOLDER_ABILITIES.map((ability) => ability.id))
    const addedAbilityIds = PLACEHOLDER_CLICKY_ITEMS.map((item) => toAddedClickyAbility(item).id)

    expect(addedAbilityIds.filter((abilityId) => catalogAbilityIds.has(abilityId))).toEqual([])
    expect(new Set(addedAbilityIds).size).toBe(addedAbilityIds.length)
  })
})
