import type { JSX } from 'react'

/** Chip kinds, each with its own `data-kind` styling in ResourcesView.css:
 *  `raid` is accent-tinted, `rare` is neutral. */
export type ResourceChipKind = 'raid' | 'rare'

const CHIP_LABELS: Record<ResourceChipKind, string> = {
  raid: 'Raid',
  rare: 'Rare',
}

/**
 * Small status chip used wherever the picker and the detail drawer surface
 * the same raid/rare fact. Shared so both panels render it identically —
 * the drawer previously spelled rare as a literal "(rare)" inside its
 * `·`-joined metadata line, which read like another data point rather than
 * a marker on the drop location.
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
