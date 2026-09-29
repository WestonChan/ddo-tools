import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AugmentSlotList } from './AugmentSlotList'
import type { AugmentSummary, ItemAugmentSlot } from '../../queries/items'

afterEach(() => {
  cleanup()
})

const SAMPLE_AUGMENT_SLOTS = {
  red: { label: 'red', family: 'standard', qualifier: null, options: [] },
  colorless: { label: 'colorless', family: 'standard', qualifier: null, options: [] },
  sun: { label: 'sun', family: 'standard', qualifier: null, options: [] },
  melancholic: {
    label: 'lamordia: melancholic (accessory)',
    family: 'lamordia',
    qualifier: 'accessory',
    options: [],
  },
  slavers: {
    label: "slaver's: prefix (legendary)",
    family: 'slavers',
    qualifier: 'legendary',
    options: [],
  },
  setBonus: {
    label: 'isle of dread: set bonus',
    family: 'dino',
    qualifier: null,
    options: [],
  },
} satisfies Record<string, Omit<ItemAugmentSlot, 'sortOrder'>>

const AUGMENTS_BY_SLOT_LABEL: Record<string, AugmentSummary[]> = {
  [SAMPLE_AUGMENT_SLOTS.melancholic.label]: [
    { id: 1, name: 'Melancholic Charisma', minimumLevel: 8, bonusNames: ['Charisma +5'] },
    { id: 2, name: 'Melancholic Acid Spell Crit', minimumLevel: 8, bonusNames: [] },
  ],
  [SAMPLE_AUGMENT_SLOTS.sun.label]: [
    {
      id: 3,
      name: 'Solar Gem of Abjuration (Heroic)',
      minimumLevel: 1,
      bonusNames: ['Abjuration Spell Focus +2'],
    },
  ],
  [SAMPLE_AUGMENT_SLOTS.slavers.label]: [],
}

function augmentSlot(
  sortOrder: number,
  slotName: keyof typeof SAMPLE_AUGMENT_SLOTS,
): ItemAugmentSlot {
  return { sortOrder, ...SAMPLE_AUGMENT_SLOTS[slotName] }
}

describe('AugmentSlotList', () => {
  it('renders a plain colour socket as a gem with no control', () => {
    const { container } = render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'red'), augmentSlot(1, 'colorless')]}
        augmentsBySlotLabel={{}}
      />,
    )
    const gems = container.querySelectorAll('.resources-augment-gem')
    expect(gems).toHaveLength(2)
    expect(
      [...container.querySelectorAll('.resources-augment-slot')].map((el) =>
        el.getAttribute('data-color'),
      ),
    ).toEqual(['red', 'colorless'])
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders a crafting slot as an expandable control with a readable label', () => {
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    const button = screen.getByRole('button', {
      name: /Lamordia: Melancholic \(Accessory\)/,
    })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).not.toHaveAttribute('aria-controls')
    expect(screen.queryByText('Melancholic Charisma')).toBeNull()
  })

  it('points aria-controls at the panel once it exists', async () => {
    const user = userEvent.setup()
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    const button = screen.getByRole('button', { name: /Lamordia: Melancholic/ })

    await user.click(button)

    const listboxId = button.getAttribute('aria-controls')
    expect(listboxId).toBeTruthy()
    expect(screen.getByRole('listbox').id).toBe(listboxId)
  })

  it('lowercases nothing the player reads but keeps small words in Isle of Dread', () => {
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'setBonus')]}
        augmentsBySlotLabel={{ [SAMPLE_AUGMENT_SLOTS.setBonus.label]: [] }}
      />,
    )
    expect(screen.getByText('Isle of Dread: Set Bonus')).toBeInTheDocument()
  })

  it('lists the candidate augments when the slot is expanded', async () => {
    const user = userEvent.setup()
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))

    expect(screen.getByText('Melancholic Charisma')).toBeInTheDocument()
    expect(screen.getByText('Charisma +5')).toBeInTheDocument()
    expect(screen.getAllByText('ML 8')).toHaveLength(2)
    expect(screen.getByText('Melancholic Acid Spell Crit')).toBeInTheDocument()
  })

  it('selecting a candidate marks that row and nothing else', async () => {
    const user = userEvent.setup()
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
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
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))

    const [first, second] = screen.getAllByRole('option')
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
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))
    const [first] = screen.getAllByRole('option')

    first.focus()
    await user.keyboard('{ArrowUp}')

    expect(first).toHaveFocus()
  })

  it('opens one slot at a time', async () => {
    const user = userEvent.setup()
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic'), augmentSlot(1, 'sun')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))
    await user.click(screen.getByRole('button', { name: /Sun/ }))

    expect(screen.getByText('Solar Gem of Abjuration (Heroic)')).toBeInTheDocument()
    expect(screen.queryByText('Melancholic Charisma')).toBeNull()
  })

  it('closes an open slot when its control is clicked again', async () => {
    const user = userEvent.setup()
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'melancholic')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    const button = screen.getByRole('button', { name: /Lamordia: Melancholic/ })

    await user.click(button)
    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Melancholic Charisma')).toBeNull()
  })

  it('keeps the gem on a Sun socket that also expands', () => {
    const { container } = render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'sun')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    expect(container.querySelector('.resources-augment-gem')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Sun/ })).toBeInTheDocument()
  })

  it("renders a Slaver's slot as a plain pill because no augment fits it", () => {
    render(
      <AugmentSlotList
        augmentSlots={[augmentSlot(0, 'slavers')]}
        augmentsBySlotLabel={AUGMENTS_BY_SLOT_LABEL}
      />,
    )
    expect(screen.getByText("Slaver's: Prefix (Legendary)")).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
