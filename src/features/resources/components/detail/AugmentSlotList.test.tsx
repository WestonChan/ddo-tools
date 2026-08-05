import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AugmentSlotList } from './AugmentSlotList'
import type { AugmentCandidate, ItemAugmentSlot } from '../../queries/items'

afterEach(() => {
  cleanup()
})

// Sockets as `augment_slot_types` rows, ids and all: the component reads
// `family` to decide what to draw and `slot_id` to find the candidate list, so
// a fixture that only carried the label would not exercise either.
const SOCKETS = {
  red: { slot_id: 1, label: 'red', family: 'standard', qualifier: null },
  colorless: { slot_id: 2, label: 'colorless', family: 'standard', qualifier: null },
  sun: { slot_id: 4, label: 'sun', family: 'standard', qualifier: null },
  melancholic: {
    slot_id: 6,
    label: 'lamordia: melancholic (accessory)',
    family: 'lamordia',
    qualifier: 'accessory',
  },
  slavers: {
    slot_id: 7,
    label: "slaver's: prefix (legendary)",
    family: 'slavers',
    qualifier: 'legendary',
  },
  setBonus: {
    slot_id: 14,
    label: 'isle of dread: set bonus',
    family: 'dino',
    qualifier: null,
  },
} satisfies Record<string, Omit<ItemAugmentSlot, 'sort_order'>>

const CANDIDATES: Record<number, AugmentCandidate[]> = {
  [SOCKETS.melancholic.slot_id]: [
    { augment_id: 1, name: 'Melancholic Charisma', min_level: 8, bonuses: ['Charisma +5'] },
    { augment_id: 2, name: 'Melancholic Acid Spell Crit', min_level: 8, bonuses: [] },
  ],
  [SOCKETS.sun.slot_id]: [
    {
      augment_id: 3,
      name: 'Solar Gem of Abjuration (Heroic)',
      min_level: 1,
      bonuses: ['Abjuration Spell Focus +2'],
    },
  ],
  [SOCKETS.slavers.slot_id]: [],
}

function slot(sort_order: number, socket: keyof typeof SOCKETS): ItemAugmentSlot {
  return { sort_order, ...SOCKETS[socket] }
}

describe('AugmentSlotList', () => {
  it('renders a plain colour socket as a gem with no control', () => {
    const { container } = render(
      <AugmentSlotList slots={[slot(0, 'red'), slot(1, 'colorless')]} candidates={{}} />,
    )
    const gems = container.querySelectorAll('.resources-augment-gem')
    expect(gems).toHaveLength(2)
    // data-color is what the stylesheet keys the gem colour off; it must stay
    // the raw stored label, not a display-cased one.
    expect(
      [...container.querySelectorAll('.resources-augment-slot')].map((el) =>
        el.getAttribute('data-color'),
      ),
    ).toEqual(['red', 'colorless'])
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders a crafting slot as an expandable control with a readable label', () => {
    render(<AugmentSlotList slots={[slot(0, 'melancholic')]} candidates={CANDIDATES} />)
    const button = screen.getByRole('button', {
      name: /Lamordia: Melancholic \(Accessory\)/,
    })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    // The panel it would control does not exist yet, and a dangling
    // aria-controls points a screen reader at nothing.
    expect(button).not.toHaveAttribute('aria-controls')
    expect(screen.queryByText('Melancholic Charisma')).toBeNull()
  })

  it('points aria-controls at the panel once it exists', async () => {
    const user = userEvent.setup()
    render(<AugmentSlotList slots={[slot(0, 'melancholic')]} candidates={CANDIDATES} />)
    const button = screen.getByRole('button', { name: /Lamordia: Melancholic/ })

    await user.click(button)

    const panelId = button.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(screen.getByRole('listbox').id).toBe(panelId)
  })

  it('lowercases nothing the player reads but keeps small words in Isle of Dread', () => {
    render(
      <AugmentSlotList
        slots={[slot(0, 'setBonus')]}
        candidates={{ [SOCKETS.setBonus.slot_id]: [] }}
      />,
    )
    expect(screen.getByText('Isle of Dread: Set Bonus')).toBeInTheDocument()
  })

  it('lists the candidate augments when the slot is expanded', async () => {
    const user = userEvent.setup()
    render(<AugmentSlotList slots={[slot(0, 'melancholic')]} candidates={CANDIDATES} />)

    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))

    expect(screen.getByText('Melancholic Charisma')).toBeInTheDocument()
    expect(screen.getByText('Charisma +5')).toBeInTheDocument()
    expect(screen.getAllByText('ML 8')).toHaveLength(2)
    // 430 of 1,279 shipped augments have no resolved bonuses; the row is still
    // the answer to "what fits here".
    expect(screen.getByText('Melancholic Acid Spell Crit')).toBeInTheDocument()
  })

  it('selecting a candidate marks that row and nothing else', async () => {
    const user = userEvent.setup()
    render(<AugmentSlotList slots={[slot(0, 'melancholic')]} candidates={CANDIDATES} />)
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))

    const row = screen.getByRole('option', { name: /Melancholic Charisma/ })
    await user.click(row)

    expect(row).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: /Melancholic Acid Spell Crit/ })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('moves between candidates with the arrow keys, one tab stop for the list', async () => {
    const user = userEvent.setup()
    render(<AugmentSlotList slots={[slot(0, 'melancholic')]} candidates={CANDIDATES} />)
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))

    const [first, second] = screen.getAllByRole('option')
    // Roving tabindex: tabbing into the list lands on one option, not every one.
    expect(first).toHaveAttribute('tabindex', '0')
    expect(second).toHaveAttribute('tabindex', '-1')

    first.focus()
    await user.keyboard('{ArrowDown}')

    expect(second).toHaveFocus()
    expect(second).toHaveAttribute('tabindex', '0')
    expect(first).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{Enter}')
    expect(second).toHaveAttribute('aria-selected', 'true')
  })

  it('does not move past the ends of the candidate list', async () => {
    const user = userEvent.setup()
    render(<AugmentSlotList slots={[slot(0, 'melancholic')]} candidates={CANDIDATES} />)
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))
    const [first] = screen.getAllByRole('option')

    first.focus()
    await user.keyboard('{ArrowUp}')

    expect(first).toHaveFocus()
  })

  it('opens one slot at a time', async () => {
    const user = userEvent.setup()
    render(
      <AugmentSlotList slots={[slot(0, 'melancholic'), slot(1, 'sun')]} candidates={CANDIDATES} />,
    )
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))
    await user.click(screen.getByRole('button', { name: /Sun/ }))

    expect(screen.getByText('Solar Gem of Abjuration (Heroic)')).toBeInTheDocument()
    expect(screen.queryByText('Melancholic Charisma')).toBeNull()
  })

  it('closes an open slot when its control is clicked again', async () => {
    const user = userEvent.setup()
    render(<AugmentSlotList slots={[slot(0, 'melancholic')]} candidates={CANDIDATES} />)
    const button = screen.getByRole('button', { name: /Lamordia: Melancholic/ })

    await user.click(button)
    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Melancholic Charisma')).toBeNull()
  })

  it('keeps the gem on a Sun socket that also expands', () => {
    const { container } = render(
      <AugmentSlotList slots={[slot(0, 'sun')]} candidates={CANDIDATES} />,
    )
    expect(container.querySelector('.resources-augment-gem')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Sun/ })).toBeInTheDocument()
  })

  it("renders a Slaver's slot as a plain pill because no augment fits it", () => {
    // Slave Lords crafting fills these with shards from the Slave Lords
    // crafting system, so there is nothing to choose from here.
    render(<AugmentSlotList slots={[slot(0, 'slavers')]} candidates={CANDIDATES} />)
    expect(screen.getByText("Slaver's: Prefix (Legendary)")).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
