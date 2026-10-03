import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { HoverCardProvider, positionedCard, useHoverCard } from './HoverCard'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function NestedAnchor(): React.JSX.Element {
  const anchor = useHoverCard({
    kind: 'nested',
    delayMs: 120,
    render: () => <span>Nested facts</span>,
  })
  return <button {...anchor}>Nested anchor</button>
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
      </>
    ),
  })
  return (
    <button {...anchor} aria-pressed={isSelected} onClick={() => setIsSelected(true)}>
      Item anchor
    </button>
  )
}

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
  fireEvent.keyDown(document, { key: 't' })
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
  fireEvent.mouseDown(screen.getByRole('dialog'))
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
  fireEvent.mouseLeave(screen.getByText('Item anchor'))
  fireEvent.mouseEnter(screen.getByText('Nested anchor'))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByText('Nested facts')).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByText('Nested facts')).toBeNull()
  expect(screen.getByText('Nested anchor')).toBeInTheDocument()
  fireEvent.mouseDown(document.body)
  expect(screen.queryByText('Nested anchor')).toBeNull()
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

  fireEvent.mouseDown(anchor)
  fireEvent.click(anchor)
  expect(anchor).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.mouseDown(screen.getByRole('button', { name: 'Filter chip' }))
  fireEvent.click(screen.getByRole('button', { name: 'Filter chip' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.mouseDown(document.body)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.mouseLeave(anchor)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('clears a pinned card and its nested card on outside mousedown', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.mouseEnter(anchor)
  act(() => vi.advanceTimersByTime(260))
  fireEvent.keyDown(document, { key: 't' })
  fireEvent.mouseLeave(anchor)
  fireEvent.mouseEnter(screen.getByText('Nested anchor'))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getAllByRole('dialog')).toHaveLength(2)

  fireEvent.mouseDown(document.body)
  expect(screen.queryAllByRole('dialog')).toHaveLength(0)
})

it('clears a hint anchored inside a pinned card on outside mousedown', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.mouseEnter(anchor)
  act(() => vi.advanceTimersByTime(260))
  fireEvent.keyDown(document, { key: 't' })
  fireEvent.mouseLeave(anchor)
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

it('opens a pinned card from a focused anchor on T', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  const anchor = screen.getByText('Item anchor')
  anchor.focus()
  fireEvent.keyDown(anchor, { key: 't' })
  act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('Pinned · Esc')).toBeInTheDocument()
  fireEvent.mouseLeave(anchor)
  expect(screen.getByText('Nested anchor')).toBeInTheDocument()
})

it('places cards above crowded anchors and clamps them to the viewport', () => {
  const bottomAnchor = DOMRect.fromRect({ x: 355, y: 280, width: 20, height: 24 })
  expect(positionedCard(bottomAnchor, 355, 300, 150, 375, 320)).toEqual({ left: 67, top: 124 })
  const tallCard = positionedCard(bottomAnchor, null, 300, 300, 375, 320)
  expect(tallCard.left).toBe(67)
  expect(tallCard.top).toBe(8)
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

it('lets Escape pass through a hint and never pins a hint', () => {
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
  expect(screen.queryByRole('tooltip')).toBeNull()
})
