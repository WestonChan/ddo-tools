import type { ApiQueryParameters } from './types'

export const MATCHABLE_ITEM_FILTER_PARAMETERS = [
  'bonus',
  'set',
  'pack',
  'quest',
  'quest_chain',
  'saga',
  'attack_ability',
  'damage_ability',
  'socket',
  'crafting_system',
] as const

export const SINGLE_VALUE_ITEM_FILTER_PARAMETERS = ['slot', 'category', 'material'] as const

export type MatchableItemFilterParameter = (typeof MATCHABLE_ITEM_FILTER_PARAMETERS)[number]
export type SingleValueItemFilterParameter = (typeof SINGLE_VALUE_ITEM_FILTER_PARAMETERS)[number]
export type ItemFilterMatch = 'any' | 'all'

export function matchableFilterParameters(
  name: MatchableItemFilterParameter,
  values: readonly string[],
  match: ItemFilterMatch = 'any',
): ApiQueryParameters {
  return values.length
    ? { [name]: values, [`${name}_match`]: match === 'all' ? 'all' : undefined }
    : {}
}

export function singleValueFilterParameters(
  name: SingleValueItemFilterParameter,
  values: readonly string[],
): ApiQueryParameters {
  return values.length ? { [name]: values } : {}
}
