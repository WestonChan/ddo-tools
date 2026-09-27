import type { JSX } from 'react'

export type ResourceChipKind = 'raid'

const CHIP_LABELS: Record<ResourceChipKind, string> = {
  raid: 'Raid',
}

export function ResourceChip({ kind }: { kind: ResourceChipKind }): JSX.Element {
  return (
    <span className="resources-chip" data-kind={kind}>
      {CHIP_LABELS[kind]}
    </span>
  )
}
