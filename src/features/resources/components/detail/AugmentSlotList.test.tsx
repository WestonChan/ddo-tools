import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HoverCardProvider } from '../../../../components'
import { AugmentSlotList } from './AugmentSlotList'
import type { AugmentSummary, ItemAugmentSlot } from '../../queries/items'

let augmentsBySlotLabel: Record<string, AugmentSummary[]> = {}
const fittingAugmentsHookMock = vi.fn((label: string | null) => ({
  data: label === null ? undefined : (augmentsBySlotLabel[label] ?? []),
  isPending: false,
  error: null,
}))
vi.mock('../../queries/useItems', () => ({
  useAugment: () => ({ isPending: true }),
  useFittingAugmentsBySlotLabel: (label: string | null) => fittingAugmentsHookMock(label),
}))

beforeEach(() => {
  fittingAugmentsHookMock.mockClear()
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
    bonusNames: ['Fire Spell Power +5'],
    recipes: [],
  },
  {
    id: 2,
    name: 'Prismatic Ruby',
    minimumLevel: null,
    slots: ['red', 'blue', 'yellow'],
    bonusNames: [],
    recipes: [],
  },
]

it('makes every socket a button, including empty colour and crafting sockets', () => {
  render(
    <AugmentSlotList
      augmentSlots={[slot(0, 'red'), slot(1, 'sun'), slot(2, "slaver's: prefix", 'slavers')]}
    />,
  )
  expect(screen.getAllByRole('button')).toHaveLength(3)
  expect(screen.getByRole('button', { name: /Red/ })).toHaveAttribute('aria-expanded', 'false')
})

it('opens a plain ledger of fitting augments with name, level and slots but no selection roles', async () => {
  render(<AugmentSlotList augmentSlots={[slot(0, 'red')]} />)
  expect(fittingAugmentsHookMock).toHaveBeenLastCalledWith(null)
  await userEvent.click(screen.getByRole('button', { name: /Red/ }))
  expect(fittingAugmentsHookMock).toHaveBeenLastCalledWith('red')
  expect(screen.getByRole('table', { name: /Augments that fit the Red slot/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /ML/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /Slots/ })).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Ruby of Flame/ })).toHaveTextContent('red · colorless')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(screen.queryByRole('option')).toBeNull()
  await userEvent.click(screen.getByRole('row', { name: /Ruby of Flame/ }))
  expect(document.querySelector('[aria-selected]')).toBeNull()
})

it('toggles with keyboard, allows ledger arrows, and closes on Escape', async () => {
  render(<AugmentSlotList augmentSlots={[slot(0, 'red')]} />)
  const button = screen.getByRole('button', { name: /Red/ })
  button.focus()
  await userEvent.keyboard('{Enter}')
  const rows = screen.getAllByRole('row').filter((row) => row.classList.contains('ledger-row'))
  rows[0].focus()
  await userEvent.keyboard('{ArrowDown}')
  expect(rows[1]).toHaveFocus()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('table')).toBeNull()
  expect(button).toHaveAttribute('aria-expanded', 'false')
})

it('closes the first table when another socket opens and closes on a second click', async () => {
  render(<AugmentSlotList augmentSlots={[slot(0, 'red'), slot(1, 'sun')]} />)
  const red = screen.getByRole('button', { name: /Red/ })
  const sun = screen.getByRole('button', { name: /Sun/ })
  await userEvent.click(red)
  expect(screen.getByText('Ruby of Flame')).toBeInTheDocument()
  await userEvent.click(sun)
  expect(screen.queryByText('Ruby of Flame')).toBeNull()
  expect(screen.getByText('Solar Gem')).toBeInTheDocument()
  await userEvent.click(sun)
  expect(screen.queryByRole('table')).toBeNull()
})

it('lets Escape close the augment hover card before closing its table', async () => {
  render(
    <HoverCardProvider>
      <AugmentSlotList augmentSlots={[slot(0, 'red')]} />
    </HoverCardProvider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /Red/ }))
  const row = screen.getByRole('row', { name: /Ruby of Flame/ })
  await userEvent.hover(row)
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('table')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('table')).toBeNull()
})
