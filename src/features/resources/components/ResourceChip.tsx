import type { JSX } from 'react'

/** Chip kinds, each with its own `data-kind` styling in ResourcesView.css. */
export type ResourceChipKind = 'raid'

const CHIP_LABELS: Record<ResourceChipKind, string> = {
  raid: 'Raid',
}

/**
 * Small status chip used wherever the picker and the detail drawer surface
 * the same raid fact. Shared so both panels render it identically.
 *
 * Casing lives in CSS (`text-transform: uppercase`), so the DOM text stays
 * sentence case for screen readers.
 */
export function ResourceChip({ kind }: { kind: ResourceChipKind }): JSX.Element {
  return (
    <span className="resources-chip" data-kind={kind}>
      {CHIP_LABELS[kind]}
    </span>
  )
}
