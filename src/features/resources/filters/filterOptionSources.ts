import type { UseQueryOptions } from '@tanstack/react-query'
import type { FilterOption } from '../../../components'
import type { FilterDefinition, FilterValue } from './filterModel'

export interface FilterOptionSet {
  options: FilterOption[]
  optionCount?: number
  selectedOptionLabels?: ReadonlyMap<string, string>
}

export interface FilterOptionSource<Values, Vocabulary = unknown> {
  path: string
  queryOptions: (searchQuery: string) => UseQueryOptions<Vocabulary>
  isServerSearched?: boolean
  toOptionSet: (input: {
    shown: Vocabulary | undefined
    unsearched: Vocabulary | undefined
    values: Values
  }) => FilterOptionSet
}

export function filterOptionSource<Values, Vocabulary>(
  source: FilterOptionSource<Values, Vocabulary>,
): FilterOptionSource<Values> {
  return source as unknown as FilterOptionSource<Values>
}

export type DeclaredFilter<Values extends { [Key in keyof Values]: FilterValue }> =
  | Exclude<FilterDefinition<Values>, { kind: 'multi' }>
  | (Omit<
      Extract<FilterDefinition<Values>, { kind: 'multi' }>,
      'options' | 'optionCount' | 'selectedOptionLabels' | 'isServerSearched'
    > & {
      optionSource: FilterOptionSource<Values>
      options?: never
      optionCount?: never
      selectedOptionLabels?: never
      isServerSearched?: never
    })

export function locallySearched<Values extends { [Key in keyof Values]: FilterValue }>(
  declarations: readonly DeclaredFilter<Values>[],
): DeclaredFilter<Values>[] {
  return declarations.map((declaration) =>
    'optionSource' in declaration
      ? { ...declaration, optionSource: { ...declaration.optionSource, isServerSearched: false } }
      : declaration,
  )
}
