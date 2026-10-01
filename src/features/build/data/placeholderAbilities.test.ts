import { describe, expect, it } from 'vitest'
import {
  ABILITY_POOL_GROUPS,
  DEFAULT_HOTBARS,
  ITEM_CLICKY_ABILITY_IDS,
  PLACEHOLDER_ABILITIES,
} from './placeholderAbilities'

const CATALOG_ABILITY_IDS = new Set(PLACEHOLDER_ABILITIES.map((ability) => ability.id))

function idsMissingFromCatalog(abilityIds: readonly string[]): string[] {
  return abilityIds.filter((abilityId) => !CATALOG_ABILITY_IDS.has(abilityId))
}

describe('placeholder ability catalog', () => {
  it('gives every catalog ability a unique id', () => {
    expect(CATALOG_ABILITY_IDS.size).toBe(PLACEHOLDER_ABILITIES.length)
  })

  it('slots only catalog abilities on the default hotbars', () => {
    const slottedAbilityIds = DEFAULT_HOTBARS.flatMap((bar) =>
      bar.slots.filter((abilityId) => abilityId !== null),
    )
    expect(idsMissingFromCatalog(slottedAbilityIds)).toEqual([])
  })

  it('lists each catalog ability in at most one pool group, item clickies included', () => {
    const pooledAbilityIds = [
      ...ABILITY_POOL_GROUPS.flatMap((group) => group.abilityIds),
      ...ITEM_CLICKY_ABILITY_IDS,
    ]
    expect(idsMissingFromCatalog(pooledAbilityIds)).toEqual([])
    expect(new Set(pooledAbilityIds).size).toBe(pooledAbilityIds.length)
  })
})
