import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { LedgerTable } from './LedgerTable'
import type { LedgerColumn } from './ledgerModel'

const ledgerStyles = readFileSync('src/components/LedgerTable/LedgerTable.css', 'utf8')

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
  it('uses the picker highlight treatment separately from selected rows', () => {
    const selectedStyle = ledgerStyles.match(/\.ledger-row--selected\s*\{([^}]+)\}/)?.[1]
    const highlightedStyle = ledgerStyles.match(
      /\.ledger-row--keyboard-highlighted\s*\{([^}]+)\}/,
    )?.[1]
    expect(selectedStyle).toContain('background: var(--surface-selected)')
    expect(highlightedStyle).toContain('background: var(--surface-active)')
    expect(highlightedStyle).toContain('box-shadow: var(--inset-mark-picker)')
  })

  it('skips heading rows when navigating from an external input', async () => {
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
    screen.getByRole('textbox', { name: 'Search rows' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('row', { name: /Belt/ })).toHaveClass(
      'ledger-row--keyboard-highlighted',
    )
    expect(screen.getByRole('row', { name: /Items/ })).not.toHaveClass(
      'ledger-row--keyboard-highlighted',
    )
    await userEvent.keyboard('{End}{Enter}')
    expect(onRowActivate).toHaveBeenCalledWith(rows[2], 'keyboard')
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
    await userEvent.click(screen.getByRole('button', { name: /Sort ML/ }))
    expect(
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(['Back20Pack', 'Body12Pack', 'Belt4Pack'])
    const firstRow = screen.getAllByRole('row')[1]
    firstRow.focus()
    await userEvent.keyboard('{ArrowDown}{End}{Home}{Enter}')
    expect(screen.getAllByRole('row')[1]).toHaveFocus()
    expect(onRowActivate).toHaveBeenCalledWith(rows[1], 'keyboard')
    expect(screen.getAllByRole('row').filter((row) => row.tabIndex === 0)).toHaveLength(1)
  })

  it('hides columns at narrow widths and keeps selection marked', () => {
    render(
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
    expect(screen.getByRole('row', { name: /Back/ })).toHaveAttribute('aria-current', 'true')
  })

  it('sorts with Enter on a header button and has one tab stop per header', async () => {
    render(
      <LedgerTable
        columns={columns}
        rowCount={rows.length}
        rowAt={(index) => rows[index]}
        rowKey={(row) => row.id}
        onRowActivate={vi.fn()}
        isVirtualized={false}
      />,
    )
    const sortButton = screen.getByRole('button', { name: 'Sort ML' })
    sortButton.focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('columnheader', { name: /ML/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(screen.getByRole('button', { name: 'Move ML' })).toHaveClass('sr-only')
    expect(screen.getByRole('button', { name: 'Move ML' })).not.toHaveAttribute('title')
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Move ML' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Move ML' })).toHaveTextContent('ML')
    expect(
      screen.getAllByRole('columnheader').filter((header) => header.tabIndex >= 0),
    ).toHaveLength(0)
  })

  it('sorts on a plain header click but not on its resize grip or reorder handle', async () => {
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
    screen.getByRole('button', { name: 'Sort ML' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Move ML' })).toHaveFocus()
    await userEvent.keyboard(' ')
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /ML/ })).toHaveClass(
        'ledger-header-cell--dragging',
      ),
    )
    await userEvent.keyboard('{Escape}')
    expect(onSortChange).toHaveBeenCalledTimes(1)
  })

  it('renders a column marked unsortable without a sort button but with a reorder handle', () => {
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
    expect(screen.queryByRole('button', { name: 'Sort Pack' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Move Pack' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort Name' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort ML' })).toBeInTheDocument()
  })

  it('keeps one row tabbable when the list shrinks below the previous focus', async () => {
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
    screen.getAllByRole('row')[3].focus()
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
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Sort ML' }), {
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

  it('reorders a static column from its keyboard handle', async () => {
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
    screen.getByRole('button', { name: 'Sort ML' }).focus()
    await userEvent.tab()
    await userEvent.tab()
    const reorderHandle = screen.getByRole('button', { name: 'Move Pack' })
    expect(reorderHandle).toHaveFocus()
    await userEvent.keyboard(' ')
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
    await userEvent.keyboard(' ')
    expect(
      screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-key')),
    ).toEqual(['name', 'pack', 'ml'])
    expect(reorderHandle).toHaveFocus()
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
