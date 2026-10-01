import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  DndContext,
  DragOverlay,
  getClientRect,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type ClientRect,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pin, Plus, X } from 'lucide-react'
import {
  allStatsGroupNameOf,
  PLACEHOLDER_STAT_GROUPS,
  type PlaceholderStat,
} from '../data/placeholderStats'
import {
  newGroupGapIndexes,
  pinnedGroupsWithLabel,
  pinnedGroupsWithoutGroup,
  pinnedGroupsWithoutStat,
  pinnedGroupsWithStatDropped,
  pinnedGroupsWithStatPinned,
  type PinnedStatGroup,
} from '../pinnedStatGroups'
import {
  draggedStatNameOf,
  dragPayloadOf,
  dropTargetOf,
  STAT_DRAG_ANNOUNCEMENTS,
  statDragId,
  statDropCollisions,
  type StatDragPayload,
  type StatDropPayload,
} from './statDragAndDrop'
import { StatDragGhost, StatGrip, StatRow } from './StatRow'

const PLACEHOLDER_STATS_BY_NAME = new Map(
  PLACEHOLDER_STAT_GROUPS.flatMap((group) => group.stats).map((stat) => [stat.name, stat]),
)

interface DragStartRectCache {
  measure: (element: HTMLElement) => ClientRect
  forgetRects: () => void
}

function createDragStartRectCache(): DragStartRectCache {
  const rectsByElement = new Map<HTMLElement, ClientRect>()
  return {
    measure(element) {
      const rect = rectsByElement.get(element) ?? getClientRect(element, { ignoreTransform: true })
      rectsByElement.set(element, rect)
      return rect
    },
    forgetRects: () => rectsByElement.clear(),
  }
}

const POINTER_DISTANCE_BEFORE_DRAG_PX = 4

interface NewGroupGapProps {
  groupIndex: number
  isEmptyState: boolean
  isDragging: boolean
}

function NewGroupGap({ groupIndex, isEmptyState, isDragging }: NewGroupGapProps): JSX.Element {
  const dropPayload: StatDropPayload = { dropTarget: { kind: 'newGroupGap', groupIndex } }
  const { setNodeRef, isOver } = useDroppable({ id: `gap:${groupIndex}`, data: dropPayload })
  const emptyStateLabel = isDragging ? 'Drop to pin in a new group' : 'Drag a stat here to pin it'
  return (
    <div
      ref={setNodeRef}
      className={`stats-panel-new-group-gap${isEmptyState ? ' stats-panel-new-group-gap--empty-state' : ''}${isOver ? ' stats-panel-drop-target--over' : ''}`}
    >
      {isEmptyState ? <Pin size={12} /> : <Plus size={11} />}
      {isEmptyState ? emptyStateLabel : 'New group'}
    </div>
  )
}

interface StatRowStateProps {
  expandedStatNames: ReadonlySet<string>
  onToggleExpanded: (statName: string) => void
}

interface StatRowFocusProps {
  statNameWithPinButtonToFocus: string | null
  onPinButtonFocused: () => void
}

interface StatRowSharedProps extends StatRowStateProps, StatRowFocusProps {}

interface PinnedStatRowProps extends StatRowSharedProps {
  stat: PlaceholderStat
  groupId: string
  onUnpin: (statName: string) => void
}

function PinnedStatRow({
  stat,
  groupId,
  expandedStatNames,
  onToggleExpanded,
  statNameWithPinButtonToFocus,
  onPinButtonFocused,
  onUnpin,
}: PinnedStatRowProps): JSX.Element {
  const dragAndDropPayload: StatDragPayload & StatDropPayload = {
    statName: stat.name,
    groupId,
    dropTarget: { kind: 'pinnedStat', statName: stat.name },
  }
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: statDragId(stat.name), data: dragAndDropPayload })
  const isDropLineShown =
    isOver && !isDragging && active !== null && dragPayloadOf(active)?.groupId !== groupId
  const rowModifierClassNames = [
    isDragging && 'stats-panel-stat--drag-source',
    isDropLineShown && 'stats-panel-stat--drop-before',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <StatRow
      stat={stat}
      isExpanded={expandedStatNames.has(stat.name)}
      onToggleExpanded={() => onToggleExpanded(stat.name)}
      grip={
        <StatGrip
          statName={stat.name}
          title="Drag to reorder or move to another group"
          activatorRef={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
        />
      }
      pinButton={{
        isPinned: true,
        title: 'Unpin — move back to its group',
        onClick: () => onUnpin(stat.name),
        shouldTakeFocus: stat.name === statNameWithPinButtonToFocus,
        onFocusTaken: onPinButtonFocused,
      }}
      rowRef={setNodeRef}
      rowStyle={{ transform: CSS.Translate.toString(transform), transition }}
      rowModifierClassNames={rowModifierClassNames}
    />
  )
}

interface UnpinnedStatRowProps extends StatRowSharedProps {
  stat: PlaceholderStat
  onPin: (statName: string) => void
}

function UnpinnedStatRow({
  stat,
  expandedStatNames,
  onToggleExpanded,
  statNameWithPinButtonToFocus,
  onPinButtonFocused,
  onPin,
}: UnpinnedStatRowProps): JSX.Element {
  const dragPayload: StatDragPayload = { statName: stat.name, groupId: null }
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    setActivatorNodeRef,
  } = useDraggable({ id: statDragId(stat.name), data: dragPayload })
  const { setNodeRef: setKeyboardAnchorNodeRef } = useDroppable({
    id: statDragId(stat.name),
    disabled: true,
  })
  const setRowNodeRef = useCallback(
    (element: HTMLElement | null) => {
      setDraggableNodeRef(element)
      setKeyboardAnchorNodeRef(element)
    },
    [setDraggableNodeRef, setKeyboardAnchorNodeRef],
  )
  return (
    <StatRow
      stat={stat}
      isExpanded={expandedStatNames.has(stat.name)}
      onToggleExpanded={() => onToggleExpanded(stat.name)}
      grip={
        <StatGrip
          statName={stat.name}
          title="Drag to the pinned section"
          activatorRef={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
        />
      }
      pinButton={{
        isPinned: false,
        title: 'Pin',
        onClick: () => onPin(stat.name),
        shouldTakeFocus: stat.name === statNameWithPinButtonToFocus,
        onFocusTaken: onPinButtonFocused,
      }}
      rowRef={setRowNodeRef}
    />
  )
}

interface PinnedGroupProps extends StatRowSharedProps {
  group: PinnedStatGroup
  isKeyboardDrag: boolean
  shouldFocusName: boolean
  onNameFocused: () => void
  onRename: (label: string) => void
  onDelete: () => void
  onUnpin: (statName: string) => void
}

function PinnedGroup({
  group,
  isKeyboardDrag,
  shouldFocusName,
  onNameFocused,
  onRename,
  onDelete,
  onUnpin,
  ...statRowSharedProps
}: PinnedGroupProps): JSX.Element {
  const headerDropPayload: StatDropPayload = {
    dropTarget: { kind: 'groupHeader', groupId: group.id },
  }
  const groupDropPayload: StatDropPayload = {
    dropTarget: { kind: 'pinnedGroup', groupId: group.id },
  }
  const { setNodeRef: setHeaderDropNodeRef, isOver: isOverHeader } = useDroppable({
    id: `group-header:${group.id}`,
    data: headerDropPayload,
  })
  const { setNodeRef: setGroupDropNodeRef, isOver: isOverGroup } = useDroppable({
    id: `group:${group.id}`,
    data: groupDropPayload,
    disabled: isKeyboardDrag,
  })
  const accessibleLabel = group.label.trim() || 'Untitled'
  const stats = group.statNames.flatMap((name) => PLACEHOLDER_STATS_BY_NAME.get(name) ?? [])
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shouldFocusName) return
    nameInputRef.current?.focus()
    onNameFocused()
  }, [shouldFocusName, onNameFocused])

  return (
    <div
      ref={setGroupDropNodeRef}
      role="group"
      aria-label={accessibleLabel}
      className={`stats-panel-pinned-group${isOverGroup ? ' stats-panel-drop-target--over' : ''}`}
    >
      <div
        ref={setHeaderDropNodeRef}
        className={`stats-panel-pinned-group-drop${isOverHeader ? ' stats-panel-drop-target--over' : ''}`}
      >
        <div className="stats-panel-pinned-group-header">
          <input
            ref={nameInputRef}
            className="section-label stats-panel-group-name"
            aria-label="Group name"
            spellCheck={false}
            value={group.label}
            onChange={(e) => onRename(e.target.value)}
          />
          <button
            type="button"
            className="stats-panel-group-delete"
            aria-label={`Delete ${accessibleLabel} group`}
            title="Delete group — its stats return to All stats"
            onClick={onDelete}
          >
            <X size={12} />
          </button>
        </div>
        {stats.length === 0 && <div className="stats-panel-empty-group">Drag stats here</div>}
      </div>
      <SortableContext
        id={`sortable:${group.id}`}
        items={stats.map((stat) => statDragId(stat.name))}
        strategy={verticalListSortingStrategy}
      >
        <ul className="stats-panel-rows">
          {stats.map((stat) => (
            <PinnedStatRow
              key={stat.name}
              stat={stat}
              groupId={group.id}
              onUnpin={onUnpin}
              {...statRowSharedProps}
            />
          ))}
        </ul>
      </SortableContext>
    </div>
  )
}

const PINNED_AREA_DROP_PAYLOAD: StatDropPayload = { dropTarget: { kind: 'pinnedSection' } }

interface PinnedAreaProps {
  isKeyboardDrag: boolean
  children: ReactNode
}

function PinnedArea({ isKeyboardDrag, children }: PinnedAreaProps): JSX.Element {
  const { setNodeRef } = useDroppable({
    id: 'pinned-area',
    data: PINNED_AREA_DROP_PAYLOAD,
    disabled: isKeyboardDrag,
  })
  return (
    <div ref={setNodeRef} className="stats-panel-pinned-area">
      {children}
    </div>
  )
}

interface StatsTabProps extends StatRowStateProps {
  pinnedGroups: readonly PinnedStatGroup[]
  setPinnedGroups: Dispatch<SetStateAction<readonly PinnedStatGroup[]>>
  focusStatsTab: () => void
}

export function StatsTab({
  pinnedGroups,
  setPinnedGroups,
  focusStatsTab,
  ...statRowStateProps
}: StatsTabProps): JSX.Element {
  const [statNameWithPinButtonToFocus, setStatNameWithPinButtonToFocus] = useState<string | null>(
    null,
  )
  const [groupIdWithNameToFocus, setGroupIdWithNameToFocus] = useState<string | null>(null)
  const clearStatNameWithPinButtonToFocus = useCallback(
    () => setStatNameWithPinButtonToFocus(null),
    [],
  )
  const clearGroupIdWithNameToFocus = useCallback(() => setGroupIdWithNameToFocus(null), [])
  const statRowSharedProps: StatRowSharedProps = {
    ...statRowStateProps,
    statNameWithPinButtonToFocus,
    onPinButtonFocused: clearStatNameWithPinButtonToFocus,
  }
  const [draggedStatName, setDraggedStatName] = useState<string | null>(null)
  const [isKeyboardDrag, setIsKeyboardDrag] = useState(false)
  const [dragStartRects] = useState(createDragStartRectCache)
  const measuring = useMemo(
    () => ({
      draggable: { measure: dragStartRects.measure },
      droppable: { strategy: MeasuringStrategy.Always },
    }),
    [dragStartRects],
  )
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_DISTANCE_BEFORE_DRAG_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const pinnedStatNames = new Set(pinnedGroups.flatMap((group) => group.statNames))
  const gapIndexes = draggedStatName ? newGroupGapIndexes(pinnedGroups, draggedStatName) : []
  const draggedStat = draggedStatName ? PLACEHOLDER_STATS_BY_NAME.get(draggedStatName) : undefined
  const isDragging = draggedStatName !== null

  function pinStat(statName: string): void {
    setPinnedGroups((groups) =>
      pinnedGroupsWithStatPinned(groups, statName, allStatsGroupNameOf(statName)),
    )
    setStatNameWithPinButtonToFocus(statName)
  }

  function unpinStat(statName: string): void {
    setPinnedGroups((groups) => pinnedGroupsWithoutStat(groups, statName))
    setStatNameWithPinButtonToFocus(statName)
  }

  function deleteGroup(groupId: string): void {
    const [firstRemainingGroup] = pinnedGroupsWithoutGroup(pinnedGroups, groupId)
    setPinnedGroups((groups) => pinnedGroupsWithoutGroup(groups, groupId))
    if (firstRemainingGroup) setGroupIdWithNameToFocus(firstRemainingGroup.id)
    else focusStatsTab()
  }

  function startStatDrag({ active, activatorEvent }: DragStartEvent): void {
    dragStartRects.forgetRects()
    setDraggedStatName(draggedStatNameOf(active))
    setIsKeyboardDrag(activatorEvent instanceof KeyboardEvent)
  }

  function endStatDrag(): void {
    dragStartRects.forgetRects()
    setDraggedStatName(null)
    setIsKeyboardDrag(false)
  }

  function dropDraggedStat({ active, over }: DragEndEvent): void {
    const statName = draggedStatNameOf(active)
    const dropTarget = dropTargetOf(over)
    setPinnedGroups((groups) =>
      pinnedGroupsWithStatDropped(groups, statName, dropTarget, allStatsGroupNameOf(statName)),
    )
    endStatDrag()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={statDropCollisions}
      measuring={measuring}
      accessibility={{ announcements: STAT_DRAG_ANNOUNCEMENTS }}
      onDragStart={startStatDrag}
      onDragEnd={dropDraggedStat}
      onDragCancel={endStatDrag}
    >
      <PinnedArea isKeyboardDrag={isKeyboardDrag}>
        <section className="stats-panel-pinned" aria-label="Pinned stats">
          {pinnedGroups.map((group, groupIndex) => (
            <Fragment key={group.id}>
              {gapIndexes.includes(groupIndex) && (
                <NewGroupGap groupIndex={groupIndex} isEmptyState={false} isDragging={isDragging} />
              )}
              <PinnedGroup
                group={group}
                isKeyboardDrag={isKeyboardDrag}
                shouldFocusName={group.id === groupIdWithNameToFocus}
                onNameFocused={clearGroupIdWithNameToFocus}
                onRename={(label) =>
                  setPinnedGroups((groups) => pinnedGroupsWithLabel(groups, group.id, label))
                }
                onDelete={() => deleteGroup(group.id)}
                onUnpin={unpinStat}
                {...statRowSharedProps}
              />
            </Fragment>
          ))}
          {pinnedGroups.length === 0 ? (
            <NewGroupGap groupIndex={0} isEmptyState isDragging={isDragging} />
          ) : (
            gapIndexes.includes(pinnedGroups.length) && (
              <NewGroupGap
                groupIndex={pinnedGroups.length}
                isEmptyState={false}
                isDragging={isDragging}
              />
            )
          )}
        </section>

        <hr className="stats-panel-divider" />
      </PinnedArea>

      <section
        className={`stats-panel-all-stats${isDragging ? ' stats-panel-all-stats--dimmed' : ''}`}
        aria-label="All stats"
      >
        {PLACEHOLDER_STAT_GROUPS.map((group) => {
          const unpinnedStats = group.stats.filter((stat) => !pinnedStatNames.has(stat.name))
          if (unpinnedStats.length === 0) return null
          return (
            <section key={group.name} className="stats-panel-group">
              <h3 className="section-label stats-panel-group-label">{group.name}</h3>
              <ul className="stats-panel-rows">
                {unpinnedStats.map((stat) => (
                  <UnpinnedStatRow
                    key={stat.name}
                    stat={stat}
                    onPin={pinStat}
                    {...statRowSharedProps}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </section>

      <DragOverlay className="stats-panel-drag-overlay" dropAnimation={null}>
        {draggedStat && <StatDragGhost stat={draggedStat} />}
      </DragOverlay>
    </DndContext>
  )
}
