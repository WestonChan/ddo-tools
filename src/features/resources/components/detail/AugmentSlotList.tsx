import { useRef, useState, type JSX, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TooltipWrapper } from '../../../../components'
import { isFamilySlot, type AugmentCandidate, type ItemAugmentSlot } from '../../queries/items'
import { formatSlotLabel } from './formatSlotLabel'

interface AugmentSlotListProps {
  slots: ItemAugmentSlot[]
  /** Candidate augments keyed by `slot_id`, from `getItemDetail`. A socket with
   *  no entry (or an empty one) simply renders no list. */
  candidates: Record<number, AugmentCandidate[]>
}

/**
 * The augment sockets on an item.
 *
 * Two shapes, because two kinds of socket read differently to a player:
 *
 * - A colour socket is a gem, exactly as it has always rendered. It accepts
 *   hundreds of augments, so a list would be noise.
 * - A crafting socket (Lamordia, Isle of Dread, Slaver's) and the Sun/Moon
 *   colours draw from a short purpose-made pool, so they get a labelled
 *   control that expands to that pool.
 *
 * Selection is display-only: Resources is a browse view with no character to
 * socket an augment into, so a picked row highlights and nothing persists.
 * Real socketing arrives with the gear planner (roadmap Phase 8).
 *
 * State is per-item — the caller remounts this on navigation (keyed on the
 * item id) so an expanded slot does not follow the player to the next item.
 */
export function AugmentSlotList({ slots, candidates }: AugmentSlotListProps): JSX.Element {
  // Keyed by sort_order — an item can carry the same slot twice, and the
  // player expects the one they clicked to open.
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  // Roving tabindex: one stop for the whole listbox, arrows move within it.
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const open = slots.find((s) => s.sort_order === openSlot) ?? null
  const openCandidates = open ? (candidates[open.slot_id] ?? []) : []
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
              // `selected` is the `.hoverable` utility's own opt-out, and the
              // single hook the stylesheet keys off: without it the hover
              // background keeps painting over the row the user just picked.
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
    const list = candidates[slot.slot_id] ?? []

    // A colour socket with no candidate list is the original rendering: the
    // gem alone, with the colour named in a tooltip.
    if (list.length === 0 && !isFamily) {
      return <TooltipWrapper text={`${label} augment slot`}>{gem}</TooltipWrapper>
    }

    // A family socket the pipeline has no augments for — Slaver's slots, which
    // Slave Lords crafting fills with shards rather than augments. There is
    // nothing to expand, so it is a plain labelled pill.
    if (list.length === 0) {
      return <span className="resources-augment-pill">{label}</span>
    }

    const expanded = openSlot === slot.sort_order
    return (
      <button
        type="button"
        className="resources-augment-pill resources-augment-control hoverable"
        aria-expanded={expanded}
        // Only while the panel exists: aria-controls pointing at an absent id
        // is a dangling reference to a screen reader.
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
