import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import {
  HintAnchor,
  HoverCardProvider,
  positionedCard,
  positionedCardBeside,
  useHoverCard,
} from './HoverCard'
import { LedgerTable } from '../LedgerTable'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function NestedAnchor(): React.JSX.Element {
  const [isSelected, setIsSelected] = useState(false)
  const anchor = useHoverCard({
    kind: 'nested',
    delayMs: 120,
    render: () => (
      <>
        <span>Nested facts</span>
        <DeepAnchor />
      </>
    ),
  })
  return (
    <button {...anchor} aria-pressed={isSelected} onClick={() => setIsSelected(true)}>
      Nested anchor
    </button>
  )
}

function DeepAnchor(): React.JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    render: () => <span>Enchantment facts</span>,
  })
  return <button {...anchor}>Enchantment anchor</button>
}

function CardHarness(): React.JSX.Element {
  const [isSelected, setIsSelected] = useState(false)
  const anchor = useHoverCard({
    kind: 'item',
    delayMs: 260,
    render: () => (
      <>
        <NestedAnchor />
        <button data-tip="Nested hint">Hint anchor</button>
        <button>Card action</button>
      </>
    ),
  })
  return (
    <button {...anchor} aria-pressed={isSelected} onClick={() => setIsSelected(true)}>
      Item anchor
    </button>
  )
}

function renderOpenItemCard(): HTMLElement {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  const itemAnchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.mouseEnter(itemAnchor)
  act(() => vi.advanceTimersByTime(260))
  return itemAnchor
}

it('opens from focus after the pointer delay, switches anchors, and pins with T', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <CardHarness />
    </HoverCardProvider>,
  )
  const [firstAnchor, secondAnchor] = screen.getAllByRole('button', { name: 'Item anchor' })
  act(() => firstAnchor.focus())
  act(() => vi.advanceTimersByTime(259))
  expect(screen.queryByRole('dialog')).toBeNull()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  act(() => secondAnchor.focus())
  expect(screen.queryByRole('dialog')).toBeNull()
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.keyDown(secondAnchor, { key: 't' })
  act(() => vi.runOnlyPendingTimers())
  expect(secondAnchor).toHaveAttribute('data-hover-card-pinned')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(secondAnchor).toHaveFocus()
})

it('dismisses a focus-opened card without moving focus or reopening until focus returns', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <button>Next control</button>
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  act(() => anchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.keyDown(anchor, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(anchor).toHaveFocus()
  fireEvent.mouseEnter(anchor)
  act(() => vi.advanceTimersByTime(520))
  expect(screen.queryByRole('dialog')).toBeNull()

  act(() => screen.getByRole('button', { name: 'Next control' }).focus())
  act(() => anchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('closes a card before leaving a focused ledger row, including pointer-opened cards', () => {
  vi.useFakeTimers()
  const rows = [{ id: 1, name: 'Belt' }]
  render(
    <HoverCardProvider>
      <LedgerTable
        columns={[
          {
            key: 'name',
            label: 'Name',
            minWidth: 120,
            sortValue: (row) => row.name,
            render: (row) => row.name,
          },
        ]}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        hoverCard={(row) => ({ kind: 'item', delayMs: 260, render: () => row.name })}
        isVirtualized={false}
      />
    </HoverCardProvider>,
  )
  const row = screen.getByRole('row', { name: 'Belt' })
  const header = screen.getByRole('columnheader', { name: 'Name' })
  act(() => row.focus())
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.keyDown(row, { key: 'Escape' })
  expect(row).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(520))
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.keyDown(row, { key: 'Escape' })
  expect(row).toHaveFocus()
  act(() => header.focus())
  act(() => row.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.mouseLeave(row)
  act(() => header.focus())
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.keyDown(header, { key: 'Escape' })
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  act(() => row.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.keyDown(row, { key: 'Escape' })
  expect(row).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.keyDown(row, { key: 'Escape' })
  expect(row).toHaveFocus()
  fireEvent.mouseLeave(row)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('pops pointer-opened cards and hints while focus stays elsewhere in a detail pane', () => {
  vi.useFakeTimers()
  const onEscape = vi.fn()
  render(
    <HoverCardProvider>
      <section data-detail-pane="">
        <button onKeyDown={onEscape}>Pane control</button>
        <CardHarness />
      </section>
    </HoverCardProvider>,
  )
  const control = screen.getByRole('button', { name: 'Pane control' })
  act(() => control.focus())
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Item anchor' }))
  act(() => vi.advanceTimersByTime(260))
  const itemCard = screen.getByRole('dialog')
  fireEvent.mouseOver(screen.getByRole('button', { name: 'Hint anchor' }))
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('tooltip')).toBeInTheDocument()

  fireEvent.keyDown(control, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(itemCard).toBeInTheDocument()
  expect(onEscape).toHaveBeenCalledOnce()
  expect(onEscape.mock.calls[0][0].defaultPrevented).toBe(true)
  expect(control).toHaveFocus()

  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Nested anchor' }))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getAllByRole('dialog')).toHaveLength(2)

  fireEvent.keyDown(control, { key: 'Escape' })
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  expect(itemCard).toBeInTheDocument()
  expect(onEscape).toHaveBeenCalledOnce()

  fireEvent.keyDown(control, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onEscape).toHaveBeenCalledOnce()
  expect(control).toHaveFocus()

  const itemAnchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.mouseLeave(itemAnchor)
  fireEvent.mouseEnter(itemAnchor)
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.mouseLeave(itemAnchor)
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.keyDown(control, { key: 'Escape' })
  expect(onEscape).toHaveBeenCalledTimes(2)
})

it('closes a focused header hint while one Escape cancels its keyboard move', async () => {
  const escapeFlags: boolean[] = []
  const rows = [{ id: 1, name: 'Belt' }]
  render(
    <HoverCardProvider>
      <section
        data-detail-pane=""
        onKeyDown={(event) => {
          if (event.key === 'Escape') escapeFlags.push(event.defaultPrevented)
        }}
      >
        <LedgerTable
          columns={[
            {
              key: 'name',
              label: 'Name',
              minWidth: 120,
              sortValue: (row) => row.name,
              render: (row) => row.name,
            },
            {
              key: 'type',
              label: 'Type',
              minWidth: 120,
              sortValue: (row) => row.name,
              render: () => 'Equipment',
            },
          ]}
          rowCount={rows.length}
          rowAt={(index) => rows[index]}
          rowKey={(row) => row.id}
          onRowActivate={vi.fn()}
          isVirtualized={false}
        />
      </section>
    </HoverCardProvider>,
  )
  screen.getAllByRole('columnheader').forEach((header, index) => {
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 }),
    )
  })
  const typeHeader = screen.getByRole('columnheader', { name: 'Type' })
  act(() => typeHeader.focus())
  expect(await screen.findByRole('tooltip')).toBeInTheDocument()
  await userEvent.keyboard('m')
  await waitFor(() => expect(typeHeader).toHaveClass('ledger-header-cell--dragging'))
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await userEvent.keyboard('{ArrowRight}')
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('tooltip')).toBeNull()
  await waitFor(() => expect(typeHeader).not.toHaveClass('ledger-header-cell--dragging'))
  expect(escapeFlags).toEqual([true])
  await userEvent.keyboard('{Escape}')
  expect(escapeFlags).toEqual([true, false])
})

it('lets Escape through a detail pane while a focus-opened card is only pending, and swallows it outside', () => {
  vi.useFakeTimers()
  const onPaneEscape = vi.fn()
  const onListEscape = vi.fn()
  render(
    <HoverCardProvider>
      <section data-detail-pane="" onKeyDown={onPaneEscape}>
        <CardHarness />
      </section>
      <section onKeyDown={onListEscape}>
        <CardHarness />
      </section>
    </HoverCardProvider>,
  )
  const [paneAnchor, listAnchor] = screen.getAllByRole('button', { name: 'Item anchor' })

  act(() => paneAnchor.focus())
  act(() => vi.advanceTimersByTime(100))
  fireEvent.keyDown(paneAnchor, { key: 'Escape' })
  expect(onPaneEscape).toHaveBeenCalledOnce()
  act(() => vi.advanceTimersByTime(500))
  expect(screen.queryByRole('dialog')).toBeNull()

  act(() => listAnchor.focus())
  act(() => vi.advanceTimersByTime(100))
  fireEvent.keyDown(listAnchor, { key: 'Escape' })
  expect(onListEscape).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(500))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('leaves Escape to an input inside a detail pane', () => {
  vi.useFakeTimers()
  const onEscape = vi.fn()
  render(
    <HoverCardProvider>
      <section data-detail-pane="">
        <input aria-label="Pane input" onKeyDown={onEscape} />
        <CardHarness />
      </section>
    </HoverCardProvider>,
  )
  const input = screen.getByRole('textbox', { name: 'Pane input' })
  act(() => input.focus())
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Item anchor' }))
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.keyDown(input, { key: 'Escape' })

  expect(onEscape).toHaveBeenCalledOnce()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('moves focus from an unrelated link into a pinned card and back to its anchor on Escape', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <a href="/">Navigation</a>
      <CardHarness />
    </HoverCardProvider>,
  )
  const navigation = screen.getByRole('link', { name: 'Navigation' })
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  act(() => navigation.focus())
  fireEvent.mouseEnter(anchor)
  act(() => vi.advanceTimersByTime(260))
  fireEvent.keyDown(navigation, { key: 't' })
  const pinnedCard = screen.getByRole('dialog')
  expect(anchor).toHaveAttribute('data-hover-card-pinned')
  expect(pinnedCard).toHaveAttribute('tabindex', '-1')
  expect(pinnedCard).toHaveFocus()
  expect(readFileSync('src/index.css', 'utf8')).toContain(':focus-visible {')
  expect(readFileSync('src/components/HoverCard/HoverCard.css', 'utf8')).toContain(
    '.hover-card--pinned:focus-visible {\n  outline: 2px solid transparent;',
  )
  const cardAction = screen.getByRole('button', { name: 'Card action' })
  act(() => cardAction.focus())
  fireEvent.keyDown(cardAction, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(anchor).toHaveFocus()
  act(() => vi.runOnlyPendingTimers())
  expect(screen.queryByRole('dialog')).toBeNull()
})

it.each(['focus', 'pointer'] as const)(
  'pops a %s-opened card when Escape immediately follows T',
  (openedBy) => {
    vi.useFakeTimers()
    render(
      <HoverCardProvider>
        <LedgerTable
          columns={[
            {
              key: 'name',
              label: 'Name',
              minWidth: 120,
              sortValue: (row) => row.name,
              render: (row) => row.name,
            },
          ]}
          rowCount={1}
          rowAt={() => ({ id: 1, name: 'Belt' })}
          rowKey={(row) => row.id}
          onRowActivate={vi.fn()}
          hoverCard={(row) => ({ kind: 'item', delayMs: 260, render: () => row.name })}
          isVirtualized={false}
        />
      </HoverCardProvider>,
    )
    const anchor = screen.getByRole('row', { name: 'Belt' })
    if (openedBy === 'focus') act(() => anchor.focus())
    else fireEvent.mouseEnter(anchor)
    act(() => vi.advanceTimersByTime(260))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => {
      const keyTarget = openedBy === 'focus' ? anchor : document
      keyTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }))
      keyTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(anchor).toHaveFocus()
    act(() => vi.runOnlyPendingTimers())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(anchor).toHaveFocus()
  },
)

it('delays opening, pins the top card, stacks nested cards, and pops with Escape', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Item anchor'), { clientX: 32 })
  act(() => vi.advanceTimersByTime(259))
  expect(screen.queryByText('Nested anchor')).toBeNull()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByText('Nested anchor')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Item anchor' })).not.toHaveAttribute(
    'data-hover-card-pinned',
  )
  fireEvent.keyDown(document, { key: 't' })
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Item anchor' })).toHaveAttribute(
    'data-hover-card-pinned',
  )
  act(() => screen.getByRole('button', { name: 'Item anchor' }).focus())
  const cardAction = screen.getByRole('button', { name: 'Card action' })
  act(() => cardAction.focus())
  fireEvent.mouseDown(cardAction)
  fireEvent.click(cardAction)
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
  fireEvent.mouseLeave(screen.getByText('Item anchor'))
  expect(screen.getByRole('button', { name: 'Item anchor' })).toHaveAttribute(
    'data-hover-card-pinned',
  )
  fireEvent.mouseEnter(screen.getByText('Nested anchor'))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByText('Nested facts')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nested anchor' })).not.toHaveAttribute(
    'data-hover-card-pinned',
  )
  fireEvent.keyDown(document, { key: 't' })
  expect(screen.getByRole('button', { name: 'Nested anchor' })).toHaveAttribute(
    'data-hover-card-pinned',
  )
  expect(screen.getByRole('button', { name: 'Item anchor' })).toHaveAttribute(
    'data-hover-card-pinned',
  )
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByText('Nested facts')).toBeNull()
  expect(screen.getByRole('button', { name: 'Nested anchor' })).not.toHaveAttribute(
    'data-hover-card-pinned',
  )
  expect(screen.getByText('Nested anchor')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Item anchor' })).toHaveAttribute(
    'data-hover-card-pinned',
  )
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByText('Nested anchor')).toBeNull()
  expect(screen.getByRole('button', { name: 'Item anchor' })).not.toHaveAttribute(
    'data-hover-card-pinned',
  )
})

it('closes only deeper cards on mousedown inside a card and keeps the row click working', () => {
  const itemAnchor = renderOpenItemCard()
  fireEvent.keyDown(document, { key: 't' })
  fireEvent.mouseLeave(itemAnchor)
  const nestedAnchor = screen.getByRole('button', { name: 'Nested anchor' })
  fireEvent.mouseEnter(nestedAnchor)
  act(() => vi.advanceTimersByTime(120))
  const enchantmentAnchor = screen.getByRole('button', { name: 'Enchantment anchor' })
  fireEvent.mouseEnter(enchantmentAnchor)
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getAllByRole('dialog').map((card) => card.dataset.depth)).toEqual(['0', '1', '2'])
  fireEvent.keyDown(document, { key: 't' })
  expect(enchantmentAnchor).toHaveAttribute('data-hover-card-pinned')

  fireEvent.mouseDown(screen.getByText('Nested facts'))
  expect(screen.getAllByRole('dialog').map((card) => card.dataset.depth)).toEqual(['0', '1'])
  expect(enchantmentAnchor).not.toHaveAttribute('data-hover-card-pinned')
  expect(itemAnchor).toHaveAttribute('data-hover-card-pinned')
  expect(screen.getByText('Nested facts')).toBeInTheDocument()

  fireEvent.mouseEnter(enchantmentAnchor)
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getAllByRole('dialog')).toHaveLength(3)
  fireEvent.mouseDown(nestedAnchor)
  fireEvent.click(nestedAnchor)
  expect(nestedAnchor).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('dialog').map((card) => card.dataset.depth)).toEqual(['0'])
  expect(itemAnchor).toHaveAttribute('data-hover-card-pinned')
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
})

it('closes a deeper card when its pinned parent is the first remaining card', () => {
  const itemAnchor = renderOpenItemCard()
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Nested anchor' }))
  act(() => vi.advanceTimersByTime(120))
  fireEvent.keyDown(document, { key: 't' })
  fireEvent.mouseLeave(itemAnchor)
  expect(screen.getAllByRole('dialog').map((card) => card.dataset.depth)).toEqual(['1'])

  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Enchantment anchor' }))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getAllByRole('dialog').map((card) => card.dataset.depth)).toEqual(['1', '2'])
  fireEvent.mouseDown(screen.getByText('Nested facts'))
  expect(screen.getAllByRole('dialog').map((card) => card.dataset.depth)).toEqual(['1'])
  expect(screen.getByRole('dialog')).toHaveClass('hover-card--pinned')
})

it('cancels a pending nested card on mousedown inside its parent', () => {
  const itemAnchor = renderOpenItemCard()
  fireEvent.keyDown(document, { key: 't' })
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Nested anchor' }))
  act(() => vi.advanceTimersByTime(119))

  fireEvent.mouseDown(screen.getByRole('button', { name: 'Card action' }))
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getAllByRole('dialog').map((card) => card.dataset.depth)).toEqual(['0'])
  expect(itemAnchor).toHaveAttribute('data-hover-card-pinned')
})

it('keeps an unpinned card through clicks on its anchor and elsewhere until mouse leave', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <button>Filter chip</button>
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.mouseEnter(anchor)
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(anchor).not.toHaveAttribute('data-hover-card-pinned')

  fireEvent.mouseDown(anchor)
  fireEvent.click(anchor)
  expect(anchor).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(anchor).not.toHaveAttribute('data-hover-card-pinned')

  fireEvent.mouseDown(screen.getByRole('dialog'))
  fireEvent.click(screen.getByRole('dialog'))
  expect(anchor).not.toHaveAttribute('data-hover-card-pinned')

  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Nested anchor' }))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getAllByRole('dialog')).toHaveLength(2)
  fireEvent.mouseDown(screen.getByRole('button', { name: 'Card action' }))
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  expect(anchor).not.toHaveAttribute('data-hover-card-pinned')

  fireEvent.mouseDown(screen.getByRole('button', { name: 'Filter chip' }))
  fireEvent.click(screen.getByRole('button', { name: 'Filter chip' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.mouseDown(document.body)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.mouseLeave(anchor)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(anchor).not.toHaveAttribute('data-hover-card-pinned')
})

it('clears a pinned card and its nested card on outside mousedown', () => {
  const anchor = renderOpenItemCard()
  fireEvent.keyDown(document, { key: 't' })
  expect(anchor).toHaveAttribute('data-hover-card-pinned')
  expect(screen.getByRole('dialog')).toHaveFocus()
  fireEvent.mouseLeave(anchor)
  fireEvent.mouseEnter(screen.getByText('Nested anchor'))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getAllByRole('dialog')).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Nested anchor' })).not.toHaveAttribute(
    'data-hover-card-pinned',
  )

  fireEvent.mouseDown(document.body)
  expect(screen.queryAllByRole('dialog')).toHaveLength(0)
  expect(anchor).not.toHaveAttribute('data-hover-card-pinned')
  expect(anchor).toHaveFocus()
  act(() => vi.runOnlyPendingTimers())
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('clears a hint anchored inside a pinned card on parent and outside mousedown', () => {
  const anchor = renderOpenItemCard()
  fireEvent.keyDown(document, { key: 't' })
  fireEvent.mouseLeave(anchor)
  fireEvent.mouseOver(screen.getByRole('button', { name: 'Hint anchor' }))
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('tooltip')).toHaveTextContent('Nested hint')

  fireEvent.mouseDown(screen.getByRole('button', { name: 'Card action' }))
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(screen.getByRole('dialog')).toHaveClass('hover-card--pinned')
  fireEvent.mouseOver(screen.getByRole('button', { name: 'Hint anchor' }))
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('tooltip')).toHaveTextContent('Nested hint')

  fireEvent.mouseDown(document.body)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('keeps a data-tip hint through mousedown until mouseout', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <button data-tip="Helpful text">Help</button>
    </HoverCardProvider>,
  )
  fireEvent.mouseOver(screen.getByText('Help'))
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful text')
  expect(screen.getByRole('tooltip')).toHaveClass('hover-card--hint')
  fireEvent.mouseDown(screen.getByText('Help'))
  fireEvent.click(screen.getByText('Help'))
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  fireEvent.mouseDown(document.body)
  fireEvent.click(document.body)
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  fireEvent.mouseOut(screen.getByText('Help'))
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('opens a data-tip hint from focus and dismisses it on Escape without moving focus', () => {
  vi.useFakeTimers()
  const onEscape = vi.fn()
  render(
    <HoverCardProvider>
      <HintAnchor text="Helpful text">
        <button onKeyDown={onEscape}>Help</button>
      </HintAnchor>
      <button>Next control</button>
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Help' })
  act(() => anchor.focus())
  act(() => vi.advanceTimersByTime(259))
  expect(screen.queryByRole('tooltip')).toBeNull()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful text')

  fireEvent.keyDown(anchor, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(anchor).toHaveFocus()
  expect(onEscape).toHaveBeenCalled()
  fireEvent.mouseOver(anchor)
  act(() => vi.advanceTimersByTime(520))
  expect(screen.queryByRole('tooltip')).toBeNull()

  act(() => screen.getByRole('button', { name: 'Next control' }).focus())
  act(() => anchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful text')
  act(() => screen.getByRole('button', { name: 'Next control' }).focus())
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('opens a pinned card from a focused anchor on T', () => {
  vi.useFakeTimers()
  const focusElement = HTMLElement.prototype.focus
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
    this: HTMLElement,
    options?: FocusOptions,
  ) {
    if (this.matches('[data-hover-card]') && this.style.visibility === 'hidden') return
    focusElement.call(this, options)
  })
  render(
    <StrictMode>
      <HoverCardProvider>
        <CardHarness />
      </HoverCardProvider>
    </StrictMode>,
  )
  const anchor = screen.getByText('Item anchor')
  anchor.focus()
  fireEvent.keyDown(anchor, { key: 't' })
  act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
  expect(anchor).toHaveAttribute('data-hover-card-pinned')
  expect(screen.getByRole('dialog')).toHaveFocus()
  fireEvent.mouseLeave(anchor)
  expect(screen.getByText('Nested anchor')).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(anchor).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('places cards above crowded anchors and clamps them to the viewport', () => {
  const bottomAnchor = DOMRect.fromRect({ x: 355, y: 280, width: 20, height: 24 })
  expect(positionedCard(bottomAnchor, 355, 300, 150, 375, 320)).toEqual({ left: 67, top: 124 })
  const tallCard = positionedCard(bottomAnchor, null, 300, 300, 375, 320)
  expect(tallCard.left).toBe(67)
  expect(tallCard.top).toBe(8)
})

it('places a menu card beside its edge, flips left, and omits it when neither side fits', () => {
  const rightMenu = DOMRect.fromRect({ x: 400, y: 32, width: 268, height: 320 })
  const leftMenu = DOMRect.fromRect({ x: 650, y: 32, width: 268, height: 320 })
  const narrowMenu = DOMRect.fromRect({ x: 4, y: 32, width: 268, height: 320 })
  expect(positionedCardBeside(rightMenu, 300, 180, 1024, 768)).toEqual({
    left: 676,
    top: 32,
  })
  expect(positionedCardBeside(leftMenu, 300, 180, 1024, 768)).toEqual({
    left: 342,
    top: 32,
  })
  expect(positionedCardBeside(narrowMenu, 300, 180, 375, 768)).toBeNull()
})

it('closes an unpinned card when its anchor unmounts', () => {
  vi.useFakeTimers()
  const view = render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Item anchor'))
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  view.rerender(
    <HoverCardProvider>
      <span>Removed</span>
    </HoverCardProvider>,
  )
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps a pinned card when its anchor unmounts until Escape closes it', () => {
  vi.useFakeTimers()
  const view = render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Item anchor'))
  act(() => vi.advanceTimersByTime(260))
  fireEvent.keyDown(document, { key: 't' })
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
  view.rerender(
    <HoverCardProvider>
      <span>Removed</span>
    </HoverCardProvider>,
  )
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('lets Escape pass through a pointer-opened hint without dismissing or pinning it', () => {
  vi.useFakeTimers()
  const onEscape = vi.fn()
  render(
    <HoverCardProvider>
      <button data-tip="Hint" onKeyDown={onEscape}>
        Help
      </button>
    </HoverCardProvider>,
  )
  fireEvent.mouseOver(screen.getByText('Help'))
  act(() => vi.advanceTimersByTime(260))
  fireEvent.keyDown(screen.getByText('Help'), { key: 't' })
  expect(screen.getByRole('tooltip')).not.toHaveClass('hover-card--pinned')
  fireEvent.keyDown(screen.getByText('Help'), { key: 'Escape' })
  expect(onEscape).toHaveBeenCalled()
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  fireEvent.mouseOut(screen.getByText('Help'))
  expect(screen.queryByRole('tooltip')).toBeNull()
})
