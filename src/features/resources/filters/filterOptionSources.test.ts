import { expect, it } from 'vitest'
import { filterOptionSource, locallySearched, type DeclaredFilter } from './filterOptionSources'
import { hasAppliedFilters } from './filterModel'

interface Values {
  tags: string[]
  match: 'any' | 'all'
}

const source = filterOptionSource<Values, string[]>({
  path: '/v1/tags',
  restoredLabelSource: 'value',
  isServerSearched: true,
  queryOptions: (search) => ({ queryKey: ['tags', search], queryFn: async () => [] }),
  toOptionSet: ({ shown }) => ({
    options: (shown ?? []).map((name) => ({ value: name, label: name })),
  }),
})

const declarations: DeclaredFilter<Values>[] = [
  { key: 'tags', kind: 'multi', label: 'Tags', matchKey: 'match', optionSource: source },
]

it('uses local search without changing the original source or its unsearched query', () => {
  const local = locallySearched(declarations)
  expect(local[0].kind === 'multi' && local[0].optionSource.isServerSearched).toBe(false)
  expect(source.isServerSearched).toBe(true)
  expect(local[0].kind === 'multi' && local[0].optionSource.queryOptions('').queryKey).toEqual(
    source.queryOptions('').queryKey,
  )
})

it('detects applied values without loading options or treating match mode as a filter', () => {
  expect(hasAppliedFilters(declarations, { tags: [], match: 'all' })).toBe(false)
  expect(hasAppliedFilters(declarations, { tags: ['tag'], match: 'any' })).toBe(true)
})

it('requires a source and forbids hand-fed options on a declared multi filter', () => {
  // @ts-expect-error A declared multi filter requires an option source.
  const withoutSource: DeclaredFilter<Values> = { key: 'tags', kind: 'multi', label: 'Tags' }
  // @ts-expect-error Declared filters cannot receive hand-fed options.
  const withOptions: DeclaredFilter<Values> = {
    key: 'tags',
    kind: 'multi',
    label: 'Tags',
    optionSource: source,
    options: [],
  }
  expect(withoutSource.kind).toBe('multi')
  expect(withOptions.kind).toBe('multi')
})

it('requires every option source to declare how restored values get their labels', () => {
  // @ts-expect-error An option source requires its restored-label source.
  const withoutLabelSource = filterOptionSource<Values, unknown>({
    path: source.path,
    queryOptions: source.queryOptions,
    toOptionSet: () => ({ options: [] }),
  })
  expect(withoutLabelSource.path).toBe(source.path)
})
