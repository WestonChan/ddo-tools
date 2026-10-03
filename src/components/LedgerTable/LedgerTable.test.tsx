import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LedgerTable } from './LedgerTable'
import type { LedgerColumn } from './ledgerModel'

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
    expect(onRowActivate).toHaveBeenCalledWith(rows[1])
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
    expect(
      screen.getAllByRole('columnheader').filter((header) => header.tabIndex >= 0),
    ).toHaveLength(0)
  })

  it('renders a column marked unsortable as a static header without changing the other controls', () => {
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
    expect(packHeader.querySelector('button')).toBeNull()
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

  it('keeps both columns above their minimum width when a divider is dragged', () => {
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
    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize ML' }), { clientX: 0 })
    fireEvent.mouseMove(window, { clientX: 100 })
    fireEvent.mouseUp(window)
    expect(screen.getByRole('columnheader', { name: /ML/ })).toHaveStyle({ flex: '0 0 40px' })
  })

  it('reorders a column when its header is dragged to the right', async () => {
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
    headers.forEach((header, index) => {
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 }),
      )
    })
    fireEvent.pointerDown(headers[1], {
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
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 260, clientY: 15 })
    expect(
      screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-key')),
    ).toEqual(['name', 'pack', 'ml'])
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
