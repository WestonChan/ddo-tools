import type { ReactNode } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

export interface LedgerColumn<Row> {
  key: string
  label: string
  width?: number
  isFlexible?: boolean
  isPrimary?: boolean
  minWidth: number
  align?: 'left' | 'right' | 'center'
  isMonospaced?: boolean
  hiddenBelowPx?: number
  defaultSortDirection?: 'asc' | 'desc'
  isSortable?: boolean
  sortValue: (row: Row) => string | number | boolean | null
  render: (row: Row) => ReactNode
}

export interface LedgerSort {
  key: string
  direction: 'asc' | 'desc'
}

export type LedgerRowKind = 'row' | 'heading' | 'subheading'

const textCollator = new Intl.Collator(undefined, { sensitivity: 'base' })

export function nextLedgerSort<Row>(
  current: LedgerSort | null,
  column: LedgerColumn<Row>,
): LedgerSort {
  return {
    key: column.key,
    direction:
      current?.key === column.key
        ? current.direction === 'asc'
          ? 'desc'
          : 'asc'
        : (column.defaultSortDirection ?? 'asc'),
  }
}

export function sortedLedgerRows<Row>(
  rows: Row[],
  columns: LedgerColumn<Row>[],
  sort: LedgerSort | null,
  rowKind?: (row: Row) => LedgerRowKind,
): Row[] {
  const column = columns.find((candidate) => candidate.key === sort?.key)
  if (!column || !sort) return rows
  const direction = sort.direction === 'asc' ? 1 : -1
  function compare(left: Row, right: Row): number {
    const leftValue = column!.sortValue(left)
    const rightValue = column!.sortValue(right)
    if (leftValue === null) return rightValue === null ? 0 : 1
    if (rightValue === null) return -1
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction
    }
    return textCollator.compare(String(leftValue), String(rightValue)) * direction
  }
  if (!rowKind) return [...rows].sort(compare)
  const sortedRows: Row[] = []
  let segment: Row[] = []
  for (const row of rows) {
    if (rowKind(row) !== 'row') {
      sortedRows.push(...segment.sort(compare), row)
      segment = []
    } else segment.push(row)
  }
  return sortedRows.concat(segment.sort(compare))
}

export function reorderedColumnKeys(keys: string[], activeKey: string, overKey: string): string[] {
  if (!keys.includes(activeKey) || !keys.includes(overKey)) return keys
  return arrayMove(keys, keys.indexOf(activeKey), keys.indexOf(overKey))
}

export function resizedDividerWidths(
  left: number,
  right: number,
  leftMinimum: number,
  rightMinimum: number,
  delta: number,
): { left: number; right: number } {
  const clampedDelta = Math.max(leftMinimum - left, Math.min(right - rightMinimum, delta))
  return { left: Math.round(left + clampedDelta), right: Math.round(right - clampedDelta) }
}

export function visibleLedgerColumns<Row>(
  columns: LedgerColumn<Row>[],
  viewportWidth: number,
): LedgerColumn<Row>[] {
  return columns.filter((column) => !column.hiddenBelowPx || viewportWidth >= column.hiddenBelowPx)
}
