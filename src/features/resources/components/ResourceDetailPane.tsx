import { useEffect, useMemo, useRef, type JSX } from 'react'
import { DetailNavigationProvider } from '../contexts/DetailNavigationContext'
import { useDetailStack, type ResourceReference } from '../hooks/useDetailStack'
import { isApiError } from '../../../lib/api'
import type { AugmentSummary, Item } from '../queries/items'
import { useItem, useSet, useFittingAugmentsBySlotLabel } from '../queries/useItems'
import { DETAIL_TITLE_ID, type ResourceCategory } from '../resourceCategories'
import { DetailBreadcrumbBar } from './DetailBreadcrumbBar'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemDetailCard } from './detail/ItemDetailCard'

interface ResourceDetailPaneProps {
  resourceInUrl: ResourceReference | null
  pickerCategory: ResourceCategory
  matchingEnchantments?: string[]
  focusItemId?: number | null
  onFocusItem?: () => void
  onDetailRendered?: () => void
}

export function ResourceDetailPane({
  resourceInUrl,
  pickerCategory,
  matchingEnchantments = [],
  focusItemId = null,
  onFocusItem,
  onDetailRendered,
}: ResourceDetailPaneProps): JSX.Element {
  const {
    stack,
    pushResource,
    nameResource,
    popResource,
    jumpToBreadcrumb,
    closeDetail,
    deepLinkUrl,
  } = useDetailStack({
    resourceInUrl,
    pickerCategory,
  })

  const topEntry = stack[stack.length - 1] ?? null
  const topItemId = topEntry !== null && topEntry.category === 'items' ? topEntry.id : null
  const lastFocusedItemId = useRef<number | null>(null)

  const itemDetailQuery = useItem(topItemId)
  const setDetailQuery = useSet(itemDetailQuery.data?.setId ?? null)
  const augmentsBySlotLabel = useFittingAugmentsBySlotLabel(
    itemDetailQuery.data?.augmentSlots ?? [],
  )

  const namedDetailStack = useMemo(() => {
    return stack.map((entry) => {
      if (entry.name) return entry
      const name =
        entry.category === 'items' && entry.id === itemDetailQuery.data?.id
          ? itemDetailQuery.data.name
          : undefined
      return name ? { ...entry, name } : entry
    })
  }, [stack, itemDetailQuery.data])

  useEffect(() => {
    if (itemDetailQuery.data?.id !== topItemId) return
    nameResource({ category: 'items', id: topItemId, name: itemDetailQuery.data.name })
    onDetailRendered?.()
  }, [itemDetailQuery.data, topItemId, nameResource, onDetailRendered])

  useEffect(() => {
    if (stack.length <= 1 && focusItemId === null) lastFocusedItemId.current = null
    const shouldFocus =
      lastFocusedItemId.current !== topItemId && (focusItemId === topItemId || stack.length > 1)
    if (shouldFocus && itemDetailQuery.data?.id === topItemId) {
      document.getElementById(DETAIL_TITLE_ID)?.focus()
      lastFocusedItemId.current = topItemId
      if (focusItemId === topItemId) onFocusItem?.()
    }
  }, [stack.length, itemDetailQuery.data, topItemId, focusItemId, onFocusItem])

  return (
    <DetailNavigationProvider
      navigation={{ pushResource, deepLinkUrl, closeDetail, pickerCategory }}
    >
      {topEntry && (
        <div className="resources-detail-pane-bar">
          <DetailBreadcrumbBar
            detailStack={namedDetailStack}
            onBackOneLevel={popResource}
            onJumpToCrumb={jumpToBreadcrumb}
          />
        </div>
      )}
      <div className="resources-detail-pane-body">
        <section className="resources-detail">
          {renderedDetailBody(
            topEntry,
            itemDetailQuery.data ?? null,
            itemDetailQuery.isPending,
            itemDetailQuery.error,
            augmentsBySlotLabel,
            setDetailQuery.data ?? null,
            matchingEnchantments,
            (id, name) => pushResource({ category: 'items', id, name }),
          )}
        </section>
      </div>
    </DetailNavigationProvider>
  )
}

function renderedDetailBody(
  topEntry: ResourceReference | null,
  itemDetail: Item | null,
  isPending: boolean,
  error: unknown,
  augmentsBySlotLabel: Record<string, AugmentSummary[]>,
  setDetail: ReturnType<typeof useSet>['data'] | null,
  matchingEnchantments: string[],
  onOpenItem: (id: number, name: string) => void,
): JSX.Element {
  if (topEntry === null) return <StatusPlaceholder reason="no-selection" />
  if (topEntry.category === 'items') {
    if (itemDetail) {
      return (
        <ItemDetailCard
          key={`${topEntry.category}-${topEntry.id}`}
          item={itemDetail}
          augmentsBySlotLabel={augmentsBySlotLabel}
          setDetail={setDetail}
          matchingEnchantments={matchingEnchantments}
          onOpenItem={onOpenItem}
        />
      )
    }
    if (isPending && !error) return <StatusPlaceholder reason="loading" />
    if (error && !(isApiError(error) && error.httpStatus === 404)) {
      return <StatusPlaceholder reason="error" />
    }
    return <StatusPlaceholder reason="not-found" missingItemId={topEntry.id} />
  }
  return <StatusPlaceholder reason="empty-table" category={topEntry.category} />
}
