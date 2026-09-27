import { useRef, useState, type JSX, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TooltipWrapper } from '../../../../components'
import { isFamilySlot, type AugmentCandidate, type ItemAugmentSlot } from '../../queries/items'
import { formatSlotLabel } from './formatSlotLabel'

interface AugmentSlotListProps {
  slots: ItemAugmentSlot[]
  candidates: Record<string, AugmentCandidate[]>
}

export function AugmentSlotList({ slots, candidates }: AugmentSlotListProps): JSX.Element {
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const open = slots.find((s) => s.sort_order === openSlot) ?? null
  const openCandidates = open ? (candidates[open.label] ?? []) : []
  const panelOpen = open !== null && openCandidates.length > 0

  return (
    <div className="resources-augment-slots">
      <ul className="resources-augment-list">
        {slots.map((slot) => (
          <li key={slot.sort_order} className="resources-augment-slot" data-color={slot.label}>
            {renderSlot(slot)}
          </li>
        ))}
      </ul>
      {panelOpen && (
        <ul
          ref={listRef}
          className="resources-augment-candidates"
          id={candidatePanelId(open.sort_order)}
          role="listbox"
          aria-label={`Augments that fit the ${formatSlotLabel(open.label)} slot`}
          onKeyDown={handleListKeyDown}
        >
          {openCandidates.map((augment, index) => (
            <li
              key={augment.augment_id}
              className={
                'resources-augment-candidate hoverable' +
                (picked === augment.augment_id ? ' selected' : '')
              }
              role="option"
              aria-selected={picked === augment.augment_id}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => {
                setActiveIndex(index)
                togglePicked(augment.augment_id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  togglePicked(augment.augment_id)
                }
              }}
            >
              <span className="resources-augment-candidate-name">{augment.name}</span>
              {augment.min_level !== null && (
                <span className="resources-augment-candidate-level">ML {augment.min_level}</span>
              )}
              {augment.bonuses.length > 0 && (
                <span className="resources-augment-candidate-bonuses">
                  {augment.bonuses.join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  function togglePicked(augmentId: number): void {
    setPicked((current) => (current === augmentId ? null : augmentId))
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>): void {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = Math.min(Math.max(activeIndex + step, 0), openCandidates.length - 1)
    setActiveIndex(next)
    const options = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')
    options?.[next]?.focus()
  }

  function renderSlot(slot: ItemAugmentSlot): JSX.Element {
    const isFamily = isFamilySlot(slot.family)
    const gem = isFamily ? null : (
      <span
        className="resources-augment-gem"
        role="img"
        aria-label={`${slot.label} augment slot`}
      />
    )
    const label = formatSlotLabel(slot.label)
    const list = candidates[slot.label] ?? []

    if (list.length === 0 && !isFamily) {
      return <TooltipWrapper text={`${label} augment slot`}>{gem}</TooltipWrapper>
    }

    if (list.length === 0) {
      return <span className="resources-augment-pill">{label}</span>
    }

    const expanded = openSlot === slot.sort_order
    return (
      <button
        type="button"
        className="resources-augment-pill resources-augment-control hoverable"
        aria-expanded={expanded}
        aria-controls={expanded ? candidatePanelId(slot.sort_order) : undefined}
        onClick={() => {
          setOpenSlot(expanded ? null : slot.sort_order)
          setPicked(null)
          setActiveIndex(0)
        }}
      >
        {gem}
        <span className="resources-augment-label">{label}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
    )
  }
}

function candidatePanelId(sortOrder: number): string {
  return `augment-candidates-${sortOrder}`
}
