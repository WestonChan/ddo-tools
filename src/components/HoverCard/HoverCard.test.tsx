import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useEffect, useState } from 'react'
import {
  HintAnchor,
  HoverCardProvider,
  positionedCard,
  positionedCardBeside,
  useHoverCard,
} from './HoverCard'
import { LedgerTable } from '../LedgerTable'
import { StructuredDetailCard, detailCardSection } from '../DetailCard'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

const detailCardKinds = [
  'item',
  'augment',
  'enchantment',
  'quest',
  'set',
  'adventurePack',
  'questChain',
  'saga',
  'craftingSystem',
  'vendor',
  'event',
  'ability',
] as const

function DetailKindHarness({ kind }: { kind: string }): React.JSX.Element {
  const anchor = useHoverCard({
    kind,
    delayMs: 0,
    render: () => (
      <StructuredDetailCard
        variant="hover"
        kicker="Detail kind"
        name="A detail card"
        facts={[]}
        sections={[]}
      />
    ),
  })
  return <button {...anchor}>Open {kind}</button>
}

it.each(detailCardKinds)('keeps the pin hint beside the kicker for %s cards', (kind) => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <DetailKindHarness kind={kind} />
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: `Open ${kind}` })
  fireEvent.mouseEnter(anchor)
  act(() => vi.runOnlyPendingTimers())
  const card = screen.getByRole('dialog')
  const kicker = within(card).getByText('Detail kind')
  const pinStatus = within(card).getByText('T to pin')
  expect(pinStatus.parentElement).toBe(card)
  expect(kicker.closest('.detail-card__kicker-row')).toBeInTheDocument()
  fireEvent.keyDown(anchor, { key: 't' })
  expect(within(screen.getByRole('dialog')).getByText('Pinned · Esc').parentElement).toBe(card)
})

it('reserves the pin hint width on the shared kicker line', () => {
  const hoverCss = readFileSync('src/components/HoverCard/HoverCard.css', 'utf8')
  const detailCss = readFileSync('src/components/DetailCard/DetailCard.css', 'utf8')
  expect(hoverCss).toMatch(/\.hover-card \.detail-card\s*\{\s*--detail-card-pin-reserve:/)
  expect(hoverCss).toMatch(/\.hover-card__pin-status\s*\{[^}]*position:\s*absolute/)
  expect(detailCss).toMatch(
    /\.detail-card__kicker-row\s*\{[^}]*padding-inline-end:\s*var\(--detail-card-pin-reserve\)/,
  )
})

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

function focusWithNavigationKey(element: HTMLElement, key = 'Tab'): void {
  fireEvent.keyDown(document.activeElement ?? document, { key })
  act(() => element.focus())
}

it.each([
  'Tab',
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])('opens on focus caused by %s', (key) => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.keyDown(document, { key })
  act(() => anchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('opens on focus caused by Shift+Tab', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
  act(() => anchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('keeps native navigation focus eligible until React handles it after a microtask', async () => {
  vi.useFakeTimers()
  function DeferredFocusAnchor(): React.JSX.Element {
    const hover = useHoverCard({ kind: 'item', delayMs: 0, render: () => 'Card details' })
    return (
      <button
        onFocus={(event) => {
          const anchor = event.currentTarget
          queueMicrotask(() =>
            hover.onFocus({
              target: anchor,
              currentTarget: anchor,
            } as unknown as React.FocusEvent<HTMLElement>),
          )
        }}
      >
        Deferred anchor
      </button>
    )
  }
  render(
    <HoverCardProvider>
      <DeferredFocusAnchor />
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Deferred anchor' })
  fireEvent.keyDown(document, { key: 'Tab' })
  act(() => anchor.focus())
  await Promise.resolve()
  act(() => vi.runOnlyPendingTimers())
  expect(screen.getByRole('dialog')).toHaveTextContent('Card details')
})

it('ignores focus without navigation, including delayed focus after a key and focus after Escape', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <CardHarness />
      <button>Other control</button>
    </HoverCardProvider>,
  )
  const [firstAnchor, secondAnchor] = screen.getAllByRole('button', { name: 'Item anchor' })
  const otherControl = screen.getByRole('button', { name: 'Other control' })
  act(() => firstAnchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.keyDown(firstAnchor, { key: 'ArrowDown' })
  act(() => otherControl.focus())
  act(() => secondAnchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.keyDown(secondAnchor, { key: 'Tab' })
  act(() => vi.advanceTimersByTime(0))
  act(() => firstAnchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.keyDown(firstAnchor, { key: 'ArrowDown' })
  fireEvent.keyDown(firstAnchor, { key: 'Escape' })
  act(() => secondAnchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.queryByRole('dialog')).toBeNull()

  act(() => otherControl.focus())
  fireEvent.keyDown(otherControl, { key: 'Tab' })
  fireEvent.pointerDown(firstAnchor)
  act(() => firstAnchor.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('opens from focus after the pointer delay, switches anchors, and pins with T', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <CardHarness />
    </HoverCardProvider>,
  )
  const [firstAnchor, secondAnchor] = screen.getAllByRole('button', { name: 'Item anchor' })
  focusWithNavigationKey(firstAnchor)
  act(() => vi.advanceTimersByTime(259))
  expect(screen.queryByRole('dialog')).toBeNull()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  focusWithNavigationKey(secondAnchor)
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
  focusWithNavigationKey(anchor)
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.keyDown(anchor, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(anchor).toHaveFocus()
  fireEvent.mouseEnter(anchor)
  act(() => vi.advanceTimersByTime(520))
  expect(screen.queryByRole('dialog')).toBeNull()

  act(() => screen.getByRole('button', { name: 'Next control' }).focus())
  focusWithNavigationKey(anchor)
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
  focusWithNavigationKey(row, 'ArrowDown')
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.mouseLeave(row)
  act(() => header.focus())
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.keyDown(header, { key: 'Escape' })
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  focusWithNavigationKey(row, 'ArrowDown')
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
  focusWithNavigationKey(typeHeader)
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

  focusWithNavigationKey(paneAnchor)
  act(() => vi.advanceTimersByTime(100))
  fireEvent.keyDown(paneAnchor, { key: 'Escape' })
  expect(onPaneEscape).toHaveBeenCalledOnce()
  act(() => vi.advanceTimersByTime(500))
  expect(screen.queryByRole('dialog')).toBeNull()

  focusWithNavigationKey(listAnchor)
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

it('keeps Tab and Shift+Tab inside a pinned card with two controls', async () => {
  function TwoControlCard(): React.JSX.Element {
    const anchor = useHoverCard({
      kind: 'item',
      delayMs: 0,
      render: () => (
        <>
          <a href="/first">First link</a>
          <button>Last action</button>
        </>
      ),
    })
    return <button {...anchor}>Card anchor</button>
  }

  render(
    <HoverCardProvider>
      <TwoControlCard />
      <button>Outside action</button>
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Card anchor' })
  anchor.focus()
  fireEvent.keyDown(anchor, { key: 't' })
  await waitFor(() => expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned'))
  const card = screen.getByRole('dialog')
  const firstLink = screen.getByRole('link', { name: 'First link' })
  const lastAction = screen.getByRole('button', { name: 'Last action' })
  expect(card).toHaveFocus()

  await userEvent.tab()
  expect(firstLink).toHaveFocus()
  await userEvent.tab()
  expect(lastAction).toHaveFocus()
  await userEvent.tab()
  expect(firstLink).toHaveFocus()
  await userEvent.tab({ shift: true })
  expect(lastAction).toHaveFocus()
  card.focus()
  await userEvent.tab({ shift: true })
  expect(lastAction).toHaveFocus()
})

it('keeps focus on a pinned card root when it has no focusable controls', async () => {
  function EmptyCard(): React.JSX.Element {
    const anchor = useHoverCard({ kind: 'item', delayMs: 0, render: () => <p>No actions</p> })
    return <button {...anchor}>Empty card anchor</button>
  }

  render(
    <HoverCardProvider>
      <EmptyCard />
      <button>Outside action</button>
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Empty card anchor' })
  anchor.focus()
  fireEvent.keyDown(anchor, { key: 't' })
  await waitFor(() => expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned'))
  const card = screen.getByRole('dialog')
  expect(card).toHaveFocus()
  await userEvent.tab()
  expect(card).toHaveFocus()
  await userEvent.tab({ shift: true })
  expect(card).toHaveFocus()
})

it('tabs to show-more inside a pinned card and toggles every entry', async () => {
  function ExpandableCard(): React.JSX.Element {
    const anchor = useHoverCard({
      kind: 'item',
      delayMs: 0,
      render: () => (
        <StructuredDetailCard
          variant="hover"
          kicker="Item"
          name="Item"
          facts={[]}
          sections={[
            detailCardSection({
              key: 'description',
              heading: 'Enchantments',
              entries: ['First', 'Second', 'Third'],
              FullView: ({ entries }) => (
                <>
                  {entries.map((entry) => (
                    <div key={entry}>{entry}</div>
                  ))}
                </>
              ),
              briefEntryLimit: 1,
            }),
          ]}
        />
      ),
    })
    return <button {...anchor}>Item anchor</button>
  }
  render(
    <HoverCardProvider>
      <ExpandableCard />
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  anchor.focus()
  fireEvent.keyDown(anchor, { key: 't' })
  const card = await screen.findByRole('dialog')
  await waitFor(() => expect(card).toHaveClass('hover-card--pinned'))
  await waitFor(() => expect(card).toHaveFocus())
  const more = screen.getByRole('button', { name: '+2 more' })
  await userEvent.tab()
  expect(more).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(screen.getByText('Third')).toBeInTheDocument()
  expect(more).toHaveTextContent('Show less')
  await userEvent.click(more)
  expect(screen.queryByText('Third')).toBeNull()
})

it('traps the top pinned card and returns the trap to its parent after Escape', async () => {
  render(
    <HoverCardProvider>
      <CardHarness />
      <button>Outside action</button>
    </HoverCardProvider>,
  )
  const outerAnchor = screen.getByRole('button', { name: 'Item anchor' })
  outerAnchor.focus()
  fireEvent.keyDown(outerAnchor, { key: 't' })
  await waitFor(() => expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned'))
  const outerCard = screen.getByRole('dialog')
  await userEvent.tab()
  const nestedAnchor = screen.getByRole('button', { name: 'Nested anchor' })
  expect(nestedAnchor).toHaveFocus()
  await screen.findByText('Nested facts')
  await userEvent.keyboard('t')
  const [parentCard, nestedCard] = screen.getAllByRole('dialog')
  expect(parentCard).toBe(outerCard)
  expect(nestedCard).toHaveClass('hover-card--pinned')
  expect(nestedCard).toHaveFocus()

  await userEvent.tab()
  const deepAnchor = screen.getByRole('button', { name: 'Enchantment anchor' })
  expect(deepAnchor).toHaveFocus()
  await userEvent.tab()
  expect(deepAnchor).toHaveFocus()
  await userEvent.keyboard('{Escape}')
  expect(nestedCard).not.toBeInTheDocument()
  expect(nestedAnchor).toHaveFocus()
  await userEvent.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Card action' })).toHaveFocus()
  await userEvent.tab()
  expect(nestedAnchor).toHaveFocus()
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
    if (openedBy === 'focus') focusWithNavigationKey(anchor)
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
  expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned')
  expect(screen.getByRole('button', { name: 'Item anchor' })).toHaveAttribute(
    'data-hover-card-pinned',
  )
  act(() => screen.getByRole('button', { name: 'Item anchor' }).focus())
  const cardAction = screen.getByRole('button', { name: 'Card action' })
  act(() => cardAction.focus())
  fireEvent.mouseDown(cardAction)
  fireEvent.click(cardAction)
  expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned')
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
  expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned')
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

it('keeps a pointer-opened card when its anchor blurs after a click', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <button>Detail control</button>
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.mouseEnter(anchor, { clientX: 48 })
  act(() => vi.advanceTimersByTime(260))
  const card = screen.getByRole('dialog')
  const pointerLeft = card.style.left

  fireEvent.pointerDown(anchor)
  act(() => anchor.focus())
  fireEvent.click(anchor)
  act(() => screen.getByRole('button', { name: 'Detail control' }).focus())

  expect(anchor).not.toHaveFocus()
  expect(card).toBeInTheDocument()
  expect(card.style.left).toBe(pointerLeft)
  fireEvent.mouseLeave(anchor)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('closes a focus-opened card when its anchor blurs', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <button>Next control</button>
    </HoverCardProvider>,
  )
  const anchor = screen.getByRole('button', { name: 'Item anchor' })
  const nextControl = screen.getByRole('button', { name: 'Next control' })
  focusWithNavigationKey(anchor)
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  act(() => nextControl.focus())
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(nextControl).toHaveFocus()

  focusWithNavigationKey(anchor)
  act(() => nextControl.focus())
  act(() => vi.advanceTimersByTime(260))
  expect(screen.queryByRole('dialog')).toBeNull()
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
  act(() => vi.advanceTimersByTime(260))
  expect(screen.queryByRole('tooltip')).toBeNull()
  act(() => anchor.blur())
  focusWithNavigationKey(anchor)
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
  focusWithNavigationKey(anchor)
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
  expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned')
  expect(anchor).toHaveAttribute('data-hover-card-pinned')
  expect(screen.getByRole('dialog')).toHaveFocus()
  fireEvent.mouseLeave(anchor)
  expect(screen.getByText('Nested anchor')).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(anchor).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('places pointer rows beside the pointer and inline anchors at their left edge', () => {
  const anchorRect = DOMRect.fromRect({ x: 120, y: 100, width: 200, height: 24 })
  const measurements = {
    anchorRect,
    cardWidth: 300,
    cardHeight: 150,
    viewportWidth: 1024,
    viewportHeight: 768,
  }
  expect(positionedCard({ ...measurements, pointerX: 240, isRow: true }).left).toBe(254)
  expect(positionedCard({ ...measurements, pointerX: 240, isRow: false }).left).toBe(120)
  expect(positionedCard({ ...measurements, pointerX: 310, isRow: false }).left).toBe(120)
  expect(positionedCard({ ...measurements, pointerX: null }).top).toBe(anchorRect.bottom + 6)
})

it('defaults pointer-opened cards and hints to the anchor edge', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.matches('.hover-card, .hover-card__content')) return new DOMRect(0, 0, 300, 150)
    return new DOMRect(120, 100, 200, 24)
  })
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
      <button data-tip="Helpful text">Hint anchor</button>
    </HoverCardProvider>,
  )
  const cardAnchor = screen.getByRole('button', { name: 'Item anchor' })
  fireEvent.mouseEnter(cardAnchor, { clientX: 310 })
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('dialog').style.left).toBe('120px')
  fireEvent.mouseLeave(cardAnchor)
  fireEvent.mouseOver(screen.getByRole('button', { name: 'Hint anchor' }), { clientX: 310 })
  act(() => vi.advanceTimersByTime(260))
  expect(screen.getByRole('tooltip').style.left).toBe('120px')
})

it('places cards above crowded anchors and caps a too-tall card without covering its anchor', () => {
  const bottomAnchor = DOMRect.fromRect({ x: 355, y: 280, width: 20, height: 24 })
  const bottomMeasurements = {
    anchorRect: bottomAnchor,
    cardWidth: 300,
    viewportWidth: 375,
    viewportHeight: 320,
  }
  const cardThatFitsAbove = positionedCard({
    ...bottomMeasurements,
    pointerX: 355,
    cardHeight: 150,
    isRow: true,
  })
  expect(cardThatFitsAbove).toMatchObject({
    left: 67,
    top: 124,
  })
  expect(cardThatFitsAbove).not.toHaveProperty('maxHeight')
  const tallCard = positionedCard({
    ...bottomMeasurements,
    pointerX: null,
    cardHeight: 300,
  })
  expect(tallCard).toMatchObject({ left: 67, top: 50, maxHeight: 224 })
  expect(tallCard.top + (tallCard.maxHeight ?? 0)).toBeLessThanOrEqual(bottomAnchor.top - 6)

  const middleAnchor = DOMRect.fromRect({ x: 100, y: 323, width: 200, height: 32 })
  const middleCard = positionedCard({
    anchorRect: middleAnchor,
    pointerX: null,
    cardWidth: 300,
    cardHeight: 534,
    viewportWidth: 1440,
    viewportHeight: 900,
  })
  expect(middleCard).toMatchObject({ left: 100, top: 361, maxHeight: 531 })
  expect(middleCard.top).toBeGreaterThanOrEqual(middleAnchor.bottom + 6)
})

it('keeps a pointer row card in place when clicking focuses its row', () => {
  vi.stubGlobal('innerWidth', 1024)
  vi.stubGlobal('innerHeight', 768)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.matches('.ledger-row')) return new DOMRect(400, 200, 268, 32)
    if (this.matches('.hover-card, .hover-card__content')) return new DOMRect(0, 0, 300, 180)
    return new DOMRect(0, 0, 100, 28)
  })
  vi.useFakeTimers()
  const onRowActivate = vi.fn()
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
        onRowActivate={onRowActivate}
        hoverCard={(row) => ({ kind: 'item', delayMs: 0, render: () => row.name })}
        isVirtualized={false}
      />
    </HoverCardProvider>,
  )
  const row = screen.getByRole('row', { name: 'Belt' })
  fireEvent.mouseEnter(row, { clientX: 475 })
  act(() => vi.runOnlyPendingTimers())
  expect(screen.getByRole('dialog').style.left).toBe('489px')

  fireEvent.pointerDown(row)
  act(() => row.focus())
  fireEvent.pointerUp(row)
  fireEvent.click(row)
  act(() => vi.runOnlyPendingTimers())

  expect(onRowActivate).toHaveBeenCalledOnce()
  expect(screen.getByRole('dialog').style.left).toBe('489px')

  fireEvent.pointerDown(row)
  fireEvent.mouseLeave(row)
  fireEvent.pointerUp(document.body)
  act(() => row.blur())
  focusWithNavigationKey(row, 'ArrowDown')
  act(() => vi.runOnlyPendingTimers())
  expect(screen.getByRole('dialog').style.left).toBe('676px')
})

it('moves an initially short card above when its loaded content no longer fits below', () => {
  let notifyResize = (): void => {}
  const observedElements: Element[] = []
  function AsyncCardContent(): React.JSX.Element {
    const [isLoaded, setIsLoaded] = useState(false)
    useEffect(() => {
      const timer = window.setTimeout(() => setIsLoaded(true), 100)
      return () => window.clearTimeout(timer)
    }, [])
    return <span>{isLoaded ? 'Loaded details' : 'Loading details'}</span>
  }
  function AsyncCardAnchor(): React.JSX.Element {
    const anchor = useHoverCard({ kind: 'item', delayMs: 0, render: () => <AsyncCardContent /> })
    return <button {...anchor}>Async anchor</button>
  }
  vi.stubGlobal('innerWidth', 1440)
  vi.stubGlobal('innerHeight', 900)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = (): void => callback([], this as ResizeObserver)
      }
      observe(element: Element): void {
        observedElements.push(element)
      }
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.matches('.hover-card, .hover-card__content')) {
      const naturalHeight = this.textContent?.includes('Loaded details') ? 292 : 50
      const inlineCap = Number.parseFloat(this.matches('.hover-card') ? this.style.maxHeight : '')
      return new DOMRect(0, 0, 300, Math.min(naturalHeight, inlineCap || Infinity))
    }
    return new DOMRect(800, 600, 140, 26)
  })
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <AsyncCardAnchor />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Async anchor' }), { clientX: 850 })
  act(() => vi.advanceTimersByTime(0))
  const card = screen.getByRole('dialog')
  expect(observedElements).toContain(card.querySelector('.hover-card__content'))
  expect(card.style.top).toBe('632px')
  const initialHeight = card.getBoundingClientRect().height

  act(() => vi.advanceTimersByTime(100))
  expect(card.getBoundingClientRect().height).toBeGreaterThan(initialHeight)
  act(() => notifyResize())

  expect(card.style.top).toBe('302px')
  expect(card.style.maxHeight).toBe('')
})

it('keeps a too-tall card capped after measuring its displayed box again', () => {
  let notifyResize = (): void => {}
  vi.stubGlobal('innerWidth', 1440)
  vi.stubGlobal('innerHeight', 900)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = (): void => callback([], this as ResizeObserver)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.matches('.hover-card__content')) return new DOMRect(0, 0, 300, 600)
    if (this.matches('.hover-card')) {
      const inlineCap = Number.parseFloat(this.style.maxHeight)
      return new DOMRect(0, 0, 300, Math.min(600, inlineCap || Infinity))
    }
    return new DOMRect(100, 323, 200, 32)
  })
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <CardHarness />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Item anchor' }), { clientX: 150 })
  act(() => vi.advanceTimersByTime(260))
  const card = screen.getByRole('dialog')
  expect(card.style.top).toBe('361px')
  expect(card.style.maxHeight).toBe('531px')

  act(() => notifyResize())
  expect(card.style.maxHeight).toBe('531px')
  expect(card.style.top).toBe('361px')
  act(() => notifyResize())
  expect(card.style.maxHeight).toBe('531px')
  expect(
    Number.parseFloat(card.style.top) + card.getBoundingClientRect().height,
  ).toBeLessThanOrEqual(892)
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
  expect(
    positionedCardBeside(
      DOMRect.fromRect({ x: 400, y: 200, width: 268, height: 32 }),
      300,
      800,
      1024,
      900,
    ),
  ).toEqual({
    left: 676,
    top: 200,
  })
})

it('places keyboard row cards beside the name cell and falls back below narrow rows', () => {
  const rowRect = DOMRect.fromRect({ x: 400, y: 200, width: 500, height: 32 })
  const measurements = {
    anchorRect: rowRect,
    pointerX: null,
    isRow: true,
    cardWidth: 300,
    cardHeight: 180,
    viewportWidth: 1024,
    viewportHeight: 768,
  }
  expect(
    positionedCard({
      ...measurements,
      besideRect: DOMRect.fromRect({ x: 400, y: 205.75, width: 220, height: 20 }),
    }),
  ).toMatchObject({ left: 628, top: 200 })
  expect(
    positionedCard({
      ...measurements,
      besideRect: DOMRect.fromRect({ x: 650, y: 205.75, width: 220, height: 20 }),
    }),
  ).toMatchObject({ left: 342, top: 200 })
  expect(
    positionedCard({
      ...measurements,
      anchorRect: DOMRect.fromRect({ x: 400, y: 700, width: 500, height: 32 }),
      besideRect: DOMRect.fromRect({ x: 400, y: 705.75, width: 220, height: 20 }),
    }),
  ).toMatchObject({ left: 628, top: 580 })
  expect(
    positionedCard({
      ...measurements,
      anchorRect: DOMRect.fromRect({ x: 8, y: 200, width: 359, height: 32 }),
      besideRect: DOMRect.fromRect({ x: 8, y: 200, width: 359, height: 32 }),
      viewportWidth: 375,
    }),
  ).toMatchObject({ left: 8, top: 238 })
})

it.each([
  { viewportWidth: 1024, rowLeft: 400, expectedLeft: 528, expectedTop: 200, openBy: 'focus' },
  { viewportWidth: 1024, rowLeft: 650, expectedLeft: 342, expectedTop: 200, openBy: 'focus' },
  { viewportWidth: 375, rowLeft: 8, expectedLeft: 8, expectedTop: 238, openBy: 'focus' },
  { viewportWidth: 1024, rowLeft: 400, expectedLeft: 528, expectedTop: 200, openBy: 't' },
  { viewportWidth: 1024, rowLeft: 400, expectedLeft: 489, expectedTop: 238, openBy: 'pointer' },
])(
  'places a $openBy row card beside its name cell or falls back at $viewportWidth px from $rowLeft',
  ({ viewportWidth, rowLeft, expectedLeft, expectedTop, openBy }) => {
    vi.stubGlobal('innerWidth', viewportWidth)
    vi.stubGlobal('innerHeight', 768)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.matches('.ledger-row'))
        return new DOMRect(rowLeft, 200, viewportWidth === 1024 ? 268 : 359, 32)
      if (this.matches('.ledger-cell--primary'))
        return new DOMRect(rowLeft, 205.75, viewportWidth === 1024 ? 120 : 359, 20)
      if (this.matches('.hover-card, .hover-card__content')) return new DOMRect(0, 0, 300, 180)
      return new DOMRect(0, 0, 100, 28)
    })
    vi.useFakeTimers()
    render(
      <HoverCardProvider>
        <LedgerTable
          columns={[
            {
              key: 'name',
              label: 'Name',
              isPrimary: true,
              minWidth: 120,
              sortValue: (row) => row.name,
              render: (row) => row.name,
            },
          ]}
          rowCount={1}
          rowAt={() => ({ id: 1, name: 'Belt' })}
          rowKey={(row) => row.id}
          onRowActivate={vi.fn()}
          hoverCard={(row) => ({ kind: 'item', delayMs: 0, render: () => row.name })}
          isVirtualized={false}
        />
      </HoverCardProvider>,
    )
    const row = screen.getByRole('row', { name: 'Belt' })
    if (openBy === 'pointer') fireEvent.mouseEnter(row, { clientX: 475 })
    else {
      if (openBy === 'focus') focusWithNavigationKey(row, 'ArrowDown')
      else act(() => row.focus())
      if (openBy === 't') fireEvent.keyDown(row, { key: 't' })
    }
    act(() => vi.runOnlyPendingTimers())
    const card = screen.getByRole('dialog')
    expect(Number.parseFloat(card.style.left)).toBe(expectedLeft)
    expect(Number.parseFloat(card.style.top)).toBe(expectedTop)
  },
)

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
  expect(screen.getAllByRole('dialog')[0]).toHaveClass('hover-card--pinned')
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
