import type { FilterOption } from '../../../components'

export interface NumericRange {
  min: string
  max: string
}

export type FilterValue = string | string[] | NumericRange | boolean

export interface RangeDefinition {
  minLabel: string
  maxLabel: string
  minimum: number
  maximum: number
  minPlaceholder: string
  maxPlaceholder: string
  hint: string
}

interface FilterDefinitionBase<Key extends string> {
  key: Key
  label: string
  group?: string
  formatValue?: (value: FilterValue) => string
}

export type AnyFilterDefinition =
  | (FilterDefinitionBase<string> & {
      kind: 'single' | 'multi'
      options?: FilterOption[]
      searchPlaceholder?: string
    })
  | (FilterDefinitionBase<string> & { kind: 'range'; range: RangeDefinition })
  | (FilterDefinitionBase<string> & { kind: 'toggle' })

export type FilterDefinition<Values extends { [Key in keyof Values]: FilterValue }> = {
  [Key in keyof Values & string]: Values[Key] extends NumericRange
    ? FilterDefinitionBase<Key> & { kind: 'range'; range: RangeDefinition }
    : Values[Key] extends string[]
      ? FilterDefinitionBase<Key> & {
          kind: 'multi'
          options?: FilterOption[]
          searchPlaceholder?: string
        }
      : Values[Key] extends boolean
        ? FilterDefinitionBase<Key> & { kind: 'toggle' }
        : Values[Key] extends string
          ? FilterDefinitionBase<Key> & {
              kind: 'single'
              options?: FilterOption[]
              searchPlaceholder?: string
            }
          : never
}[keyof Values & string]

export interface AppliedFilterValue {
  key: string
  label: string
  value: string | boolean
  text: string
}

function isNumericRange(value: FilterValue | undefined): value is NumericRange {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function appliedFilterValues<Values extends { [Key in keyof Values]: FilterValue }>(
  definitions: readonly FilterDefinition<Values>[],
  values: Values,
): AppliedFilterValue[] {
  return definitions.flatMap<AppliedFilterValue>((definition) => {
    const selectedValue = values[definition.key]
    if (definition.kind === 'range') {
      if (!isNumericRange(selectedValue)) return []
      return (['min', 'max'] as const)
        .filter((bound) => !!selectedValue[bound])
        .map((bound) => ({
          key: definition.key,
          label: definition.label,
          value: bound,
          text: `${bound === 'min' ? '≥' : '≤'} ${selectedValue[bound]}`,
        }))
    }
    if (definition.kind === 'multi') {
      if (!Array.isArray(selectedValue)) return []
      return selectedValue.map((selected) => ({
        key: definition.key,
        label: definition.label,
        value: selected,
        text: definition.options?.find((option) => option.value === selected)?.label ?? selected,
      }))
    }
    if (typeof selectedValue !== 'string' && typeof selectedValue !== 'boolean') return []
    if (!selectedValue) return []
    return [
      {
        key: definition.key,
        label: definition.label,
        value: selectedValue,
        text:
          definition.kind === 'toggle'
            ? definition.label
            : (definition.options?.find((option) => option.value === selectedValue)?.label ??
              String(selectedValue)),
      },
    ]
  })
}

export function clearedFilterValues<Values extends { [Key in keyof Values]: FilterValue }>(
  values: Values,
  definition: FilterDefinition<Values>,
  value: string | boolean,
): Values {
  const selectedValue = values[definition.key]
  if (definition.kind === 'range') {
    const range = isNumericRange(selectedValue) ? selectedValue : { min: '', max: '' }
    return { ...values, [definition.key]: { ...range, [String(value)]: '' } }
  }
  if (definition.kind === 'multi') {
    return {
      ...values,
      [definition.key]: Array.isArray(selectedValue)
        ? selectedValue.filter((selected) => selected !== value)
        : [],
    }
  }
  return { ...values, [definition.key]: definition.kind === 'toggle' ? false : '' }
}

export function clearedFilterChipValues<Values extends { [Key in keyof Values]: FilterValue }>(
  values: Values,
  definition: FilterDefinition<Values>,
): Values {
  const emptyValue =
    definition.kind === 'range'
      ? { min: '', max: '' }
      : definition.kind === 'multi'
        ? []
        : definition.kind === 'toggle'
          ? false
          : ''
  return { ...values, [definition.key]: emptyValue }
}

export function commitNumericRange(
  min: string,
  max: string,
  minimum: number,
  maximum: number,
): NumericRange {
  function normalizedBound(text: string): string {
    if (text.trim() === '') return ''
    const parsed = Number(text)
    return Number.isFinite(parsed)
      ? String(Math.max(minimum, Math.min(maximum, Math.round(parsed))))
      : ''
  }
  const normalizedMin = normalizedBound(min)
  const normalizedMax = normalizedBound(max)
  if (normalizedMin && normalizedMax && Number(normalizedMin) > Number(normalizedMax)) {
    return { min: normalizedMax, max: normalizedMin }
  }
  return { min: normalizedMin, max: normalizedMax }
}

export function isFilterSet(
  definition: AnyFilterDefinition,
  value: FilterValue | undefined,
): boolean {
  if (definition.kind === 'range') return isNumericRange(value) && !!(value.min || value.max)
  if (definition.kind === 'multi') return Array.isArray(value) && value.length > 0
  return !!value
}

export function filterChipText(
  definition: AnyFilterDefinition,
  value: FilterValue | undefined,
): string {
  if (!isFilterSet(definition, value)) return definition.label
  if (value !== undefined && definition.formatValue) return definition.formatValue(value)
  if (definition.kind === 'range' && isNumericRange(value)) {
    return value.min && value.max
      ? `${value.min}–${value.max}`
      : value.min
        ? `≥ ${value.min}`
        : `≤ ${value.max}`
  }
  if (definition.kind === 'multi' && Array.isArray(value)) {
    return `${definition.label} · ${value.length}`
  }
  if (definition.kind === 'toggle') return definition.label
  if (definition.kind === 'single') {
    return `${definition.label} · ${definition.options?.find((option) => option.value === value)?.label ?? String(value)}`
  }
  return definition.label
}
