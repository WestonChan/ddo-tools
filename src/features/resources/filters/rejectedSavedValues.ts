import { rejectedFilterValue } from '../../../lib/api'
import { clearedFilterValues, type FilterDefinition, type FilterValue } from './filterModel'
import type { DeclaredFilter } from './filterOptionSources'

interface RejectedSavedValue<Values extends { [Key in keyof Values]: FilterValue }> {
  declaration: DeclaredFilter<Values>
  value: string
  savedValues: string[]
}

export function rejectedSavedValue<Values extends { [Key in keyof Values]: FilterValue }>(
  error: unknown,
  declarations: readonly DeclaredFilter<Values>[],
  values: Values,
): RejectedSavedValue<Values> | null {
  const rejected = rejectedFilterValue(error)
  if (!rejected) return null
  for (const declaration of declarations) {
    if (!('parameter' in declaration) || declaration.parameter !== rejected.parameter) continue
    const selectedValues = values[declaration.key]
    const savedValues = Array.isArray(selectedValues)
      ? selectedValues.filter((saved) => saved.trim() === rejected.value)
      : []
    if (savedValues.length > 0) return { declaration, value: rejected.value, savedValues }
  }
  return null
}

export function valuesWithoutRejectedValue<Values extends { [Key in keyof Values]: FilterValue }>(
  values: Values,
  { declaration, savedValues }: RejectedSavedValue<Values>,
): Values {
  const remainingValues = savedValues.reduce(
    (remaining, saved) =>
      clearedFilterValues(remaining, declaration as FilterDefinition<Values>, saved),
    values,
  )
  const remainingSelection = remainingValues[declaration.key]
  return 'matchKey' in declaration &&
    declaration.matchKey &&
    Array.isArray(remainingSelection) &&
    remainingSelection.length === 0
    ? { ...remainingValues, [declaration.matchKey]: 'any' }
    : remainingValues
}
