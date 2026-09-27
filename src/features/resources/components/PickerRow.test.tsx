import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PickerRow } from './PickerRow'
import type { ItemRow } from '../queries/items'

function row(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 1,
    name: 'Bloodstone',
    equipment_slot: 'Trinket',
    item_category: 'Trinket',
    minimum_level: 12,
    pack: 'Vault of Night',
    is_raid: false,
    ...overrides,
  }
}

function renderRow(
  rows: ItemRow[],
  selectedId: number | null,
  onSelect = vi.fn(),
): ReturnType<typeof vi.fn> {
  render(
    <PickerRow
      index={0}
      style={{}}
      ariaAttributes={{ role: 'listitem', 'aria-posinset': 1, 'aria-setsize': rows.length }}
      rows={rows}
      selectedId={selectedId}
      onSelect={onSelect}
    />,
  )
  return onSelect
}

afterEach(() => {
  cleanup()
})

describe('PickerRow', () => {
  it('renders nothing when the index is out of range', () => {
    const { container } = render(
      <PickerRow
        index={5}
        style={{}}
        ariaAttributes={{ role: 'listitem' }}
        rows={[]}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes the row as a keyboard-focusable button', async () => {
    renderRow([row()], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    await userEvent.tab()
    expect(button).toHaveFocus()
  })

  it('selects the row on Enter', async () => {
    const onSelect = renderRow([row()], null)
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('selects the row on Space', async () => {
    const onSelect = renderRow([row()], null)
    await userEvent.tab()
    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('selects the row on click', async () => {
    const onSelect = renderRow([row()], null)
    await userEvent.click(screen.getByRole('button', { name: /Bloodstone/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('marks the selected row with aria-current and never uses aria-selected', () => {
    const { container } = render(
      <PickerRow
        index={0}
        style={{}}
        ariaAttributes={{ role: 'listitem' }}
        rows={[row()]}
        selectedId={1}
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
    renderRow([row()], 99)
    expect(screen.getByRole('button', { name: /Bloodstone/ })).not.toHaveAttribute('aria-current')
  })

  it('shows the Raid chip and includes it in the accessible name', () => {
    renderRow([row({ is_raid: true })], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    expect(button).toHaveTextContent('Raid')
    expect(button.querySelector('.resources-chip[data-kind="raid"]')).not.toBeNull()
  })

  it('omits meta segments that have no data', () => {
    renderRow([row({ minimum_level: null, pack: null })], null)
    const button = screen.getByRole('button', { name: /Bloodstone/ })
    expect(button).not.toHaveTextContent('ML')
  })
})
