import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { List, type ListImperativeAPI, type RowComponentProps } from 'react-window'
import { useHoverCard, type HoverCardOptions } from '../HoverCard'
import {
  nextLedgerSort,
  reorderedColumnKeys,
  resizedDividerWidths,
  sortedLedgerRows,
  visibleLedgerColumns,
  type LedgerColumn,
  type LedgerRowKind,
  type LedgerSort,
} from './ledgerModel'
import './LedgerTable.css'

interface LedgerTableProps<Row> {
  columns: LedgerColumn<Row>[]
  rowCount: number
  rowAt: (index: number) => Row
  rowKey: (row: Row) => string | number
  onRowActivate: (row: Row, activationSource: 'pointer' | 'keyboard') => void
  navigationInputRef?: RefObject<HTMLInputElement | null>
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
  rowKind?: (row: Row) => LedgerRowKind
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
  onRowActivate: (row: Row, activationSource: 'pointer' | 'keyboard') => void
  onRowKeyDown: (event: KeyboardEvent<HTMLDivElement>, index: number) => void
  onFocusedIndexChange: (index: number) => void
  focusedIndex: number
  highlightedRowKey: string | number | null
  hasNavigationInput: boolean
  bodyId: string
  selectedRowKey: string | number | null
  rowKind?: (row: Row) => LedgerRowKind
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
  highlightedRowKey,
  hasNavigationInput,
  bodyId,
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
  const kind = rowKind?.(row) ?? 'row'
  const isHeading = kind !== 'row'
  const isSelected = rowKey(row) === selectedRowKey
  return (
    <div
      role="row"
      id={`${bodyId}-row-${index}`}
      data-row-index={index}
      data-row-key={rowKey(row)}
      className={
        'ledger-row' +
        (isSelected ? ' ledger-row--selected' : '') +
        (isHighlighted?.(row) ? ' ledger-row--highlighted' : '') +
        (rowKey(row) === highlightedRowKey ? ' ledger-row--keyboard-highlighted' : '') +
        (isHeading ? ` ledger-row--${kind}` : '')
      }
      style={style}
      tabIndex={isHeading || hasNavigationInput ? -1 : index === focusedIndex ? 0 : -1}
      aria-current={isSelected || undefined}
      data-hover-card-pinned={hoverOptions ? hoverAnchor['data-hover-card-pinned'] : undefined}
      onFocus={() => onFocusedIndexChange(index)}
      onClick={() => !isHeading && onRowActivate(row, 'pointer')}
      onKeyDown={(event) => !isHeading && !hasNavigationInput && onRowKeyDown(event, index)}
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
            className={
              'ledger-cell' +
              (column.isPrimary ? ' ledger-cell--primary' : '') +
              (column.isMonospaced ? ' num' : '')
            }
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
  onResize: (event: PointerEvent<HTMLSpanElement>, column: LedgerColumn<Row>) => void
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
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: column.key })
  return (
    <div
      ref={setNodeRef}
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
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...listeners}
      role="columnheader"
      aria-label={column.label}
      onClick={column.isSortable === false ? undefined : onSort}
    >
      {!isFirst && (
        <span
          role="separator"
          aria-label={'Resize ' + column.label}
          aria-orientation="vertical"
          className="ledger-resize-grip"
          onPointerDown={(event) => onResize(event, column)}
          onClick={(event) => event.stopPropagation()}
        >
          <span />
        </span>
      )}
      {column.isSortable === false ? (
        <span className="ledger-header-label">{column.label}</span>
      ) : (
        <button type="button" aria-label={'Sort ' + column.label} className="ledger-sort-button">
          {column.label}
          {isSorted &&
            (sortDirection === 'asc' ? (
              <ChevronUp size={11} aria-hidden />
            ) : (
              <ChevronDown size={11} aria-hidden />
            ))}
        </button>
      )}
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="ledger-header-reorder sr-only"
        {...attributes}
        aria-label={'Move ' + column.label}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical size={8} aria-hidden />
        <span>{column.label}</span>
      </button>
    </div>
  )
}

export function LedgerTable<Row>({
  columns,
  rowCount,
  rowAt,
  rowKey,
  onRowActivate,
  navigationInputRef,
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
  const [highlightedRowKey, setHighlightedRowKey] = useState<string | number | null>(null)
  const highlightedRowKeyRef = useRef<string | number | null>(null)
  const bodyId = useId()
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
  const navigableRowIndices = useMemo(
    () => sortedRows.flatMap((row, index) => ((rowKind?.(row) ?? 'row') === 'row' ? [index] : [])),
    [sortedRows, rowKind],
  )
  const highlightedIndex = sortedRows.findIndex((row) => rowKey(row) === highlightedRowKey)
  const tabbableRowIndex = Math.min(focusedIndex, Math.max(0, sortedRows.length - 1))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (viewportWidth !== undefined) return
    const resize = (): void => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [viewportWidth])

  const focusRow = useCallback(
    (index: number): void => {
      const nextIndex = Math.max(0, Math.min(sortedRows.length - 1, index))
      if (!sortedRows.length) return
      pendingFocusIndex.current = nextIndex
      setFocusedIndex(nextIndex)
      listRef.current?.scrollToRow({ index: nextIndex, align: 'auto', behavior: 'instant' })
      bodyRef.current?.querySelector<HTMLElement>('[data-row-index="' + nextIndex + '"]')?.focus()
    },
    [sortedRows.length],
  )

  useEffect(() => {
    const input = navigationInputRef?.current
    if (!input) return
    if (sortedRows.length === 0) input.removeAttribute('aria-controls')
    else input.setAttribute('aria-controls', bodyId)
    if (highlightedIndex < 0) input.removeAttribute('aria-activedescendant')
    else input.setAttribute('aria-activedescendant', `${bodyId}-row-${highlightedIndex}`)
    return () => {
      input.removeAttribute('aria-controls')
      input.removeAttribute('aria-activedescendant')
    }
  }, [navigationInputRef, bodyId, highlightedIndex, sortedRows.length])

  useEffect(() => {
    const input = navigationInputRef?.current
    if (!input) return
    function clearHighlight(): void {
      highlightedRowKeyRef.current = null
      setHighlightedRowKey(null)
    }
    function navigateFromInput(event: globalThis.KeyboardEvent): void {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'Escape') {
        if (highlightedIndex >= 0) {
          event.preventDefault()
          clearHighlight()
        } else if (highlightedRowKeyRef.current !== null) clearHighlight()
        return
      }
      const currentPosition = navigableRowIndices.findIndex(
        (index) => rowKey(sortedRows[index]) === highlightedRowKeyRef.current,
      )
      if (event.key === 'Enter') {
        if (currentPosition < 0) return
        event.preventDefault()
        event.stopPropagation()
        const currentIndex = navigableRowIndices[currentPosition]
        focusRow(currentIndex)
        input?.blur()
        onRowActivate(sortedRows[currentIndex], 'keyboard')
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      if (navigableRowIndices.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      const nextPosition =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? navigableRowIndices.length - 1
            : currentPosition < 0
              ? event.key === 'ArrowDown'
                ? 0
                : navigableRowIndices.length - 1
              : Math.max(
                  0,
                  Math.min(
                    navigableRowIndices.length - 1,
                    currentPosition + (event.key === 'ArrowDown' ? 1 : -1),
                  ),
                )
      const nextIndex = navigableRowIndices[nextPosition]
      const nextRowKey = rowKey(sortedRows[nextIndex])
      highlightedRowKeyRef.current = nextRowKey
      setHighlightedRowKey(nextRowKey)
      listRef.current?.scrollToRow({ index: nextIndex, align: 'auto', behavior: 'instant' })
      bodyRef.current
        ?.querySelector<HTMLElement>('[data-row-index="' + nextIndex + '"]')
        ?.scrollIntoView?.({ block: 'nearest' })
      if (
        nextPosition === navigableRowIndices.length - 1 &&
        (event.key === 'End' || event.key === 'ArrowDown')
      )
        onNearEnd?.()
    }
    input.addEventListener('keydown', navigateFromInput)
    input.addEventListener('blur', clearHighlight)
    return () => {
      input.removeEventListener('keydown', navigateFromInput)
      input.removeEventListener('blur', clearHighlight)
    }
  }, [
    navigationInputRef,
    sortedRows,
    navigableRowIndices,
    rowKey,
    onRowActivate,
    onNearEnd,
    focusRow,
    highlightedIndex,
  ])

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
      onRowActivate(sortedRows[index], 'keyboard')
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

  function resizeColumn(event: PointerEvent<HTMLSpanElement>, column: LedgerColumn<Row>): void {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const columnIndex = visibleColumns.findIndex((candidate) => candidate.key === column.key)
    const previousColumn = visibleColumns[columnIndex - 1]
    if (!previousColumn) return
    const startX = event.clientX
    const pointerId = event.pointerId
    event.currentTarget.setPointerCapture?.(pointerId)
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
    function move(pointer: globalThis.PointerEvent): void {
      if (pointer.pointerId !== pointerId) return
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
    function stop(pointer: globalThis.PointerEvent): void {
      if (pointer.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
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
    highlightedRowKey,
    hasNavigationInput: navigationInputRef !== undefined,
    bodyId,
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
            id={bodyId}
            tabIndex={navigationInputRef ? 0 : undefined}
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
        <div
          role="rowgroup"
          id={bodyId}
          ref={bodyRef}
          tabIndex={navigationInputRef ? 0 : undefined}
          className="ledger-plain-body"
        >
          {sortedRows.map((row, index) => (
            <LedgerRow key={rowKey(row)} index={index} {...rowProps} />
          ))}
        </div>
      )}
    </div>
  )
}
