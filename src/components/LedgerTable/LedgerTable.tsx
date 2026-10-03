import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { List, type ListImperativeAPI, type RowComponentProps } from 'react-window'
import { useHoverCard, type HoverCardOptions } from '../HoverCard'
import {
  nextLedgerSort,
  reorderedColumnKeys,
  resizedDividerWidths,
  sortedLedgerRows,
  visibleLedgerColumns,
  type LedgerColumn,
  type LedgerSort,
} from './ledgerModel'
import './LedgerTable.css'

interface LedgerTableProps<Row> {
  columns: LedgerColumn<Row>[]
  rowCount: number
  rowAt: (index: number) => Row
  rowKey: (row: Row) => string | number
  onRowActivate: (row: Row) => void
  selectedRowKey?: string | number | null
  sort?: LedgerSort | null
  onSortChange?: (sort: LedgerSort) => void
  initialSort?: LedgerSort | null
  columnOrder?: string[]
  onColumnOrderChange?: (order: string[]) => void
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (widths: Record<string, number>) => void
  isVirtualized?: boolean
  isDense?: boolean
  viewportWidth?: number
  rowKind?: (row: Row) => 'row' | 'heading'
  emptyState?: ReactNode
  label?: string
  hoverCard?: (row: Row) => HoverCardOptions | null
  isHighlighted?: (row: Row) => boolean
  isSortedExternally?: boolean
  onNearEnd?: () => void
}

interface LedgerRowProps<Row> {
  rows: Row[]
  columns: LedgerColumn<Row>[]
  widths: Record<string, number>
  rowKey: (row: Row) => string | number
  onRowActivate: (row: Row) => void
  onRowKeyDown: (event: KeyboardEvent<HTMLDivElement>, index: number) => void
  onFocusedIndexChange: (index: number) => void
  focusedIndex: number
  selectedRowKey: string | number | null
  rowKind?: (row: Row) => 'row' | 'heading'
  hoverCard?: (row: Row) => HoverCardOptions | null
  isHighlighted?: (row: Row) => boolean
}

function columnStyle<Row>(
  column: LedgerColumn<Row>,
  widths: Record<string, number>,
): CSSProperties {
  const width = widths[column.key] ?? column.width
  return column.isFlexible
    ? { flex: '1 1 0', minWidth: column.minWidth }
    : { flex: '0 0 ' + (width ?? column.minWidth) + 'px', minWidth: column.minWidth }
}

function LedgerRow<Row>({
  index,
  style,
  rows,
  columns,
  widths,
  rowKey,
  onRowActivate,
  onRowKeyDown,
  onFocusedIndexChange,
  focusedIndex,
  selectedRowKey,
  rowKind,
  hoverCard,
  isHighlighted,
}: LedgerRowProps<Row> & {
  index: number
  style?: CSSProperties
}): JSX.Element | null {
  const row = rows[index]
  const hoverOptions = row ? hoverCard?.(row) : null
  const hoverAnchor = useHoverCard(hoverOptions ?? { kind: '', delayMs: 0, render: () => null })
  if (!row) return null
  const isHeading = rowKind?.(row) === 'heading'
  const isSelected = rowKey(row) === selectedRowKey
  return (
    <div
      role="row"
      data-row-index={index}
      data-row-key={rowKey(row)}
      className={
        'ledger-row' +
        (isSelected ? ' ledger-row--selected' : '') +
        (isHighlighted?.(row) ? ' ledger-row--highlighted' : '') +
        (isHeading ? ' ledger-row--heading' : '')
      }
      style={style}
      tabIndex={isHeading ? -1 : index === focusedIndex ? 0 : -1}
      aria-current={isSelected || undefined}
      data-hover-card-pinned={hoverOptions ? hoverAnchor['data-hover-card-pinned'] : undefined}
      onFocus={() => onFocusedIndexChange(index)}
      onClick={() => !isHeading && onRowActivate(row)}
      onKeyDown={(event) => !isHeading && onRowKeyDown(event, index)}
      onMouseEnter={hoverOptions ? hoverAnchor.onMouseEnter : undefined}
      onMouseLeave={hoverOptions ? hoverAnchor.onMouseLeave : undefined}
      onKeyDownCapture={hoverOptions ? hoverAnchor.onKeyDown : undefined}
    >
      {isHeading ? (
        <div role="cell" className="ledger-heading-cell">
          {columns[0]?.render(row)}
        </div>
      ) : (
        columns.map((column) => (
          <div
            key={column.key}
            role="cell"
            className={'ledger-cell' + (column.isMonospaced ? ' num' : '')}
            style={{ ...columnStyle(column, widths), textAlign: column.align ?? 'left' }}
          >
            {column.render(row)}
          </div>
        ))
      )}
    </div>
  )
}

function VirtualLedgerRow<Row>(props: RowComponentProps<LedgerRowProps<Row>>): JSX.Element | null {
  return <LedgerRow {...props} />
}

interface HeaderCellProps<Row> {
  column: LedgerColumn<Row>
  widths: Record<string, number>
  isFirst: boolean
  isSorted: boolean
  sortDirection: 'asc' | 'desc' | null
  onSort: () => void
  onResize: (event: MouseEvent<HTMLSpanElement>, column: LedgerColumn<Row>) => void
}

function HeaderCell<Row>({
  column,
  widths,
  isFirst,
  isSorted,
  sortDirection,
  onSort,
  onResize,
}: HeaderCellProps<Row>): JSX.Element {
  const { listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: column.key })
  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        setActivatorNodeRef(node)
      }}
      data-column-key={column.key}
      aria-sort={
        column.isSortable === false
          ? undefined
          : isSorted
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
      }
      className={
        'ledger-header-cell' +
        (isDragging ? ' ledger-header-cell--dragging' : '') +
        (isOver ? ' ledger-header-cell--over' : '')
      }
      style={{
        ...columnStyle(column, widths),
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...listeners}
      role="columnheader"
    >
      {!isFirst && (
        <span
          role="separator"
          aria-label={'Resize ' + column.label}
          aria-orientation="vertical"
          className="ledger-resize-grip"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => onResize(event, column)}
        >
          <span />
        </span>
      )}
      {column.isSortable === false ? (
        <span className="ledger-header-label">{column.label}</span>
      ) : (
        <button
          type="button"
          aria-label={'Sort ' + column.label}
          className="ledger-sort-button"
          onClick={onSort}
        >
          {column.label}
          {isSorted &&
            (sortDirection === 'asc' ? (
              <ChevronUp size={11} aria-hidden />
            ) : (
              <ChevronDown size={11} aria-hidden />
            ))}
        </button>
      )}
    </div>
  )
}

export function LedgerTable<Row>({
  columns,
  rowCount,
  rowAt,
  rowKey,
  onRowActivate,
  selectedRowKey = null,
  sort: controlledSort,
  onSortChange,
  initialSort = null,
  columnOrder: controlledOrder,
  onColumnOrderChange,
  columnWidths: controlledWidths,
  onColumnWidthsChange,
  isVirtualized = true,
  isDense = false,
  viewportWidth,
  rowKind,
  emptyState,
  label = 'Ledger table',
  hoverCard,
  isHighlighted,
  isSortedExternally = false,
  onNearEnd,
}: LedgerTableProps<Row>): JSX.Element {
  const [uncontrolledSort, setUncontrolledSort] = useState<LedgerSort | null>(initialSort)
  const [uncontrolledOrder, setUncontrolledOrder] = useState(() =>
    columns.map((column) => column.key),
  )
  const [uncontrolledWidths, setUncontrolledWidths] = useState<Record<string, number>>({})
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const listRef = useRef<ListImperativeAPI>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const pendingFocusIndex = useRef<number | null>(null)
  const sort = controlledSort === undefined ? uncontrolledSort : controlledSort
  const order = controlledOrder ?? uncontrolledOrder
  const widths = controlledWidths ?? uncontrolledWidths
  const orderedColumns = order.flatMap((key) => columns.find((column) => column.key === key) ?? [])
  const visibleColumns = visibleLedgerColumns(orderedColumns, viewportWidth ?? windowWidth)
  const rows = useMemo(
    () => Array.from({ length: rowCount }, (_, index) => rowAt(index)),
    [rowCount, rowAt],
  )
  const sortedRows = useMemo(
    () => (isSortedExternally ? rows : sortedLedgerRows(rows, columns, sort, rowKind)),
    [rows, columns, sort, rowKind, isSortedExternally],
  )
  const tabbableRowIndex = Math.min(focusedIndex, Math.max(0, sortedRows.length - 1))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (viewportWidth !== undefined) return
    const resize = (): void => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [viewportWidth])

  function focusRow(index: number): void {
    const nextIndex = Math.max(0, Math.min(sortedRows.length - 1, index))
    if (!sortedRows.length) return
    pendingFocusIndex.current = nextIndex
    setFocusedIndex(nextIndex)
    listRef.current?.scrollToRow({ index: nextIndex, align: 'auto', behavior: 'instant' })
    bodyRef.current?.querySelector<HTMLElement>('[data-row-index="' + nextIndex + '"]')?.focus()
  }

  useEffect(() => {
    const index = pendingFocusIndex.current
    if (index === null) return
    const rowElement = (listRef.current?.element ?? bodyRef.current)?.querySelector<HTMLElement>(
      '[data-row-index="' + index + '"]',
    )
    if (rowElement) {
      rowElement.focus()
      pendingFocusIndex.current = null
    }
  }, [focusedIndex, sortedRows])

  function onRowKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number): void {
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault()
      const nextIndex =
        event.key === 'ArrowDown'
          ? index + 1
          : event.key === 'ArrowUp'
            ? index - 1
            : event.key === 'Home'
              ? 0
              : sortedRows.length - 1
      focusRow(nextIndex)
      if (
        nextIndex >= sortedRows.length - 1 &&
        (event.key === 'End' || event.key === 'ArrowDown')
      ) {
        onNearEnd?.()
      }
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowActivate(sortedRows[index])
    }
  }

  function sortBy(column: LedgerColumn<Row>): void {
    const nextSort = nextLedgerSort(sort, column)
    if (onSortChange) onSortChange(nextSort)
    else setUncontrolledSort(nextSort)
  }

  function reorderColumns(event: DragEndEvent): void {
    if (!event.over || event.active.id === event.over.id) return
    const nextOrder = reorderedColumnKeys(order, String(event.active.id), String(event.over.id))
    if (onColumnOrderChange) onColumnOrderChange(nextOrder)
    else setUncontrolledOrder(nextOrder)
  }

  function resizeColumn(event: MouseEvent<HTMLSpanElement>, column: LedgerColumn<Row>): void {
    event.preventDefault()
    event.stopPropagation()
    const columnIndex = visibleColumns.findIndex((candidate) => candidate.key === column.key)
    const previousColumn = visibleColumns[columnIndex - 1]
    if (!previousColumn) return
    const startX = event.clientX
    const currentElement = event.currentTarget.closest<HTMLElement>('.ledger-header-cell')
    const previousElement = currentElement?.previousElementSibling as HTMLElement | null
    const leftWidth =
      previousElement?.getBoundingClientRect().width ||
      widths[previousColumn.key] ||
      previousColumn.width ||
      previousColumn.minWidth
    const rightWidth =
      currentElement?.getBoundingClientRect().width ||
      widths[column.key] ||
      column.width ||
      column.minWidth
    function move(pointer: globalThis.MouseEvent): void {
      const resized = resizedDividerWidths(
        leftWidth,
        rightWidth,
        previousColumn.minWidth,
        column.minWidth,
        pointer.clientX - startX,
      )
      const nextWidths = {
        ...widths,
        ...(previousColumn.isFlexible ? {} : { [previousColumn.key]: resized.left }),
        ...(column.isFlexible ? {} : { [column.key]: resized.right }),
      }
      if (onColumnWidthsChange) onColumnWidthsChange(nextWidths)
      else setUncontrolledWidths(nextWidths)
    }
    function stop(): void {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop, { once: true })
  }

  const rowProps: LedgerRowProps<Row> = {
    rows: sortedRows,
    columns: visibleColumns,
    widths,
    rowKey,
    onRowActivate,
    onRowKeyDown,
    onFocusedIndexChange: setFocusedIndex,
    focusedIndex: tabbableRowIndex,
    selectedRowKey,
    rowKind,
    hoverCard,
    isHighlighted,
  }
  const rowHeight = isDense ? 30 : 32
  const virtualRowKey = useCallback(
    (index: number) => rowKey(sortedRows[index]),
    [rowKey, sortedRows],
  )

  return (
    <div
      role="table"
      aria-label={label}
      className={'ledger-table' + (isDense ? ' ledger-table--dense' : '')}
    >
      <DndContext sensors={sensors} onDragEnd={reorderColumns}>
        <SortableContext
          items={visibleColumns.map((column) => column.key)}
          strategy={horizontalListSortingStrategy}
        >
          <div role="rowgroup" className="ledger-head">
            <div role="row" className="ledger-header-row">
              {visibleColumns.map((column, index) => (
                <HeaderCell
                  key={column.key}
                  column={column}
                  widths={widths}
                  isFirst={index === 0}
                  isSorted={sort?.key === column.key}
                  sortDirection={sort?.key === column.key ? sort.direction : null}
                  onSort={() => sortBy(column)}
                  onResize={resizeColumn}
                />
              ))}
            </div>
          </div>
        </SortableContext>
      </DndContext>
      {sortedRows.length === 0 ? (
        <div className="ledger-empty">{emptyState}</div>
      ) : isVirtualized ? (
        <div className="ledger-body-wrap">
          <List
            role="rowgroup"
            rowComponent={VirtualLedgerRow<Row>}
            rowCount={sortedRows.length}
            rowHeight={rowHeight}
            rowProps={rowProps}
            rowKey={virtualRowKey}
            listRef={listRef}
            className="ledger-body"
            style={{ height: '100%' }}
            onRowsRendered={(visibleRows) => {
              if (sortedRows.length - visibleRows.stopIndex <= 32) onNearEnd?.()
              const index = pendingFocusIndex.current
              if (index !== null) {
                const rowElement = listRef.current?.element?.querySelector<HTMLElement>(
                  '[data-row-index="' + index + '"]',
                )
                if (rowElement) {
                  rowElement.focus()
                  pendingFocusIndex.current = null
                }
              }
            }}
          />
        </div>
      ) : (
        <div role="rowgroup" ref={bodyRef} className="ledger-plain-body">
          {sortedRows.map((row, index) => (
            <LedgerRow key={rowKey(row)} index={index} {...rowProps} />
          ))}
        </div>
      )}
    </div>
  )
}
