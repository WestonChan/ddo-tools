import { useRef, useState, type JSX, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { HoverTooltip } from '../../../../components'
import { isCraftingSlotFamily, type AugmentSummary, type ItemAugmentSlot } from '../../queries/items'
import { titleCasedSlotLabel } from './titleCasedSlotLabel'

interface AugmentSlotListProps {
  augmentSlots: ItemAugmentSlot[]
  augmentsBySlotLabel: Record<string, AugmentSummary[]>
}

export function AugmentSlotList({ augmentSlots, augmentsBySlotLabel }: AugmentSlotListProps): JSX.Element {
  const [expandedSlotSortOrder, setExpandedSlotSortOrder] = useState<number | null>(null)
  const [pickedAugmentId, setPickedAugmentId] = useState<number | null>(null)
  const [focusedAugmentIndex, setFocusedAugmentIndex] = useState(0)
  const augmentListboxRef = useRef<HTMLUListElement>(null)

  const expandedSlot = augmentSlots.find((s) => s.sortOrder === expandedSlotSortOrder) ?? null
  const expandedSlotAugments = expandedSlot ? (augmentsBySlotLabel[expandedSlot.label] ?? []) : []
  const isAugmentListboxShown = expandedSlot !== null && expandedSlotAugments.length > 0

  return (
    <div className="resources-augment-slots">
      <ul className="resources-augment-list">
        {augmentSlots.map((slot) => (
          <li key={slot.sortOrder} className="resources-augment-slot" data-color={slot.label}>
            {renderedAugmentSlot(slot)}
          </li>
        ))}
      </ul>
      {isAugmentListboxShown && (
        <ul
          ref={augmentListboxRef}
          className="resources-augment-candidates"
          id={augmentListboxId(expandedSlot.sortOrder)}
          role="listbox"
          aria-label={`Augments that fit the ${titleCasedSlotLabel(expandedSlot.label)} slot`}
          onKeyDown={moveAugmentFocusWithArrowKeys}
        >
          {expandedSlotAugments.map((augment, index) => (
            <li
              key={augment.id}
              className={
                'resources-augment-candidate hoverable' +
                (pickedAugmentId === augment.id ? ' selected' : '')
              }
              role="option"
              aria-selected={pickedAugmentId === augment.id}
              tabIndex={index === focusedAugmentIndex ? 0 : -1}
              onClick={() => {
                setFocusedAugmentIndex(index)
                togglePickedAugment(augment.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  togglePickedAugment(augment.id)
                }
              }}
            >
              <span className="resources-augment-candidate-name">{augment.name}</span>
              {augment.minimumLevel !== null && (
                <span className="resources-augment-candidate-level">ML {augment.minimumLevel}</span>
              )}
              {augment.bonusNames.length > 0 && (
                <span className="resources-augment-candidate-bonuses">
                  {augment.bonusNames.join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  function togglePickedAugment(augmentId: number): void {
    setPickedAugmentId((current) => (current === augmentId ? null : augmentId))
  }

  function moveAugmentFocusWithArrowKeys(event: KeyboardEvent<HTMLUListElement>): void {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const nextFocusedIndex = Math.min(Math.max(focusedAugmentIndex + step, 0), expandedSlotAugments.length - 1)
    setFocusedAugmentIndex(nextFocusedIndex)
    const augmentOptionElements = augmentListboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]')
    augmentOptionElements?.[nextFocusedIndex]?.focus()
  }

  function renderedAugmentSlot(slot: ItemAugmentSlot): JSX.Element {
    const isFamily = isCraftingSlotFamily(slot.family)
    const gemIcon = isFamily ? null : (
      <span
        className="resources-augment-gem"
        role="img"
        aria-label={`${slot.label} augment slot`}
      />
    )
    const displayedSlotLabel = titleCasedSlotLabel(slot.label)
    const slotAugments = augmentsBySlotLabel[slot.label] ?? []

    if (slotAugments.length === 0 && !isFamily) {
      return <HoverTooltip text={`${displayedSlotLabel} augment slot`}>{gemIcon}</HoverTooltip>
    }

    if (slotAugments.length === 0) {
      return <span className="resources-augment-pill">{displayedSlotLabel}</span>
    }

    const isExpanded = expandedSlotSortOrder === slot.sortOrder
    return (
      <button
        type="button"
        className="resources-augment-pill resources-augment-control hoverable"
        aria-expanded={isExpanded}
        aria-controls={isExpanded ? augmentListboxId(slot.sortOrder) : undefined}
        onClick={() => {
          setExpandedSlotSortOrder(isExpanded ? null : slot.sortOrder)
          setPickedAugmentId(null)
          setFocusedAugmentIndex(0)
        }}
      >
        {gemIcon}
        <span className="resources-augment-label">{displayedSlotLabel}</span>
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
    )
  }
}

function augmentListboxId(slotSortOrder: number): string {
  return `augment-candidates-${slotSortOrder}`
}
