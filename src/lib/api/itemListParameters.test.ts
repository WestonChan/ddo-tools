import { expect, it } from 'vitest'
import openapi from './openapi/v1.json'
import {
  MATCHABLE_ITEM_FILTER_PARAMETERS,
  SINGLE_VALUE_ITEM_FILTER_PARAMETERS,
  matchableFilterParameters,
  singleValueFilterParameters,
} from './itemListParameters'

it('never sends a match mode for a single-value parameter', () => {
  for (const parameter of SINGLE_VALUE_ITEM_FILTER_PARAMETERS) {
    expect(singleValueFilterParameters(parameter, ['first', 'second'])).toEqual({
      [parameter]: ['first', 'second'],
    })
    expect(singleValueFilterParameters(parameter, [])).toEqual({})
  }
})

it('sends All only for selected values and leaves Any implicit for every matchable parameter', () => {
  for (const parameter of MATCHABLE_ITEM_FILTER_PARAMETERS) {
    expect(matchableFilterParameters(parameter, ['first', 'second'], 'all')).toEqual({
      [parameter]: ['first', 'second'],
      [`${parameter}_match`]: 'all',
    })
    expect(matchableFilterParameters(parameter, ['first'])).toEqual({
      [parameter]: ['first'],
      [`${parameter}_match`]: undefined,
    })
    expect(matchableFilterParameters(parameter, [], 'all')).toEqual({})
  }
})

expect(openapi.openapi).toMatch(/^3\./)

function arrayParameters(path: '/v1/items' | '/v1/patrons'): string[] {
  return openapi.paths[path].get.parameters
    .filter((parameter) => parameter.in === 'query' && parameter.schema.type === 'array')
    .map((parameter) => parameter.name)
}

it('declares every filter array and keeps list conventions separate', () => {
  const conventionArrays = arrayParameters('/v1/patrons')
  const itemArrays = arrayParameters('/v1/items')
  const filterParameters = [
    ...MATCHABLE_ITEM_FILTER_PARAMETERS,
    ...SINGLE_VALUE_ITEM_FILTER_PARAMETERS,
  ]
  for (const parameter of conventionArrays) {
    expect(itemArrays).toContain(parameter)
    expect(filterParameters).not.toContain(parameter)
  }
  expect(new Set(itemArrays.filter((parameter) => !conventionArrays.includes(parameter)))).toEqual(
    new Set(filterParameters),
  )
})

it('agrees with every served match control in both directions', () => {
  for (const [parameters, isSingleValue] of [
    [MATCHABLE_ITEM_FILTER_PARAMETERS, false],
    [SINGLE_VALUE_ITEM_FILTER_PARAMETERS, true],
  ] as const) {
    const controls = openapi.paths['/v1/items'].get.parameters.flatMap((parameter) =>
      parameter.in === 'query' &&
      'x-match-key' in parameter &&
      ('x-single-value' in parameter && parameter['x-single-value']) === isSingleValue
        ? [parameter]
        : [],
    )
    expect(new Set(controls.map((parameter) => parameter['x-match-key']))).toEqual(
      new Set(parameters),
    )
    for (const parameter of parameters) {
      expect(controls.find((control) => control.name === `${parameter}_match`)).toMatchObject({
        'x-match-key': parameter,
      })
    }
  }
})
