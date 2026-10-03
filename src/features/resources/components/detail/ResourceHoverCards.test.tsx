import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HoverCardProvider } from '../../../../components'
import { QuestHoverAnchor, SetHoverAnchor } from './ResourceHoverCards'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('../../queries/useItems', () => ({
  useQuest: () => ({
    isPending: false,
    data: {
      id: 7,
      name: 'The Storm',
      pack: 'Storm Pack',
      isRaid: true,
      items: [
        {
          id: 11,
          name: 'Storm Blade',
          slot: 'Main Hand',
          minimumLevel: 20,
        },
        {
          id: 11,
          name: 'Storm Blade',
          slot: 'Main Hand',
          minimumLevel: 20,
        },
      ],
    },
  }),
  useSet: () => ({
    isPending: false,
    data: {
      id: 3,
      name: 'Storm Set',
      items: [{ id: 11, name: 'Storm Blade', slot: 'Main Hand', minimumLevel: 20 }],
      tiers: [
        {
          equippedCount: 2,
          description: 'Storm tier unlock',
          bonuses: [
            {
              key: 'bonus-1',
              name: 'Fire Spell Power',
              description: 'Fire damage boost',
              type: 'Artifact',
              value: 20,
            },
          ],
        },
      ],
    },
  }),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('shows a quest’s pack, raid flag, and unique loot item, then opens that item', () => {
  vi.useFakeTimers()
  const openItem = vi.fn()
  render(
    <HoverCardProvider>
      <QuestHoverAnchor questId={7} onOpenItem={openItem}>
        Quest
      </QuestHoverAnchor>
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Quest'))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('The Storm')
  expect(card).toHaveTextContent('Storm Pack · Raid')
  expect(within(card).getAllByText('Storm Blade')).toHaveLength(1)
  fireEvent.click(within(card).getByRole('button', { name: /Storm Blade/ }))
  expect(openItem).toHaveBeenCalledWith(11, 'Storm Blade')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('shows set pieces and tier bonuses', () => {
  vi.useFakeTimers()
  const openItem = vi.fn()
  render(
    <HoverCardProvider>
      <SetHoverAnchor setId={3} name="Storm Set" onOpenItem={openItem} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Storm Set'))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('1 piece')
  expect(card).toHaveTextContent('2 pieces')
  expect(card).toHaveTextContent('Fire Spell Power')
  expect(card).toHaveTextContent('Storm tier unlock')
  fireEvent.click(within(card).getByRole('button', { name: /Storm Blade/ }))
  expect(openItem).toHaveBeenCalledWith(11, 'Storm Blade')
  expect(screen.queryByRole('dialog')).toBeNull()
})
