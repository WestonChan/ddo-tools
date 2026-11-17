import type { JSX } from 'react'
import { StatusNotice } from '../../../components'

interface RejectedSavedValueNoticeProps {
  label: string
  value: string
  onRemove: () => void
}

export function RejectedSavedValueNotice({
  label,
  value,
  onRemove,
}: RejectedSavedValueNoticeProps): JSX.Element {
  return (
    <StatusNotice
      heading={`${label}: "${value}" is no longer in the game data.`}
      hint="It was renamed or removed since you saved this filter."
      actions={
        <button type="button" className="btn-primary-sm" onClick={onRemove}>
          Remove from {label}
        </button>
      }
    />
  )
}
