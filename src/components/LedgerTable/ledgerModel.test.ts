import { describe, expect, it } from 'vitest'
import {
  nextLedgerSort,
  reorderedColumnKeys,
  resizedDividerWidths,
  sortedLedgerRows,
  visibleLedgerColumns,
} from './ledgerModel'
import type { LedgerColumn } from './ledgerModel'

const rows = [
  { name: 'Belt', ml: 4 },
  { name: 'Back', ml: 20 },
  { name: 'Body', ml: null },
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
    defaultSortDirection: 'desc',
    sortValue: (row) => row.ml,
    render: (row) => row.ml ?? '—',
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

describe('ledger model', () => {
  it('starts ML descending, text ascending, and flips repeated header clicks', () => {
    const first = nextLedgerSort(null, columns[1])
    expect(first).toEqual({ key: 'ml', direction: 'desc' })
    expect(sortedLedgerRows(rows, columns, first).map((row) => row.ml)).toEqual([20, 4, null])
    expect(nextLedgerSort(first, columns[1])).toEqual({ key: 'ml', direction: 'asc' })
    expect(nextLedgerSort(first, columns[0])).toEqual({ key: 'name', direction: 'asc' })
  })

  it('keeps headings and subheadings in place while sorting rows inside each group', () => {
    const groupedRows = [
      { name: 'Set', ml: null, kind: 'heading' },
      { name: '2 pieces', ml: null, kind: 'subheading' },
      { name: 'Low', ml: 4, kind: 'row' },
      { name: 'High', ml: 20, kind: 'row' },
      { name: '5 pieces', ml: null, kind: 'subheading' },
      { name: 'Last', ml: 12, kind: 'row' },
    ] as const
    expect(
      sortedLedgerRows(
        [...groupedRows],
        columns,
        { key: 'ml', direction: 'desc' },
        (row) => row.kind,
      ).map((row) => row.name),
    ).toEqual(['Set', '2 pieces', 'High', 'Low', '5 pieces', 'Last'])
  })

  it('moves headers and clamps widths without dropping responsive columns permanently', () => {
    expect(reorderedColumnKeys(['name', 'ml', 'pack'], 'pack', 'ml')).toEqual([
      'name',
      'pack',
      'ml',
    ])
    expect(reorderedColumnKeys(['name', 'ml', 'pack'], 'ml', 'pack')).toEqual([
      'name',
      'pack',
      'ml',
    ])
    expect(resizedDividerWidths(180, 44, 120, 40, 100)).toEqual({ left: 184, right: 40 })
    expect(resizedDividerWidths(180, 44, 120, 40, -100)).toEqual({ left: 120, right: 104 })
    expect(visibleLedgerColumns(columns, 375).map((column) => column.key)).toEqual(['name', 'ml'])
    expect(visibleLedgerColumns(columns, 800).map((column) => column.key)).toEqual([
      'name',
      'ml',
      'pack',
    ])
  })
})
