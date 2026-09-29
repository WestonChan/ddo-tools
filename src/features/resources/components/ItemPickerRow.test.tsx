import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemPickerRow } from './ItemPickerRow'
import type { ItemSummary } from '../queries/items'

function itemRow(overrides: Partial<ItemSummary> = {}): ItemSummary {
  return {
    id: 1,
    name: 'Bloodstone',
    equipmentSlot: 'Trinket',
    category: 'Trinket',
    minimumLevel: 12,
    pack: 'Vault of Night',
    isRaidLoot: false,
    isRareLoot: false,
    ...overrides,
  }
}

function renderItemPickerRow(
  items: ItemSummary[],
  selectedItemId: number | null,
  onSelect = vi.fn(),
): ReturnType<typeof vi.fn> {
  render(
    <ItemPickerRow
      index={0}
      style={{}}
      ariaAttributes={{ role: 'listitem', 'aria-posinset': 1, 'aria-setsize': items.length }}
      items={items}
      selectedItemId={selectedItemId}
      onSelect={onSelect}
    />,
  )
  return onSelect
}

afterEach(() => {
  cleanup()
})

describe('ItemPickerRow', () => {
  it('renders nothing when the index is out of range', () => {
    const { container } = render(
      <ItemPickerRow
        index={5}
        style={{}}
        ariaAttributes={{ role: 'listitem', 'aria-posinset': 6, 'aria-setsize': 0 }}
        items={[]}
        selectedItemId={null}
        onSelect={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes the row as a keyboard-focusable button', async () => {
    renderItemPickerRow([itemRow()], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    await userEvent.tab()
    expect(button).toHaveFocus()
  })

  it('selects the row on Enter', async () => {
    const onSelect = renderItemPickerRow([itemRow()], null)
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('selects the row on Space', async () => {
    const onSelect = renderItemPickerRow([itemRow()], null)
    await userEvent.tab()
    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('selects the row on click', async () => {
    const onSelect = renderItemPickerRow([itemRow()], null)
    await userEvent.click(screen.getByRole('button', { name: /Bloodstone/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('marks the selected row with aria-current and never uses aria-selected', () => {
    const { container } = render(
      <ItemPickerRow
        index={0}
        style={{}}
        ariaAttributes={{ role: 'listitem', 'aria-posinset': 1, 'aria-setsize': 1 }}
        items={[itemRow()]}
        selectedItemId={1}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Bloodstone/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(container.querySelector('[aria-selected]')).toBeNull()
  })

  it('leaves aria-current off unselected rows', () => {
    renderItemPickerRow([itemRow()], 99)
    expect(screen.getByRole('button', { name: /Bloodstone/ })).not.toHaveAttribute('aria-current')
  })

  it('shows the Raid chip and includes it in the accessible name', () => {
    renderItemPickerRow([itemRow({ isRaidLoot: true })], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    expect(button).toHaveTextContent('Raid')
    expect(button.querySelector('.resources-chip[data-kind="raid"]')).not.toBeNull()
  })

  it('shows the Rare chip after the Raid chip', () => {
    renderItemPickerRow([itemRow({ isRaidLoot: true, isRareLoot: true })], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    const kinds = Array.from(button.querySelectorAll('.resources-chip')).map((c) =>
      c.getAttribute('data-kind'),
    )
    expect(kinds).toEqual(['raid', 'rare'])
    expect(button).toHaveTextContent('Rare')
  })

  it('shows the Rare chip alone on a rare non-raid item', () => {
    renderItemPickerRow([itemRow({ isRareLoot: true })], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    expect(button.querySelector('.resources-chip[data-kind="rare"]')).not.toBeNull()
    expect(button.querySelector('.resources-chip[data-kind="raid"]')).toBeNull()
  })

  it('shows no chips on a plain item', () => {
    renderItemPickerRow([itemRow()], null)
    expect(
      screen.getByRole('button', { name: /Bloodstone/ }).querySelector('.resources-chip'),
    ).toBeNull()
  })

  it('omits meta segments that have no data', () => {
    renderItemPickerRow([itemRow({ minimumLevel: null, pack: null })], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    expect(button).not.toHaveTextContent('ML')
  })
})
