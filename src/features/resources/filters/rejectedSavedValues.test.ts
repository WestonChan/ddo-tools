import { describe, expect, it } from 'vitest'
import { ApiError, API_HTTP_ERROR } from '../../../lib/api'
import { filterOptionSource, type DeclaredFilter } from './filterOptionSources'
import { rejectedSavedValue, valuesWithoutRejectedValue } from './rejectedSavedValues'

interface Values {
  tags: string[]
  tagMatch: 'any' | 'all'
  authors: string[]
  languages: string[]
  isAvailable: boolean
}

const optionSource = filterOptionSource<Values, string[]>({
  path: '/v1/tags',
  restoredLabelSource: 'value',
  queryOptions: () => ({ queryKey: ['tags'], queryFn: async () => [] }),
  toOptionSet: ({ shown }) => ({
    options: (shown ?? []).map((value) => ({ value, label: value })),
  }),
})
const declarations: DeclaredFilter<Values>[] = [
  {
    key: 'tags',
    kind: 'multi',
    parameter: 'tag',
    label: 'Tags',
    matchKey: 'tagMatch',
    optionSource,
  },
  { key: 'authors', kind: 'multi', parameter: 'author', label: 'Authors', optionSource },
  { key: 'languages', kind: 'multi', parameter: 'language', label: 'Languages', optionSource },
  { key: 'isAvailable', kind: 'toggle', label: 'Available' },
]
const selectedValues: Values = {
  tags: ['kept', 'stale', ' stale '],
  tagMatch: 'all',
  authors: ['writer'],
  languages: [],
  isAvailable: true,
}

function rejection(parameter: string, value: string): ApiError {
  return new ApiError(API_HTTP_ERROR, 400, 'Bad request', {
    responseErrorText: `unknown ${parameter} "${value}"; accepted values: kept`,
  })
}

describe('rejectedSavedValue', () => {
  it.each(['tags', 'authors', 'languages'] as const)(
    'finds the declared %s filter and its saved text',
    (key) => {
      const declaration = declarations.find((filter) => filter.key === key)!
      if (declaration.kind !== 'multi') throw new Error('Expected an option-list filter')
      const values = { ...selectedValues, [key]: [' stale '] }
      const rejected = rejectedSavedValue(
        rejection(declaration.parameter, 'stale'),
        declarations,
        values,
      )
      expect(rejected).toMatchObject({ declaration, value: 'stale', savedValues: [' stale '] })
    },
  )

  it.each([
    rejection('view', 'stale'),
    rejection('tag', 'already removed'),
    rejection('tag', 'STALE'),
    rejection('language', 'stale'),
    null,
  ])('ignores errors without a matching saved value: %s', (error) => {
    expect(rejectedSavedValue(error, declarations, selectedValues)).toBeNull()
  })
})

describe('valuesWithoutRejectedValue', () => {
  it('removes every saved spelling of the echoed value, preserving other values and match mode', () => {
    const rejected = rejectedSavedValue(rejection('tag', 'stale'), declarations, selectedValues)!
    expect(valuesWithoutRejectedValue(selectedValues, rejected)).toEqual({
      ...selectedValues,
      tags: ['kept'],
    })
    expect(selectedValues.tags).toEqual(['kept', 'stale', ' stale '])
  })

  it('resets match mode only when the last value is removed', () => {
    const values: Values = { ...selectedValues, tags: ['stale', ' stale '] }
    const rejected = rejectedSavedValue(rejection('tag', 'stale'), declarations, values)!
    expect(valuesWithoutRejectedValue(values, rejected)).toEqual({
      ...values,
      tags: [],
      tagMatch: 'any',
    })
  })

  it('empties a filter without a match key without changing another filter mode', () => {
    const rejected = rejectedSavedValue(
      rejection('author', 'writer'),
      declarations,
      selectedValues,
    )!
    expect(valuesWithoutRejectedValue(selectedValues, rejected)).toEqual({
      ...selectedValues,
      authors: [],
    })
  })
})
