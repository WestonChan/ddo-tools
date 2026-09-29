import type { JSX } from 'react'

export type DropTag = 'raid' | 'rare'

const DROP_TAG_LABELS: Record<DropTag, string> = {
  raid: 'Raid',
  rare: 'Rare',
}

export function DropTagChip({ kind: tag }: { kind: DropTag }): JSX.Element {
  return (
    <span className="resources-chip" data-kind={tag}>
      {DROP_TAG_LABELS[tag]}
    </span>
  )
}
