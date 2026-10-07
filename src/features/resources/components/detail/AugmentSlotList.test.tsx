import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useId, useRef, useState, type JSX } from 'react'
import { HoverCardProvider } from '../../../../components'
import { AugmentCandidateLedger, AugmentSlotList } from './AugmentSlotList'
import type { AugmentSummary, ItemAugmentSlot } from '../../queries/items'
import { ApiError, API_HTTP_ERROR } from '../../../../lib/api'
import type { ApiItemDetail } from '../../../../lib/api'
import { toItem } from '../../queries/items'
import capturedRing from '../../queries/fixtures/effects-item-487.json'

let augmentsBySlotLabel: Record<string, AugmentSummary[]> = {}
let augmentError: ApiError | null = null
const refetchAugments = vi.fn()
const fittingAugmentsHookMock = vi.fn((label: string | null) => ({
  data: label === null || augmentError ? undefined : (augmentsBySlotLabel[label] ?? []),
  isPending: false,
  error: augmentError,
  refetch: refetchAugments,
}))
vi.mock('../../queries/useItems', () => ({
  useAugment: () => ({ isPending: true }),
  useFittingAugmentsBySlotLabel: (label: string | null) => fittingAugmentsHookMock(label),
}))

beforeEach(() => {
  fittingAugmentsHookMock.mockClear()
  augmentError = null
  augmentsBySlotLabel = {
    red: RED_AUGMENTS,
    sun: [{ ...RED_AUGMENTS[0], id: 3, name: 'Solar Gem', slots: ['sun'] }],
  }
})
afterEach(cleanup)

function slot(sortOrder: number, label: string, family = 'standard'): ItemAugmentSlot {
  return { sortOrder, label, family, qualifier: null, options: [] }
}

const RED_AUGMENTS: AugmentSummary[] = [
  {
    id: 1,
    name: 'Ruby of Flame',
    minimumLevel: 8,
    slots: ['red', 'colorless'],
    recipes: [],
  },
  {
    id: 2,
    name: 'Prismatic Ruby',
    minimumLevel: null,
    slots: ['red', 'blue', 'yellow'],
    recipes: [],
  },
]

function AugmentSlotPicker({ augmentSlots }: { augmentSlots: ItemAugmentSlot[] }): JSX.Element {
  const [expandedSlotSortOrder, setExpandedSlotSortOrder] = useState<number | null>(null)
  const expandedSocketButtonRef = useRef<HTMLButtonElement | null>(null)
  const ledgerId = useId()
  const expandedSlot = augmentSlots.find((slot) => slot.sortOrder === expandedSlotSortOrder)
  function closeExpandedSocket(): void {
    expandedSocketButtonRef.current?.focus()
    setExpandedSlotSortOrder(null)
  }
  return (
    <>
      <AugmentSlotList
        augmentSlots={augmentSlots}
        expandedSlotSortOrder={expandedSlotSortOrder}
        ledgerId={ledgerId}
        expandedSocketButtonRef={expandedSocketButtonRef}
        onToggleSlot={(sortOrder) =>
          setExpandedSlotSortOrder((current) => (current === sortOrder ? null : sortOrder))
        }
        onClose={closeExpandedSocket}
      />
      {expandedSlot && (
        <AugmentCandidateLedger
          slot={expandedSlot}
          ledgerId={ledgerId}
          onClose={closeExpandedSocket}
        />
      )}
    </>
  )
}

it('makes colour symbols and unchanged named sockets buttons', () => {
  render(
    <AugmentSlotPicker
      augmentSlots={[
        slot(0, 'red'),
        slot(1, 'sun'),
        slot(2, "slaver's: prefix", 'slavers'),
        slot(3, 'constructor', 'crafting'),
      ]}
    />,
  )
  expect(screen.getAllByRole('button')).toHaveLength(4)
  expect(screen.getByRole('button', { name: 'Red slot' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Red slot' })).toHaveAttribute('data-tip', 'Red slot')
  expect(document.querySelector('.resources-augment-gem')).toBeNull()
  expect(document.querySelector('.resources-augment-label')).toBeNull()
  expect(screen.getByRole('button', { name: 'Red slot' })).toHaveClass('augment-slot-symbol')
  expect(screen.getByRole('button', { name: 'Sun slot' })).toHaveClass('augment-slot-symbol')
  expect(screen.getByRole('button', { name: 'Sun slot' })).toHaveTextContent('S')
  expect(screen.getByRole('button', { name: "Slaver's: Prefix" })).toHaveClass('augment-slot-word')
  expect(screen.getByRole('button', { name: 'Constructor' })).toHaveClass('augment-slot-word')
})

it('maps API socket families and labels to symbols or words without changing the ledger label', async () => {
  const apiSlot = capturedRing.augment_slots[0]
  const apiSlots = [
    ['standard', 'sun', 'S', 'Sun slot', 'augment-slot-symbol--sun'],
    ['standard', 'moon', 'M', 'Moon slot', 'augment-slot-symbol--moon'],
    [
      'dino',
      'isle of dread: artifact scale (accessory)',
      'D',
      'Isle of Dread: Artifact Scale (Accessory) slot',
      'augment-slot-symbol--dino',
    ],
    [
      'crafting',
      'crafting: variant',
      'Crafting: Variant',
      'Crafting: Variant',
      'augment-slot-word',
    ],
    [
      'lamordia',
      'lamordia: melancholic (accessory)',
      'Lamordia: Melancholic (Accessory)',
      'Lamordia: Melancholic (Accessory)',
      'augment-slot-word',
    ],
    ['upgrade', 'upgrade: tier 1', 'Upgrade: Tier 1', 'Upgrade: Tier 1', 'augment-slot-word'],
  ] as const
  const augmentSlots = toItem({
    ...capturedRing,
    augment_slots: apiSlots.map(([family, label], sort_order) => ({
      ...apiSlot,
      family,
      label,
      variant: label,
      sort_order,
    })),
  } as ApiItemDetail).augmentSlots

  render(<AugmentSlotPicker augmentSlots={augmentSlots} />)

  for (const [, , letterOrWord, accessibleName, className] of apiSlots) {
    const button = screen.getByRole('button', { name: accessibleName })
    expect(button).toHaveTextContent(letterOrWord)
    expect(button).toHaveClass(className)
    expect(button).toHaveAttribute('data-tip', `${accessibleName.replace(/ slot$/, '')} slot`)
    if (className.startsWith('augment-slot-symbol')) {
      expect(button.parentElement?.querySelector('.augment-slot-focus-ring')).not.toBeNull()
    }
  }
  await userEvent.click(
    screen.getByRole('button', { name: 'Isle of Dread: Artifact Scale (Accessory) slot' }),
  )
  expect(fittingAugmentsHookMock).toHaveBeenLastCalledWith(
    'isle of dread: artifact scale (accessory)',
  )
})

it('shows each standard socket as a labelled letter in source order', () => {
  const colors = ['blue', 'red', 'yellow', 'green', 'purple', 'orange', 'colorless']
  render(<AugmentSlotPicker augmentSlots={colors.map((color, index) => slot(index, color))} />)
  expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
    'B',
    'R',
    'Y',
    'G',
    'P',
    'O',
    'C',
  ])
  for (const color of colors) {
    const symbol = screen.getByRole('button', {
      name: `${color[0].toUpperCase()}${color.slice(1)} slot`,
    })
    expect(symbol).toHaveClass('augment-slot-symbol')
    if (color === 'colorless') expect(symbol).toHaveClass('augment-slot-symbol--colorless')
    expect(symbol.parentElement?.querySelector('.augment-slot-focus-ring')).not.toBeNull()
    expect(symbol.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(symbol).toHaveAttribute('data-tip', `${color[0].toUpperCase()}${color.slice(1)} slot`)
  }
})

it('opens a plain ledger of fitting augments with name, level and slots but no selection roles', async () => {
  render(<AugmentSlotPicker augmentSlots={[slot(0, 'red')]} />)
  expect(fittingAugmentsHookMock).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: /Red slot/ }))
  expect(fittingAugmentsHookMock).toHaveBeenLastCalledWith('red')
  expect(screen.getByText('Red socket · 2 augments')).toBeInTheDocument()
  expect(screen.getByRole('table', { name: /Augments that fit the Red slot/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /ML/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /Slots/ })).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Ruby of Flame/ })).toHaveTextContent('Red · Colorless')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(screen.queryByRole('option')).toBeNull()
  await userEvent.click(screen.getByRole('row', { name: /Ruby of Flame/ }))
  expect(document.querySelector('[aria-selected]')).toBeNull()
})

it('reports an API-rejected augment search with a retry action', async () => {
  augmentError = new ApiError(API_HTTP_ERROR, 400, 'Unknown slot parameter')
  render(<AugmentSlotPicker augmentSlots={[slot(0, 'red')]} />)
  await userEvent.click(screen.getByRole('button', { name: /Red slot/ }))
  expect(screen.getByText('Something went wrong on our side.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Report a bug' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(refetchAugments).toHaveBeenCalledOnce()
})

it('tabs into the augment ledger and closes its socket from a row on Escape', async () => {
  render(<AugmentSlotPicker augmentSlots={[slot(0, 'red')]} />)
  const button = screen.getByRole('button', { name: /Red slot/ })
  button.focus()
  await userEvent.keyboard('{Enter}')
  const rows = screen.getAllByRole('row').filter((row) => row.classList.contains('ledger-row'))
  const body = document.querySelector<HTMLElement>('.ledger-plain-body')!
  expect(body).not.toHaveAttribute('tabindex')
  expect(rows.filter((row) => row.tabIndex === 0)).toHaveLength(1)
  screen.getByRole('columnheader', { name: 'Name' }).focus()
  await userEvent.tab()
  expect(rows[0]).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}')
  expect(rows[1]).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(rows[1]).toHaveFocus()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('table')).toBeNull()
  expect(button).toHaveAttribute('aria-expanded', 'false')
})

it('closes a socket from a row while its hover card is still pending inside a detail pane', async () => {
  render(
    <HoverCardProvider>
      <section data-detail-pane="">
        <AugmentSlotPicker augmentSlots={[slot(0, 'red')]} />
      </section>
    </HoverCardProvider>,
  )
  const redSocket = screen.getByRole('button', { name: 'Red slot' })
  await userEvent.click(redSocket)
  screen.getByRole('columnheader', { name: 'Name' }).focus()
  await userEvent.tab()
  expect(screen.getByRole('row', { name: /Ruby of Flame/ })).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()

  await userEvent.keyboard('{Escape}')

  expect(screen.queryByRole('table')).toBeNull()
  expect(redSocket).toHaveFocus()
})

it('closes the first table when another socket opens and closes on a second click', async () => {
  render(<AugmentSlotPicker augmentSlots={[slot(0, 'red'), slot(1, 'sun')]} />)
  const red = screen.getByRole('button', { name: /Red slot/ })
  const sun = screen.getByRole('button', { name: /Sun/ })
  await userEvent.click(red)
  expect(screen.getByText('Ruby of Flame')).toBeInTheDocument()
  sun.focus()
  await userEvent.keyboard('{Enter}')
  expect(fittingAugmentsHookMock).toHaveBeenLastCalledWith('sun')
  expect(screen.queryByText('Ruby of Flame')).toBeNull()
  expect(screen.getByText('Solar Gem')).toBeInTheDocument()
  expect(screen.getByText('Sun socket · 1 augment')).toBeInTheDocument()
  await userEvent.click(sun)
  expect(screen.queryByRole('table')).toBeNull()
})

it('closes an unpinned augment card before leaving the row and pops a pinned card', async () => {
  render(
    <HoverCardProvider>
      <AugmentSlotPicker augmentSlots={[slot(0, 'red')]} />
    </HoverCardProvider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /Red slot/ }))
  screen.getByRole('columnheader', { name: 'Name' }).focus()
  await userEvent.tab()
  const row = screen.getByRole('row', { name: /Ruby of Flame/ })
  expect(row).toHaveFocus()
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  await userEvent.keyboard('{Escape}')
  expect(row).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('table')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('table')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: /Red slot/ }))
  screen.getByRole('columnheader', { name: 'Name' }).focus()
  await userEvent.tab()
  const reopenedRow = screen.getByRole('row', { name: /Ruby of Flame/ })
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  await userEvent.keyboard('t')
  expect(reopenedRow).toHaveAttribute('data-hover-card-pinned')
  expect(screen.getByRole('dialog')).toHaveFocus()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(reopenedRow).toHaveFocus()
  expect(screen.getByRole('table')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('table')).toBeNull()
})
