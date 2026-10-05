import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useRef } from 'react'
import { LedgerTable } from './LedgerTable'
import { HoverCardProvider } from '../HoverCard'
import type { LedgerColumn } from './ledgerModel'

const ledgerStyles = readFileSync('src/components/LedgerTable/LedgerTable.css', 'utf8')
const globalStyles = readFileSync('src/index.css', 'utf8')

const rows = [
  { id: 1, name: 'Belt', ml: 4 },
  { id: 2, name: 'Back', ml: 20 },
  { id: 3, name: 'Body', ml: 12 },
]
const columns: LedgerColumn<(typeof rows)[number]>[] = [
  {
    key: 'name',
    label: 'Name',
    isFlexible: true,
    minWidth: 120,
    sortValue: (row) => row.name,
    render: (row) => row.name,
  },
  {
    key: 'ml',
    label: 'ML',
    width: 44,
    minWidth: 40,
    isMonospaced: true,
    defaultSortDirection: 'desc',
    sortValue: (row) => row.ml,
    render: (row) => row.ml,
  },
  {
    key: 'pack',
    label: 'Pack',
    width: 168,
    minWidth: 80,
    hiddenBelowPx: 600,
    sortValue: (row) => row.name,
    render: () => 'Pack',
  },
]

afterEach(cleanup)

describe('LedgerTable', () => {
  it('collapses each heading independently and navigates through visible rows', async () => {
    const groupedRows = [
      { id: 1, name: 'First set', ml: 0 },
      { id: 2, name: 'First tier', ml: 0 },
      { id: 3, name: 'First bonus', ml: 3 },
      { id: 4, name: 'Second set', ml: 0 },
      { id: 5, name: 'Second tier', ml: 0 },
      { id: 6, name: 'Second bonus', ml: 6 },
    ]
    render(
      <LedgerTable
        columns={columns}
        rowCount={groupedRows.length}
        rowAt={(index) => groupedRows[index]}
        rowKey={(row) => row.id}
        rowKind={(row) =>
          row.name.endsWith('set')
            ? 'collapsibleHeading'
            : row.name.endsWith('tier')
              ? 'subheading'
              : 'row'
        }
        onRowActivate={vi.fn()}
        isVirtualized={false}
      />,
    )
    const firstHeading = screen.getByRole('row', { name: /First set/ })
    const secondHeading = screen.getByRole('row', { name: /Second set/ })
    expect(firstHeading).toHaveAttribute('aria-expanded', 'false')
    expect(secondHeading).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('row', { name: /First bonus/ })).toBeNull()
    expect(screen.queryByRole('row', { name: /Second bonus/ })).toBeNull()
    act(() => firstHeading.focus())
    await userEvent.keyboard('{Enter}')
    expect(firstHeading).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('row', { name: /First tier/ })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('row', { name: /First bonus/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Second bonus/ })).toBeNull()
    await userEvent.keyboard('{End} ')
    expect(secondHeading).toHaveFocus()
    expect(secondHeading).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('row', { name: /Second bonus/ })).toBeInTheDocument()
    await userEvent.click(firstHeading)
    expect(firstHeading).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('row', { name: /First bonus/ })).toBeNull()
    expect(screen.getByRole('row', { name: /Second bonus/ })).toBeInTheDocument()
  })
  it('uses fills and selected name text without inset marks or row focus outlines', () => {
    const rowStyle = [...ledgerStyles.matchAll(/^\.ledger-row\s*\{([\s\S]*?)\n\}/gm)].find(
      ([, style]) => style.includes('cursor: pointer'),
    )?.[1]
    const selectedStyle = ledgerStyles.match(/\.ledger-row--selected\s*\{([^}]+)\}/)?.[1]
    const selectedNameStyle = ledgerStyles.match(
      /\.ledger-row--selected \.ledger-cell--primary\s*\{([^}]+)\}/,
    )?.[1]
    const focusedStyle = ledgerStyles.match(
      /\.ledger-table \.ledger-row:is\(:hover, :focus-visible\):not\(\.ledger-row--selected\)\s*\{([^}]+)\}/,
    )?.[1]
    const unpinnedFocusStyle = ledgerStyles.match(
      /\.ledger-table \.ledger-row:focus-visible:not\(\[data-hover-card-pinned\]\)\s*\{([^}]+)\}/,
    )?.[1]
    const globalFocusStyle = globalStyles.match(/^:focus-visible\s*\{([^}]+)\}/m)?.[1]
    expect(rowStyle).not.toContain('&:hover')
    expect(selectedStyle).toContain('background: var(--surface-selected)')
    expect(selectedStyle).not.toMatch(/box-shadow|outline|border-left/)
    expect(selectedNameStyle).toContain('color: var(--text-accent)')
    expect(selectedNameStyle).toContain('font-weight: var(--fw-semibold)')
    expect(ledgerStyles).not.toContain('ledger-row--keyboard-highlighted')
    expect(focusedStyle).toContain('background: var(--surface-hover)')
    expect(unpinnedFocusStyle).toContain('outline: 2px solid transparent')
    expect(globalFocusStyle).toContain('outline: 2px solid var(--border-focus)')

    const primaryColumns = columns.map((column) =>
      column.key === 'name' ? { ...column, key: 'display', isPrimary: true } : column,
    )

    render(
      <LedgerTable
        columns={primaryColumns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        selectedRowKey={2}
        onRowActivate={vi.fn()}
        isVirtualized={false}
      />,
    )
    const selectedRow = screen.getByRole('row', { name: /Back/ })
    expect(selectedRow).toHaveClass('ledger-row--selected')
    expect(within(selectedRow).getByRole('cell', { name: 'Back' })).toHaveClass(
      'ledger-cell--primary',
    )
  })

  it('moves focus from search through rows while skipping headings and keeping focus on Enter', async () => {
    const groupedRows = [{ id: 0, name: 'Items', ml: 0 }, ...rows]
    const onRowActivate = vi.fn()
    function SearchableLedger(): React.JSX.Element {
      const navigationInputRef = useRef<HTMLInputElement>(null)
      return (
        <>
          <input ref={navigationInputRef} aria-label="Search rows" />
          <LedgerTable
            columns={columns}
            rowCount={groupedRows.length}
            rowAt={(index) => groupedRows[index]}
            rowKey={(row) => row.id}
            rowKind={(row) => (row.id === 0 ? 'heading' : 'row')}
            onRowActivate={onRowActivate}
            navigationInputRef={navigationInputRef}
            isVirtualized={false}
          />
        </>
      )
    }
    render(<SearchableLedger />)
    const search = screen.getByRole('textbox', { name: 'Search rows' })
    search.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('row', { name: /Belt/ })).toHaveFocus()
    expect(search).not.toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('row', { name: /Back/ })).toHaveFocus()
    await userEvent.keyboard('{End}{Enter}')
    expect(screen.getByRole('row', { name: /Body/ })).toHaveFocus()
    expect(onRowActivate).toHaveBeenCalledWith(rows[2], 'keyboard')
    await userEvent.keyboard('{Home}{ArrowUp}')
    expect(screen.getByRole('row', { name: /Belt/ })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('row', { name: /Belt/ })).toHaveFocus()
    expect(document.querySelector('.ledger-plain-body')).not.toHaveAttribute('tabindex')
    search.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('row', { name: /Belt/ })).toHaveFocus()
  })

  it('tabs to the selected row and keeps it focused on Escape', async () => {
    render(
      <>
        <button>Before table</button>
        <LedgerTable
          columns={columns}
          rowCount={rows.length}
          rowAt={(index) => rows[index]}
          rowKey={(row) => row.id}
          selectedRowKey={2}
          onRowActivate={vi.fn()}
          isVirtualized={false}
        />
        <button>After table</button>
      </>,
    )
    screen.getByRole('button', { name: 'Before table' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('row', { name: /Back/ })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('row', { name: /Back/ })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'After table' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('row', { name: /Back/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('row', { name: /Belt/ })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'After table' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('row', { name: /Back/ })).toHaveFocus()
  })

  it('opens the focused row card after the hover delay, switches cards, and pins with T', () => {
    vi.useFakeTimers()
    try {
      render(
        <HoverCardProvider>
          <LedgerTable
            columns={columns}
            rowCount={rows.length}
            rowAt={(index) => rows[index]}
            rowKey={(row) => row.id}
            onRowActivate={vi.fn()}
            hoverCard={(row) => ({
              kind: 'item',
              delayMs: 260,
              render: () => <span>{row.name} card</span>,
            })}
            isVirtualized={false}
          />
        </HoverCardProvider>,
      )
      const belt = screen.getByRole('row', { name: /Belt/ })
      const back = screen.getByRole('row', { name: /Back/ })
      act(() => belt.focus())
      act(() => vi.advanceTimersByTime(259))
      expect(screen.queryByRole('dialog')).toBeNull()
      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByText('Belt card')).toBeInTheDocument()
      act(() => back.focus())
      expect(screen.queryByRole('dialog')).toBeNull()
      act(() => vi.advanceTimersByTime(260))
      expect(screen.getByText('Back card')).toBeInTheDocument()
      fireEvent.keyDown(back, { key: 't' })
      act(() => vi.runOnlyPendingTimers())
      expect(back).toHaveAttribute('data-hover-card-pinned')
      expect(screen.getByRole('dialog')).toHaveFocus()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(back).toHaveFocus()
      expect(back).not.toHaveAttribute('data-hover-card-pinned')
      fireEvent.keyDown(back, { key: 'Escape' })
      expect(back).toHaveFocus()
    } finally {
      vi.useRealTimers()
    }
  })

  it('closes an unpinned focused row card and keeps focus on the row', () => {
    vi.useFakeTimers()
    try {
      render(
        <HoverCardProvider>
          <LedgerTable
            columns={columns}
            rowCount={rows.length}
            rowAt={(index) => rows[index]}
            rowKey={(row) => row.id}
            onRowActivate={vi.fn()}
            hoverCard={(row) => ({
              kind: 'item',
              delayMs: 260,
              render: () => <span>{row.name} card</span>,
            })}
            isVirtualized={false}
          />
        </HoverCardProvider>,
      )
      const belt = screen.getByRole('row', { name: /Belt/ })
      act(() => belt.focus())
      act(() => vi.advanceTimersByTime(260))
      expect(screen.getByText('Belt card')).toBeInTheDocument()
      fireEvent.keyDown(belt, { key: 'Escape' })
      expect(belt).toHaveFocus()
      expect(screen.queryByRole('dialog')).toBeNull()
      fireEvent.keyDown(belt, { key: 'Escape' })
      expect(belt).toHaveFocus()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps focus on the row and cancels a card that has not opened', () => {
    vi.useFakeTimers()
    try {
      render(
        <HoverCardProvider>
          <LedgerTable
            columns={columns}
            rowCount={rows.length}
            rowAt={(index) => rows[index]}
            rowKey={(row) => row.id}
            onRowActivate={vi.fn()}
            hoverCard={(row) => ({
              kind: 'item',
              delayMs: 260,
              render: () => <span>{row.name} card</span>,
            })}
            isVirtualized={false}
          />
        </HoverCardProvider>,
      )
      const belt = screen.getByRole('row', { name: /Belt/ })
      act(() => belt.focus())
      act(() => vi.advanceTimersByTime(259))
      expect(screen.queryByRole('dialog')).toBeNull()
      fireEvent.keyDown(belt, { key: 'Escape' })
      expect(belt).toHaveFocus()
      act(() => vi.advanceTimersByTime(260))
      expect(screen.queryByRole('dialog')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens cards after focus jumps and tabs back to an offscreen active row', async () => {
    vi.useFakeTimers()
    const originalScrollTo = HTMLElement.prototype.scrollTo
    HTMLElement.prototype.scrollTo = function (
      options: ScrollToOptions | number = {},
      y?: number,
    ): void {
      this.scrollTop = (typeof options === 'number' ? y : options.top) ?? 0
      fireEvent.scroll(this)
    }
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe(target: Element): void {
          if (!target.classList.contains('ledger-body')) return
          this.callback(
            [{ target, contentRect: new DOMRect(0, 0, 600, 128) } as ResizeObserverEntry],
            this as ResizeObserver,
          )
        }
        unobserve(): void {}
        disconnect(): void {}
      },
    )
    try {
      const virtualRows = Array.from({ length: 120 }, (_, index) => ({
        id: index + 1,
        name: `Belt ${index + 1}`,
        ml: index + 1,
      }))
      function VirtualLedger(): React.JSX.Element {
        const navigationInputRef = useRef<HTMLInputElement>(null)
        return (
          <HoverCardProvider>
            <input ref={navigationInputRef} aria-label="Search rows" />
            <LedgerTable
              columns={columns}
              rowCount={virtualRows.length}
              rowAt={(index) => virtualRows[index]}
              rowKey={(row) => row.id}
              onRowActivate={vi.fn()}
              navigationInputRef={navigationInputRef}
              hoverCard={(row) => ({
                kind: 'item',
                delayMs: 260,
                render: () => <span>{row.name} card</span>,
              })}
            />
          </HoverCardProvider>
        )
      }
      render(
        <StrictMode>
          <VirtualLedger />
        </StrictMode>,
      )
      const body = document.querySelector<HTMLElement>('.ledger-body')!
      expect(body).not.toHaveAttribute('tabindex')
      Object.defineProperty(body, 'clientHeight', { value: 128, configurable: true })
      const search = screen.getByRole('textbox', { name: 'Search rows' })
      act(() => search.focus())
      fireEvent.keyDown(search, { key: 'ArrowDown' })
      expect(screen.getByRole('row', { name: /Belt 1/ })).toHaveFocus()
      act(() => vi.advanceTimersByTime(260))
      expect(screen.getByText('Belt 1 card')).toBeInTheDocument()
      fireEvent.keyDown(screen.getByRole('row', { name: /Belt 1/ }), { key: 'PageDown' })
      expect(screen.getByRole('row', { name: /Belt 5/ })).toHaveFocus()
      expect(screen.queryByRole('row', { name: /Belt 120/ })).toBeNull()
      act(() => search.focus())
      fireEvent.keyDown(search, { key: 'ArrowUp' })
      expect(body.scrollTop).toBeGreaterThan(0)
      expect(screen.getByRole('row', { name: /Belt 120/ })).toHaveFocus()
      act(() => vi.advanceTimersByTime(260))
      expect(screen.getByText('Belt 120 card')).toBeInTheDocument()
      act(() => {
        body.scrollTop = 0
        fireEvent.scroll(body)
      })
      expect(screen.queryByRole('row', { name: /Belt 120/ })).toBeNull()
      act(() => screen.getByRole('columnheader', { name: 'Name' }).focus())
      vi.useRealTimers()
      await userEvent.tab()
      expect(screen.getByRole('row', { name: /Belt 120/ })).toHaveFocus()
    } finally {
      HTMLElement.prototype.scrollTo = originalScrollTo
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })

  it('sorts from headers and navigates with one tab stop', async () => {
    const onRowActivate = vi.fn()
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={onRowActivate}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    await userEvent.click(screen.getByRole('columnheader', { name: 'ML' }))
    expect(
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(['Back20Pack', 'Body12Pack', 'Belt4Pack'])
    const firstRow = screen.getAllByRole('row')[1]
    act(() => firstRow.focus())
    await userEvent.keyboard('{ArrowDown}{End}{Home}{Enter}')
    expect(screen.getAllByRole('row')[1]).toHaveFocus()
    expect(onRowActivate).toHaveBeenCalledWith(rows[1], 'keyboard')
    expect(screen.getAllByRole('row').filter((row) => row.tabIndex === 0)).toHaveLength(1)
    expect(document.querySelector('.ledger-plain-body')).not.toHaveAttribute('tabindex')
  })

  it('hides columns at narrow widths and keeps selection marked', () => {
    const view = render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        selectedRowKey={2}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    act(() => screen.getByRole('columnheader', { name: 'Pack' }).focus())
    view.rerender(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        selectedRowKey={2}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={375}
      />,
    )
    expect(screen.queryByRole('columnheader', { name: /Pack/ })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('row', { name: /Back/ })).toHaveAttribute('aria-current', 'true')
  })

  it('tabs into the current header and row in either direction', async () => {
    render(
      <>
        <button>Last filter chip</button>
        <LedgerTable
          columns={columns}
          rowCount={rows.length}
          rowAt={(index) => rows[index]}
          rowKey={(row) => row.id}
          onRowActivate={vi.fn()}
          isVirtualized={false}
          viewportWidth={800}
        />
        <button>After ledger</button>
      </>,
    )
    screen.getByRole('button', { name: 'Last filter chip' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('row', { name: /Belt/ })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Last filter chip' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveFocus()
    expect(screen.getAllByRole('columnheader').filter((header) => header.tabIndex >= 0)).toEqual([
      screen.getByRole('columnheader', { name: 'ML' }),
    ])
    expect(screen.queryByRole('button', { name: /^Sort |^Move / })).toBeNull()
  })

  it('skips the absent body when empty and keeps the empty message in the DOM', async () => {
    render(
      <>
        <button>Before ledger</button>
        <LedgerTable
          columns={columns}
          rowCount={0}
          rowAt={(index) => rows[index]}
          rowKey={(row) => row.id}
          onRowActivate={vi.fn()}
          isVirtualized={false}
          emptyState="No rows match."
        />
        <button>After ledger</button>
      </>,
    )
    screen.getByRole('button', { name: 'Before ledger' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'After ledger' })).toHaveFocus()
    expect(screen.getByText('No rows match.')).toBeVisible()
  })

  it('starts at the first visible header when the initial order is controlled', () => {
    render(
      <LedgerTable
        columns={columns}
        columnOrder={['ml', 'name', 'pack']}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={375}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('tabindex', '-1')
  })

  it('moves between visible headers with clamped arrows and Home and End', async () => {
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={375}
      />,
    )
    const name = screen.getByRole('columnheader', { name: 'Name' })
    const ml = screen.getByRole('columnheader', { name: 'ML' })
    act(() => name.focus())
    await userEvent.keyboard('{ArrowLeft}{End}')
    expect(ml).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(ml).toHaveFocus()
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowLeft}')
    expect(name).toHaveFocus()
    expect(screen.queryByRole('columnheader', { name: 'Pack' })).toBeNull()
  })

  it('sorts and flips with Enter and Space but leaves a static header unchanged', async () => {
    const staticColumns = columns.map((column) =>
      column.key === 'pack' ? { ...column, isSortable: false } : column,
    )
    render(
      <LedgerTable
        columns={staticColumns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    const ml = screen.getByRole('columnheader', { name: 'ML' })
    act(() => ml.focus())
    await userEvent.keyboard('{Enter}')
    expect(ml).toHaveAttribute('aria-sort', 'descending')
    await userEvent.keyboard(' ')
    expect(ml).toHaveAttribute('aria-sort', 'ascending')
    const pack = screen.getByRole('columnheader', { name: 'Pack' })
    act(() => pack.focus())
    await userEvent.keyboard('{Enter} ')
    expect(pack).not.toHaveAttribute('aria-sort')
    expect(ml).toHaveAttribute('aria-sort', 'ascending')
  })

  it('sorts on a plain header click but not on its resize grip or keyboard grab', async () => {
    const onSortChange = vi.fn()
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        onSortChange={onSortChange}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    await userEvent.click(screen.getByRole('columnheader', { name: /ML/ }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'ml', direction: 'desc' })
    await userEvent.click(screen.getByRole('separator', { name: 'Resize ML' }))
    act(() => screen.getByRole('columnheader', { name: 'ML' }).focus())
    await userEvent.keyboard('m')
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /ML/ })).toHaveClass(
        'ledger-header-cell--dragging',
      ),
    )
    await userEvent.keyboard('{Escape}')
    expect(onSortChange).toHaveBeenCalledTimes(1)
  })

  it('renders a static header with the same focus and reorder affordance', () => {
    const staticColumns = columns.map((column) =>
      column.key === 'pack' ? { ...column, isSortable: false } : column,
    )
    render(
      <LedgerTable
        columns={staticColumns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    const packHeader = screen.getByRole('columnheader', { name: /Pack/ })
    expect(packHeader).not.toHaveAttribute('aria-sort')
    expect(packHeader).toHaveAttribute('aria-description', expect.stringContaining('M'))
    expect(packHeader).toHaveAttribute('tabindex', '-1')
    expect(screen.queryByRole('button', { name: /^Sort |^Move / })).toBeNull()
  })

  it('moves the row tab stop to a surviving row when the list shrinks', async () => {
    const { rerender } = render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
      />,
    )
    act(() => screen.getAllByRole('row')[3].focus())
    rerender(
      <LedgerTable
        columns={columns}
        rowCount={1}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
      />,
    )
    expect(document.querySelector('.ledger-plain-body')).not.toHaveAttribute('tabindex')
    expect(screen.getAllByRole('row')[1]).toHaveAttribute('tabindex', '0')
  })

  it('requests more rows at End and continues keyboard navigation after rows append', async () => {
    const onNearEnd = vi.fn()
    const firstRows = rows.slice(0, 2)
    const props = {
      columns,
      rowKey: (row: (typeof rows)[number]) => row.id,
      onRowActivate: vi.fn(),
      onNearEnd,
      isSortedExternally: true,
      sort: { key: 'ml', direction: 'desc' as const },
      isVirtualized: false,
    }
    const view = render(
      <LedgerTable {...props} rowCount={firstRows.length} rowAt={(index) => firstRows[index]} />,
    )
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Belt')
    screen.getAllByRole('row')[1].focus()
    await userEvent.keyboard('{End}')
    expect(screen.getAllByRole('row')[2]).toHaveFocus()
    expect(onNearEnd).toHaveBeenCalledOnce()
    view.rerender(<LedgerTable {...props} rowCount={rows.length} rowAt={(index) => rows[index]} />)
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('row')[3]).toHaveFocus()
  })

  it('resizes with a pointer on the grip without reordering either column', () => {
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    fireEvent.pointerDown(screen.getByRole('separator', { name: 'Resize ML' }), {
      button: 0,
      pointerId: 1,
      isPrimary: true,
      clientX: 0,
    })
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100 })
    expect(screen.getByRole('columnheader', { name: /ML/ })).not.toHaveClass(
      'ledger-header-cell--dragging',
    )
    fireEvent.pointerUp(window, { pointerId: 1 })
    expect(screen.getByRole('columnheader', { name: /ML/ })).toHaveStyle({ flex: '0 0 40px' })
    expect(
      screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-key')),
    ).toEqual(['name', 'ml', 'pack'])
  })

  it('reorders a column when its label is dragged to the right', async () => {
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    const headers = screen.getAllByRole('columnheader')
    const headerRects = [
      { x: 0, width: 120 },
      { x: 120, width: 44 },
      { x: 164, width: 168 },
    ]
    headers.forEach((header, index) => {
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ ...headerRects[index], y: 0, height: 30 }),
      )
    })
    fireEvent.pointerDown(screen.getByRole('columnheader', { name: 'ML' }), {
      button: 0,
      pointerId: 1,
      isPrimary: true,
      clientX: 150,
      clientY: 15,
    })
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 260, clientY: 15 })
    expect(headers[1]).toHaveClass('ledger-header-cell--dragging')
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 275, clientY: 15 })
    await waitFor(() => expect(headers[2]).toHaveClass('ledger-header-cell--over'))
    expect(headers[1].style.transform).toContain('translate3d(')
    expect(headers[1].style.transform).not.toContain('scale')
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 260, clientY: 15 })
    expect(
      screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-key')),
    ).toEqual(['name', 'pack', 'ml'])
  })

  it('moves a column one step with Shift+Arrow and announces the position', async () => {
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    const ml = screen.getByRole('columnheader', { name: 'ML' })
    act(() => ml.focus())
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(screen.getAllByRole('columnheader').map((header) => header.dataset.columnKey)).toEqual([
      'name',
      'pack',
      'ml',
    ])
    expect(ml).toHaveFocus()
    expect(screen.getByTestId('ledger-header-announcement')).toHaveTextContent(
      'ML moved to position 3 of 3.',
    )
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}{Shift>}{ArrowLeft}{/Shift}')
    expect(screen.getAllByRole('columnheader').map((header) => header.dataset.columnKey)).toEqual([
      'name',
      'ml',
      'pack',
    ])
    expect(ml).toHaveFocus()
  })

  it.each([
    ['M', 'm'],
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('grabs a static header with M, moves it, and drops with %s', async (_key, dropKey) => {
    const staticColumns = columns.map((column) =>
      column.key === 'pack' ? { ...column, isSortable: false } : column,
    )
    render(
      <LedgerTable
        columns={staticColumns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    screen.getAllByRole('columnheader').forEach((header, index) => {
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 }),
      )
    })
    const packHeader = screen.getByRole('columnheader', { name: 'Pack' })
    act(() => packHeader.focus())
    await userEvent.keyboard('m')
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /Pack/ })).toHaveClass(
        'ledger-header-cell--dragging',
      ),
    )
    await userEvent.keyboard('{ArrowLeft}')
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /ML/ })).toHaveClass(
        'ledger-header-cell--over',
      ),
    )
    await userEvent.keyboard(dropKey)
    expect(
      screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-key')),
    ).toEqual(['name', 'pack', 'ml'])
    expect(packHeader).toHaveFocus()
  })

  it('announces picked up, over, dropped, and cancelled columns by label', async () => {
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    screen.getAllByRole('columnheader').forEach((header, index) => {
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 }),
      )
    })
    const ml = screen.getByRole('columnheader', { name: 'ML' })
    const pack = screen.getByRole('columnheader', { name: 'Pack' })
    const liveRegion = document.querySelector<HTMLElement>('[id^="DndLiveRegion-"]')
    expect(liveRegion).not.toBeNull()
    act(() => ml.focus())
    await userEvent.keyboard('m')
    await waitFor(() => expect(liveRegion).toHaveTextContent('Picked up ML.'))
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => expect(pack).toHaveClass('ledger-header-cell--over'))
    await waitFor(() => expect(liveRegion).toHaveTextContent('ML is over Pack.'))
    await userEvent.keyboard(' ')
    await waitFor(() => expect(liveRegion).toHaveTextContent('ML moved to position 3 of 3.'))
    await userEvent.keyboard('m')
    await waitFor(() => expect(ml).toHaveClass('ledger-header-cell--dragging'))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(liveRegion).toHaveTextContent('Move of ML cancelled.'))
  })

  it('cancels a grabbed header with Escape and preserves its order', async () => {
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    screen.getAllByRole('columnheader').forEach((header, index) => {
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 }),
      )
    })
    const ml = screen.getByRole('columnheader', { name: 'ML' })
    act(() => ml.focus())
    await userEvent.keyboard('m{ArrowRight}{Escape}')
    expect(ml).not.toHaveClass('ledger-header-cell--dragging')
    expect(screen.getAllByRole('columnheader').map((header) => header.dataset.columnKey)).toEqual([
      'name',
      'ml',
      'pack',
    ])
    expect(ml).toHaveFocus()
  })

  it('reorders a static column from its label with the pointer', () => {
    const staticColumns = columns.map((column) =>
      column.key === 'pack' ? { ...column, isSortable: false } : column,
    )
    render(
      <LedgerTable
        columns={staticColumns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
        viewportWidth={800}
      />,
    )
    screen.getAllByRole('columnheader').forEach((header, index) => {
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 }),
      )
    })
    const packHeader = screen.getByRole('columnheader', { name: /Pack/ })
    fireEvent.pointerDown(
      within(packHeader).getByText('Pack', { selector: '.ledger-header-label' }),
      {
        button: 0,
        pointerId: 1,
        isPrimary: true,
        clientX: 250,
        clientY: 15,
      },
    )
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 140, clientY: 15 })
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 125, clientY: 15 })
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 125, clientY: 15 })
    expect(
      screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-key')),
    ).toEqual(['name', 'pack', 'ml'])
    expect(packHeader).not.toHaveAttribute('aria-sort')
  })

  it('does not sort the same rows again for an unrelated render', () => {
    const sortValue = vi.fn((row: (typeof rows)[number]) => row.ml)
    const stableColumns = columns.map((column) =>
      column.key === 'ml' ? { ...column, sortValue } : column,
    )
    const rowAt = (index: number): (typeof rows)[number] => rows[index]
    const onRowActivate = vi.fn()
    const props = {
      columns: stableColumns,
      rowCount: rows.length,
      rowAt,
      rowKey: (row: (typeof rows)[number]) => row.id,
      onRowActivate,
      isVirtualized: false,
      initialSort: { key: 'ml', direction: 'desc' as const },
    }
    const { rerender } = render(<LedgerTable {...props} label="Before" />)
    const comparisons = sortValue.mock.calls.length
    expect(comparisons).toBeGreaterThan(0)
    rerender(<LedgerTable {...props} label="After" />)
    expect(sortValue).toHaveBeenCalledTimes(comparisons)
  })
})
