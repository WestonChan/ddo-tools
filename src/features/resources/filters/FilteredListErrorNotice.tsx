import type { ReactNode } from 'react'
import type { FilterValue } from './filterModel'
import type { DeclaredFilter } from './filterOptionSources'
import { rejectedSavedValue, valuesWithoutRejectedValue } from './rejectedSavedValues'
import { RejectedSavedValueNotice } from './RejectedSavedValueNotice'

interface FilteredListErrorNoticeProps<Values extends { [Key in keyof Values]: FilterValue }> {
  error: unknown
  declarations: readonly DeclaredFilter<Values>[]
  values: Values
  onChange: (values: Values) => void
  children: ReactNode
}

export function FilteredListErrorNotice<Values extends { [Key in keyof Values]: FilterValue }>({
  error,
  declarations,
  values,
  onChange,
  children,
}: FilteredListErrorNoticeProps<Values>): ReactNode {
  const rejected = rejectedSavedValue(error, declarations, values)
  if (!rejected) return children
  return (
    <RejectedSavedValueNotice
      label={rejected.declaration.label}
      value={rejected.value}
      onRemove={() => onChange(valuesWithoutRejectedValue(values, rejected))}
    />
  )
}
