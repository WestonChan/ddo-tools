import { API_HTTP_ERROR, apiDetailPath, isApiError, type Slug } from '../../../lib/api'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { itemDetailQueryOptions } from '../queries/useItems'
import { useEffect, useMemo, useRef, type JSX } from 'react'
import { DetailNavigationProvider } from '../contexts/DetailNavigationContext'
import { useDetailStack, type ResourceReference } from '../hooks/useDetailStack'
import { DETAIL_TITLE_ID } from '../resourceCategories'
import { resourcePath, type ResourceCategory } from '../../../lib/resourcePaths'
import { DetailBreadcrumbBar } from './DetailBreadcrumbBar'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemDetailCard } from './detail/ItemDetailCard'
import { useItemCardContent } from './detail/useItemCardContent'

interface ResourceDetailPaneProps {
  invalidLinkSegment?: string | null
  resourceInUrl: ResourceReference | null
  pickerCategory: ResourceCategory
  matchingBonuses?: string[]
  focusItemSlug?: Slug | null
  onFocusItem?: () => void
  onDetailRendered?: () => void
  onCloseDetail?: () => void
}

export function ResourceDetailPane({
  resourceInUrl,
  invalidLinkSegment = null,
  pickerCategory,
  matchingBonuses = [],
  focusItemSlug = null,
  onFocusItem,
  onDetailRendered,
  onCloseDetail,
}: ResourceDetailPaneProps): JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
  const topItemSlug = topEntry !== null && topEntry.category === 'items' ? topEntry.slug : null
  const lastFocusedItemSlug = useRef<Slug | null>(null)

  const itemCard = useItemCardContent(topItemSlug)
  const itemDetailQuery = itemCard.itemQuery

  const namedDetailStack = useMemo(() => {
    return stack.map((entry) => {
      if (entry.name) return entry
      const name =
        entry.category === 'items' && entry.slug === topItemSlug && itemDetailQuery.data
          ? itemDetailQuery.data.name
          : undefined
      return name ? { ...entry, name } : entry
    })
  }, [stack, itemDetailQuery.data, topItemSlug])

  useEffect(() => {
    if (!itemDetailQuery.data || topItemSlug === null) return
    nameResource({ category: 'items', slug: topItemSlug, name: itemDetailQuery.data.name })
    onDetailRendered?.()
  }, [itemDetailQuery.data, topItemSlug, nameResource, onDetailRendered])

  useEffect(() => {
    const item = itemDetailQuery.data
    if (
      !item ||
      resourceInUrl?.category !== 'items' ||
      stack.length !== 1 ||
      resourceInUrl.slug !== topItemSlug ||
      item.slug === topItemSlug
    )
      return
    queryClient.setQueryData(itemDetailQueryOptions(item.slug).queryKey, item)
    void navigate({ to: resourcePath('items', item.slug), replace: true })
  }, [itemDetailQuery.data, resourceInUrl, stack.length, topItemSlug, queryClient, navigate])

  useEffect(() => {
    if (stack.length <= 1 && focusItemSlug === null) lastFocusedItemSlug.current = null
    const shouldFocus =
      lastFocusedItemSlug.current !== topItemSlug &&
      (focusItemSlug === topItemSlug || stack.length > 1)
    if (shouldFocus && itemDetailQuery.data && topItemSlug !== null) {
      document.getElementById(DETAIL_TITLE_ID)?.focus()
      lastFocusedItemSlug.current = topItemSlug
      if (focusItemSlug === topItemSlug) onFocusItem?.()
    }
  }, [stack.length, itemDetailQuery.data, topItemSlug, focusItemSlug, onFocusItem])

  return (
    <DetailNavigationProvider
      navigation={{ pushResource, deepLinkUrl, closeDetail, pickerCategory }}
    >
      {(topEntry || invalidLinkSegment !== null) && (
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
          {invalidLinkSegment !== null ? (
            <StatusPlaceholder reason="not-found" missingLinkSegment={invalidLinkSegment} />
          ) : (
            renderedDetailBody(topEntry, itemCard, matchingBonuses, (slug, name) =>
              pushResource({ category: 'items', slug, name }),
            )
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
  onOpenItem: (slug: Slug, name: string) => void,
): JSX.Element {
  if (topEntry === null) return <StatusPlaceholder reason="no-selection" />
  if (topEntry.category === 'items') {
    if (itemCard.item) {
      return (
        <ItemDetailCard
          key={`${topEntry.category}-${itemCard.item.slug}`}
          item={itemCard.item}
          setDetails={itemCard.setDetails}
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
      if (
        isApiError(itemCard.itemQuery.error) &&
        itemCard.itemQuery.error.kind === API_HTTP_ERROR &&
        itemCard.itemQuery.error.httpStatus === 404
      )
        return <StatusPlaceholder reason="not-found" missingLinkSegment={topEntry.slug} />
      return (
        <StatusPlaceholder
          error={itemCard.itemQuery.error}
          path={apiDetailPath('items', topEntry.slug)}
          missingResourceName="item"
          onRetry={() => void itemCard.itemQuery.refetch()}
        />
      )
    }
    return <StatusPlaceholder reason="not-found" missingLinkSegment={topEntry.slug} />
  }
  return <StatusPlaceholder reason="empty-table" category={topEntry.category} />
}
