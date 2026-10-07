import { useEffect, useMemo, useRef, type JSX } from 'react'
import { DetailNavigationProvider } from '../contexts/DetailNavigationContext'
import { useDetailStack, type ResourceReference } from '../hooks/useDetailStack'
import { DETAIL_TITLE_ID, type ResourceCategory } from '../resourceCategories'
import { DetailBreadcrumbBar } from './DetailBreadcrumbBar'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemDetailCard } from './detail/ItemDetailCard'
import { useItemCardContent } from './detail/useItemCardContent'

interface ResourceDetailPaneProps {
  resourceInUrl: ResourceReference | null
  pickerCategory: ResourceCategory
  matchingBonuses?: string[]
  focusItemId?: number | null
  onFocusItem?: () => void
  onDetailRendered?: () => void
  onCloseDetail?: () => void
}

export function ResourceDetailPane({
  resourceInUrl,
  pickerCategory,
  matchingBonuses = [],
  focusItemId = null,
  onFocusItem,
  onDetailRendered,
  onCloseDetail,
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
    onCloseDetail,
  })

  const topEntry = stack[stack.length - 1] ?? null
  const topItemId = topEntry !== null && topEntry.category === 'items' ? topEntry.id : null
  const lastFocusedItemId = useRef<number | null>(null)

  const itemCard = useItemCardContent(topItemId)
  const itemDetailQuery = itemCard.itemQuery

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
          {renderedDetailBody(topEntry, itemCard, matchingBonuses, (id, name) =>
            pushResource({ category: 'items', id, name }),
          )}
        </section>
      </div>
    </DetailNavigationProvider>
  )
}

function renderedDetailBody(
  topEntry: ResourceReference | null,
  itemCard: ReturnType<typeof useItemCardContent>,
  matchingBonuses: string[],
  onOpenItem: (id: number, name: string) => void,
): JSX.Element {
  if (topEntry === null) return <StatusPlaceholder reason="no-selection" />
  if (topEntry.category === 'items') {
    if (itemCard.item) {
      return (
        <ItemDetailCard
          key={`${topEntry.category}-${topEntry.id}`}
          item={itemCard.item}
          setDetail={itemCard.setDetail}
          status={itemCard.status}
          matchingBonuses={matchingBonuses}
          onOpenItem={onOpenItem}
        />
      )
    }
    if (itemCard.itemQuery.isPending && !itemCard.itemQuery.error) {
      return <StatusPlaceholder reason="loading" />
    }
    if (itemCard.itemQuery.error) {
      return (
        <StatusPlaceholder
          error={itemCard.itemQuery.error}
          path={`/v1/items/${topEntry.id}`}
          missingResourceName="item"
          onRetry={() => void itemCard.itemQuery.refetch()}
        />
      )
    }
    return <StatusPlaceholder reason="not-found" missingItemId={topEntry.id} />
  }
  return <StatusPlaceholder reason="empty-table" category={topEntry.category} />
}
