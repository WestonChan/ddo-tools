import type { JSX, RefObject } from 'react'
import {
  ApiErrorNotice,
  AugmentSlotButton,
  LedgerTable,
  type LedgerColumn,
} from '../../../../components'
import type { AugmentSummary, ItemAugmentSlot } from '../../queries/items'
import { useFittingAugmentsBySlotLabel } from '../../queries/useItems'
import { AugmentHoverCard } from './ResourceHoverCards'
import { titleCasedSlotLabel } from './titleCasedSlotLabel'

interface AugmentSlotListProps {
  augmentSlots: ItemAugmentSlot[]
  expandedSlotSortOrder: number | null
  ledgerId: string
  onToggleSlot: (sortOrder: number) => void
  onClose: () => void
  expandedSocketButtonRef: RefObject<HTMLButtonElement | null>
}

const AUGMENT_COLUMNS: LedgerColumn<AugmentSummary>[] = [
  {
    key: 'name',
    label: 'Name',
    isFlexible: true,
    minWidth: 120,
    sortValue: (augment) => augment.name,
    render: (augment) => augment.name,
  },
  {
    key: 'ml',
    label: 'ML',
    width: 48,
    minWidth: 42,
    align: 'right',
    isMonospaced: true,
    defaultSortDirection: 'desc',
    sortValue: (augment) => augment.minimumLevel,
    render: (augment) => augment.minimumLevel ?? '—',
  },
  {
    key: 'slots',
    label: 'Slots',
    width: 126,
    minWidth: 90,
    sortValue: (augment) => augment.slots.join(', '),
    render: (augment) => augment.slots.map(titleCasedSlotLabel).join(' · '),
  },
]

export function AugmentSlotList({
  augmentSlots,
  expandedSlotSortOrder,
  ledgerId,
  onToggleSlot,
  onClose,
  expandedSocketButtonRef,
}: AugmentSlotListProps): JSX.Element {
  return (
    <div
      className="resources-augment-slots"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || expandedSlotSortOrder === null || event.defaultPrevented)
          return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
    >
      <ul className="resources-augment-list">
        {augmentSlots.map((slot) => {
          const isExpanded = expandedSlotSortOrder === slot.sortOrder
          const displayedLabel = titleCasedSlotLabel(slot.label)
          return (
            <li key={slot.sortOrder} className="resources-augment-slot">
              <AugmentSlotButton
                family={slot.family}
                label={slot.label}
                name={displayedLabel}
                ref={isExpanded ? expandedSocketButtonRef : undefined}
                aria-expanded={isExpanded}
                aria-controls={isExpanded ? ledgerId : undefined}
                onClick={() => onToggleSlot(slot.sortOrder)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AugmentCandidateLedger({
  slot,
  ledgerId,
  onClose,
}: {
  slot: ItemAugmentSlot
  ledgerId: string
  onClose: () => void
}): JSX.Element {
  const fittingAugmentsQuery = useFittingAugmentsBySlotLabel(slot.label)
  const fittingAugments = fittingAugmentsQuery.data ?? []
  const socketName = titleCasedSlotLabel(slot.label)
  return (
    <section
      id={ledgerId}
      className="resources-augment-candidates"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
    >
      <h3 className="section-label resources-augment-candidates__heading">
        {socketName} socket · {fittingAugments.length}{' '}
        {fittingAugments.length === 1 ? 'augment' : 'augments'}
      </h3>
      <LedgerTable
        columns={AUGMENT_COLUMNS}
        rowCount={fittingAugments.length}
        rowAt={(index) => fittingAugments[index]}
        rowKey={(augment) => augment.id}
        onRowActivate={() => {}}
        isVirtualized={false}
        isDense
        label={`Augments that fit the ${socketName} slot`}
        emptyState={
          fittingAugmentsQuery.isPending ? (
            'Loading augments…'
          ) : fittingAugmentsQuery.error ? (
            <ApiErrorNotice
              error={fittingAugmentsQuery.error}
              path="/v1/augments"
              onRetry={() => void fittingAugmentsQuery.refetch()}
            />
          ) : (
            'No augments found'
          )
        }
        hoverCard={(augment) => ({
          kind: 'augment',
          delayMs: 120,
          render: () => <AugmentHoverCard augmentId={augment.id} />,
        })}
      />
    </section>
  )
}
