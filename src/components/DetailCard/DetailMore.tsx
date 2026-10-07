import { useState, type ComponentType, type JSX } from 'react'

export function DetailMoreButton({
  isExpanded,
  onToggle,
  collapsedLabel,
}: {
  isExpanded: boolean
  onToggle: () => void
  collapsedLabel: string
}): JSX.Element {
  return (
    <button
      type="button"
      className="detail-card__more"
      aria-expanded={isExpanded}
      onClick={onToggle}
    >
      {isExpanded ? 'Show less' : collapsedLabel}
    </button>
  )
}

export function DetailMore<Entry>({
  entries,
  View,
  visibleCount,
}: {
  entries: readonly Entry[]
  View: ComponentType<{ entries: readonly Entry[] }>
  visibleCount: number
}): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const hiddenCount = Math.max(0, entries.length - visibleCount)
  const displayedEntries = isExpanded ? entries : entries.slice(0, visibleCount)
  return (
    <>
      <View entries={displayedEntries} />
      {hiddenCount > 0 && (
        <DetailMoreButton
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
          collapsedLabel={`+${hiddenCount} more`}
        />
      )}
    </>
  )
}
