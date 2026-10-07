import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
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
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { List, type ListImperativeAPI, type RowComponentProps } from 'react-window'
import { useHoverCard, type HoverCardOptions } from '../HoverCard'
import { useRovingGroup } from '../../hooks'
import {
  nextLedgerSort,
  reorderedColumnKeys,
  resizedDividerWidths,
  sortedLedgerRows,
  visibleLedgerRows,
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
  tabStopIndex: number | null
  onTabStopFocus: (index: number) => boolean
  bodyId: string
  selectedRowKey: string | number | null
  rowKind?: (row: Row) => LedgerRowKind
  expandedHeadingKeys: ReadonlySet<string | number>
  onToggleHeading: (key: string | number) => void
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
  tabStopIndex,
  onTabStopFocus,
  bodyId,
  selectedRowKey,
  rowKind,
  expandedHeadingKeys,
  onToggleHeading,
  hoverCard,
  isHighlighted,
}: LedgerRowProps<Row> & {
  index: number
  style?: CSSProperties
}): JSX.Element | null {
  const row = rows[index]
  const hoverOptions = row ? hoverCard?.(row) : null
  const hoverAnchor = useHoverCard({
    ...(hoverOptions ?? { kind: '', delayMs: 0, render: () => null }),
    isRow: true,
  })
  if (!row) return null
  const kind = rowKind?.(row) ?? 'row'
  const isHeading = kind !== 'row'
  const isCollapsibleHeading = kind === 'collapsibleHeading'
  const isNavigable = kind === 'row' || isCollapsibleHeading
  const isExpanded = expandedHeadingKeys.has(rowKey(row))
  const isSelected = rowKey(row) === selectedRowKey
  const isHighlightedRow = isHighlighted?.(row) ?? false
  return (
    <div
      role="row"
      id={`${bodyId}-row-${index}`}
      data-row-index={index}
      data-row-key={rowKey(row)}
      className={
        'ledger-row focus-ring-proxy focus-ring-row' +
        (isSelected ? ' ledger-row--selected' : '') +
        (isHighlightedRow ? ' ledger-row--highlighted' : '') +
        (isSelected || isHighlightedRow ? ' focus-ring-row--selected' : '') +
        (isHeading
          ? ` ledger-row--${isCollapsibleHeading ? 'heading ledger-row--collapsible' : kind}`
          : '')
      }
      style={style}
      tabIndex={isNavigable && index === tabStopIndex ? 0 : -1}
      aria-expanded={isCollapsibleHeading ? isExpanded : undefined}
      aria-current={isSelected || undefined}
      data-hover-card-pinned={hoverOptions ? hoverAnchor['data-hover-card-pinned'] : undefined}
      onFocus={(event) => {
        if (event.target !== event.currentTarget || !isNavigable) return
        if (onTabStopFocus(index)) return
        onFocusedIndexChange(index)
        if (hoverOptions) hoverAnchor.onFocus(event)
      }}
      onBlur={hoverOptions ? hoverAnchor.onBlur : undefined}
      onClick={() => {
        if (isCollapsibleHeading) onToggleHeading(rowKey(row))
        else if (!isHeading) onRowActivate(row, 'pointer')
      }}
      onKeyDown={(event) => isNavigable && onRowKeyDown(event, index)}
      onMouseEnter={hoverOptions ? hoverAnchor.onMouseEnter : undefined}
      onMouseLeave={hoverOptions ? hoverAnchor.onMouseLeave : undefined}
      onKeyDownCapture={hoverOptions ? hoverAnchor.onKeyDown : undefined}
    >
      {isHeading ? (
        <div role="cell" className="ledger-heading-cell">
          {columns[0]?.render(row, isCollapsibleHeading ? { isExpanded } : undefined)}
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

function movedColumnAnnouncement(label: string, position: number, count: number): string {
  return `${label} moved to position ${position} of ${count}.`
}

function headerDragAnnouncements<Row>(visibleColumns: LedgerColumn<Row>[]): Announcements {
  function columnLabel(id: string | number): string {
    return visibleColumns.find((column) => column.key === String(id))?.label ?? String(id)
  }

  return {
    onDragStart: ({ active }) => `Picked up ${columnLabel(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const label = columnLabel(active.id)
      if (!over) return `${label} is not over a column.`
      if (active.id === over.id) return `Picked up ${label}.`
      return `${label} is over ${columnLabel(over.id)}.`
    },
    onDragEnd: ({ active, over }) => {
      const label = columnLabel(active.id)
      const destinationIndex = visibleColumns.findIndex((column) => column.key === String(over?.id))
      if (destinationIndex < 0) return `Move of ${label} cancelled.`
      if (active.id === over?.id) {
        return `${label} stayed at position ${destinationIndex + 1} of ${visibleColumns.length}.`
      }
      return movedColumnAnnouncement(label, destinationIndex + 1, visibleColumns.length)
    },
    onDragCancel: ({ active }) => `Move of ${columnLabel(active.id)} cancelled.`,
  }
}

interface HeaderCellProps<Row> {
  column: LedgerColumn<Row>
  widths: Record<string, number>
  isFirst: boolean
  isSorted: boolean
  isFocusedColumn: boolean
  sortDirection: 'asc' | 'desc' | null
  onSort: () => void
  onFocusColumn: () => void
  onNavigateColumn: (key: string, direction: -1 | 1 | 'first' | 'last') => void
  onMoveColumn: (key: string, direction: -1 | 1) => void
  onResize: (event: PointerEvent<HTMLSpanElement>, column: LedgerColumn<Row>) => void
}

function HeaderCell<Row>({
  column,
  widths,
  isFirst,
  isSorted,
  isFocusedColumn,
  sortDirection,
  onSort,
  onFocusColumn,
  onNavigateColumn,
  onMoveColumn,
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
  const setHeaderRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      setActivatorNodeRef(node)
    },
    [setNodeRef, setActivatorNodeRef],
  )
  const isSortable = column.isSortable !== false
  const keyHintTip = (isSortable ? 'Enter sorts · ' : '') + 'Shift+← → moves · M picks up to drag'
  const keyHints =
    (isSortable ? 'Enter or Space sorts. ' : '') +
    'Left or Right changes column; Home or End jumps to an edge. Shift plus Left or Right moves this column one place. Press M to pick up; arrows move it; M, Enter, or Space drops it; Escape cancels.'

  function onHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget || event.nativeEvent.isComposing) return
    if (event.key.toLowerCase() === 'm' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      listeners?.onKeyDown?.(event)
      return
    }
    if (event.key === 'Escape' && isDragging) {
      event.preventDefault()
      return
    }
    if (isDragging || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? -1 : 1
      if (event.shiftKey) onMoveColumn(column.key, direction)
      else onNavigateColumn(column.key, direction)
      return
    }
    if (event.shiftKey) return
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      onNavigateColumn(column.key, event.key === 'Home' ? 'first' : 'last')
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isSortable) onSort()
    }
  }

  return (
    <div
      ref={setHeaderRef}
      data-column-key={column.key}
      tabIndex={isFocusedColumn ? 0 : -1}
      aria-sort={
        !isSortable
          ? undefined
          : isSorted
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
      }
      className={
        'ledger-header-cell focus-ring-proxy' +
        (isDragging ? ' ledger-header-cell--dragging' : '') +
        (isOver ? ' ledger-header-cell--over' : '')
      }
      style={{
        ...columnStyle(column, widths),
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      role="columnheader"
      aria-label={column.label}
      aria-description={keyHints}
      data-tip={keyHintTip}
      aria-describedby={attributes['aria-describedby']}
      onFocus={onFocusColumn}
      onKeyDown={onHeaderKeyDown}
      onPointerDown={(event) => listeners?.onPointerDown?.(event)}
      onClick={isSortable ? onSort : undefined}
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
      <span className="ledger-header-label">
        {column.label}
        {isSorted &&
          (sortDirection === 'asc' ? (
            <ChevronUp size={11} aria-hidden />
          ) : (
            <ChevronDown size={11} aria-hidden />
          ))}
      </span>
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
  const [expandedHeadingKeys, setExpandedHeadingKeys] = useState<ReadonlySet<string | number>>(
    () => new Set(),
  )
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [currentFocusedRowKey, setCurrentFocusedRowKey] = useState<string | number | null>(null)
  const [visibleRowRange, setVisibleRowRange] = useState<{ start: number; stop: number } | null>(
    null,
  )
  const [headerAnnouncement, setHeaderAnnouncement] = useState('')
  const bodyId = useId()
  const headerRowRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<ListImperativeAPI>(null)
  const pendingFocusIndex = useRef<number | null>(null)
  const sort = controlledSort === undefined ? uncontrolledSort : controlledSort
  const order = controlledOrder ?? uncontrolledOrder
  const widths = controlledWidths ?? uncontrolledWidths
  const orderedColumns = useMemo(
    () => order.flatMap((key) => columns.find((column) => column.key === key) ?? []),
    [order, columns],
  )
  const visibleColumns = useMemo(
    () => visibleLedgerColumns(orderedColumns, viewportWidth ?? windowWidth),
    [orderedColumns, viewportWidth, windowWidth],
  )
  const announcements = useMemo(() => headerDragAnnouncements(visibleColumns), [visibleColumns])
  const rows = useMemo(
    () => Array.from({ length: rowCount }, (_, index) => rowAt(index)),
    [rowCount, rowAt],
  )
  const allSortedRows = useMemo(
    () => (isSortedExternally ? rows : sortedLedgerRows(rows, columns, sort, rowKind)),
    [rows, columns, sort, rowKind, isSortedExternally],
  )
  const sortedRows = useMemo(
    () =>
      rowKind
        ? visibleLedgerRows(allSortedRows, rowKind, rowKey, expandedHeadingKeys)
        : allSortedRows,
    [allSortedRows, rowKind, rowKey, expandedHeadingKeys],
  )
  const navigableRowIndices = useMemo(
    () =>
      sortedRows.flatMap((row, index) => {
        const kind = rowKind?.(row) ?? 'row'
        return kind === 'row' || kind === 'collapsibleHeading' ? [index] : []
      }),
    [sortedRows, rowKind],
  )
  const navigableRowKeys = navigableRowIndices.map((index) => rowKey(sortedRows[index]))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ['KeyM'],
        end: ['KeyM', 'Enter', 'Space'],
        cancel: ['Escape'],
      },
    }),
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
      const rowElement = document.getElementById(`${bodyId}-row-${nextIndex}`)
      rowElement?.scrollIntoView?.({ block: 'nearest' })
      rowElement?.focus()
      if (document.activeElement === rowElement) pendingFocusIndex.current = null
    },
    [sortedRows.length, bodyId],
  )
  const rowGroup = useRovingGroup({
    keys: navigableRowKeys,
    preferredKey: selectedRowKey,
    direction: 'vertical',
    focusItem: (key) => {
      const index = navigableRowIndices.find((candidate) => rowKey(sortedRows[candidate]) === key)
      if (index !== undefined) focusRow(index)
    },
  })
  const headerGroup = useRovingGroup({
    keys: visibleColumns.map((column) => column.key),
    direction: 'horizontal',
    focusItem: focusColumn,
  })
  const currentRowKey =
    currentFocusedRowKey !== null && navigableRowKeys.includes(currentFocusedRowKey)
      ? currentFocusedRowKey
      : rowGroup.tabStopKey
  const activeRowIndex = navigableRowIndices.find(
    (index) => rowKey(sortedRows[index]) === currentRowKey,
  )
  const renderedActiveRowIndex =
    activeRowIndex !== undefined &&
    (!isVirtualized ||
      (visibleRowRange !== null &&
        activeRowIndex >= visibleRowRange.start &&
        activeRowIndex <= visibleRowRange.stop))
      ? activeRowIndex
      : navigableRowIndices.find(
          (index) =>
            visibleRowRange !== null &&
            index >= visibleRowRange.start &&
            index <= visibleRowRange.stop,
        )
  const tabStopIndex = renderedActiveRowIndex ?? null

  useEffect(() => {
    const input = navigationInputRef?.current
    if (!input) return
    if (sortedRows.length === 0) input.removeAttribute('aria-controls')
    else input.setAttribute('aria-controls', bodyId)
    return () => {
      input.removeAttribute('aria-controls')
    }
  }, [navigationInputRef, bodyId, sortedRows.length])

  useEffect(() => {
    const input = navigationInputRef?.current
    if (!input) return
    function navigateFromInput(event: globalThis.KeyboardEvent): void {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      if (navigableRowIndices.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      const nextIndex =
        event.key === 'ArrowUp'
          ? navigableRowIndices[navigableRowIndices.length - 1]
          : navigableRowIndices[0]
      rowGroup.focusKey(rowKey(sortedRows[nextIndex]))
      if (nextIndex === navigableRowIndices[navigableRowIndices.length - 1]) onNearEnd?.()
    }
    input.addEventListener('keydown', navigateFromInput)
    return () => input.removeEventListener('keydown', navigateFromInput)
  }, [navigationInputRef, sortedRows, navigableRowIndices, rowKey, onNearEnd, rowGroup])

  useEffect(() => {
    const index = pendingFocusIndex.current
    if (index === null) return
    const rowElement = document.getElementById(`${bodyId}-row-${index}`)
    if (rowElement) {
      rowElement.focus()
      pendingFocusIndex.current = null
    }
  }, [focusedIndex, sortedRows, bodyId])

  function onRowKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number): void {
    if (
      event.target !== event.currentTarget ||
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    if (event.key === 'Escape') return
    const pageSize = Math.max(
      1,
      Math.floor((document.getElementById(bodyId)?.clientHeight ?? 0) / (isDense ? 30 : 32)),
    )
    if (rowGroup.moveFocus(rowKey(sortedRows[index]), event.key, pageSize)) {
      event.preventDefault()
      const lastRow = sortedRows[navigableRowIndices[navigableRowIndices.length - 1]]
      if (
        lastRow &&
        (pendingFocusIndex.current === navigableRowIndices[navigableRowIndices.length - 1] ||
          document.activeElement?.getAttribute('data-row-key') === String(rowKey(lastRow))) &&
        (event.key === 'End' || event.key === 'ArrowDown' || event.key === 'PageDown')
      ) {
        onNearEnd?.()
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const row = sortedRows[index]
      if (rowKind?.(row) === 'collapsibleHeading') toggleHeading(rowKey(row))
      else onRowActivate(row, 'keyboard')
    }
  }

  function clearFocusedRowOnBodyBlur(event: FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setCurrentFocusedRowKey(null)
  }

  function toggleHeading(key: string | number): void {
    setExpandedHeadingKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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

  function focusColumn(key: string): void {
    const header = Array.from(
      headerRowRef.current?.querySelectorAll<HTMLElement>('.ledger-header-cell') ?? [],
    ).find((candidate) => candidate.dataset.columnKey === key)
    header?.focus()
  }

  function navigateColumn(key: string, direction: -1 | 1 | 'first' | 'last'): void {
    const pressedKey =
      direction === 'first'
        ? 'Home'
        : direction === 'last'
          ? 'End'
          : direction === -1
            ? 'ArrowLeft'
            : 'ArrowRight'
    headerGroup.moveFocus(key, pressedKey)
  }

  function moveColumn(key: string, direction: -1 | 1): void {
    const currentIndex = visibleColumns.findIndex((column) => column.key === key)
    const nextColumn = visibleColumns[currentIndex + direction]
    if (!nextColumn) return
    const nextOrder = reorderedColumnKeys(order, key, nextColumn.key)
    if (onColumnOrderChange) onColumnOrderChange(nextOrder)
    else setUncontrolledOrder(nextOrder)
    setHeaderAnnouncement(
      movedColumnAnnouncement(
        visibleColumns[currentIndex].label,
        currentIndex + direction + 1,
        visibleColumns.length,
      ),
    )
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
    onFocusedIndexChange: (index) => {
      const key = rowKey(sortedRows[index])
      setCurrentFocusedRowKey(key)
      rowGroup.rememberFocus(key)
      setFocusedIndex(index)
    },
    tabStopIndex,
    onTabStopFocus: (index) => {
      if (index !== tabStopIndex || activeRowIndex === undefined || index === activeRowIndex)
        return false
      if (pendingFocusIndex.current === index) return false
      rowGroup.focusKey(rowKey(sortedRows[activeRowIndex]))
      return true
    },
    bodyId,
    selectedRowKey,
    rowKind,
    expandedHeadingKeys,
    onToggleHeading: toggleHeading,
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
      <DndContext
        sensors={sensors}
        onDragStart={() => setHeaderAnnouncement('')}
        onDragEnd={reorderColumns}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Press M to pick up a column. Use Left and Right to move it. Press M, Enter, or Space to drop, or Escape to cancel.',
          },
        }}
      >
        <SortableContext
          items={visibleColumns.map((column) => column.key)}
          strategy={horizontalListSortingStrategy}
        >
          <div role="rowgroup" className="ledger-head">
            <div ref={headerRowRef} role="row" className="ledger-header-row">
              {visibleColumns.map((column, index) => (
                <HeaderCell
                  key={column.key}
                  column={column}
                  widths={widths}
                  isFirst={index === 0}
                  isSorted={sort?.key === column.key}
                  isFocusedColumn={column.key === headerGroup.tabStopKey}
                  sortDirection={sort?.key === column.key ? sort.direction : null}
                  onSort={() => sortBy(column)}
                  onFocusColumn={() => headerGroup.rememberFocus(column.key)}
                  onNavigateColumn={navigateColumn}
                  onMoveColumn={moveColumn}
                  onResize={resizeColumn}
                />
              ))}
            </div>
          </div>
        </SortableContext>
      </DndContext>
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        data-testid="ledger-header-announcement"
      >
        {headerAnnouncement}
      </div>
      {sortedRows.length === 0 ? (
        <div className="ledger-empty">{emptyState}</div>
      ) : isVirtualized ? (
        <div className="ledger-body-wrap">
          <List
            role="rowgroup"
            id={bodyId}
            onBlurCapture={clearFocusedRowOnBodyBlur}
            rowComponent={VirtualLedgerRow<Row>}
            rowCount={sortedRows.length}
            rowHeight={rowHeight}
            rowProps={rowProps}
            rowKey={virtualRowKey}
            listRef={listRef}
            className="ledger-body"
            style={{ height: '100%' }}
            onRowsRendered={(visibleRows) => {
              setVisibleRowRange((previous) =>
                previous?.start === visibleRows.startIndex &&
                previous.stop === visibleRows.stopIndex
                  ? previous
                  : { start: visibleRows.startIndex, stop: visibleRows.stopIndex },
              )
              if (sortedRows.length - visibleRows.stopIndex <= 32) onNearEnd?.()
              const index = pendingFocusIndex.current
              if (index !== null) {
                const rowElement = document.getElementById(`${bodyId}-row-${index}`)
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
          className="ledger-plain-body"
          onBlurCapture={clearFocusedRowOnBodyBlur}
        >
          {sortedRows.map((row, index) => (
            <LedgerRow key={rowKey(row)} index={index} {...rowProps} />
          ))}
        </div>
      )}
    </div>
  )
}
