import type { Slug } from '../../../lib/api'
import { useEffect, useMemo, useRef, type JSX } from 'react'
import { DetailNavigationProvider } from '../contexts/DetailNavigationContext'
import { useDetailStack, type ResourceReference } from '../hooks/useDetailStack'
import { DETAIL_TITLE_ID } from '../resourceCategories'
import { type ResourceCategory } from '../../../lib/resourcePaths'
import { DetailBreadcrumbBar } from './DetailBreadcrumbBar'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemDetailCard } from './detail/ItemDetailCard'
import { useItemCardContent } from './detail/useItemCardContent'

interface ResourceDetailPaneProps {
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
  pickerCategory,
  matchingBonuses = [],
  focusItemSlug = null,
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
  const topItemSlug = topEntry !== null && topEntry.category === 'items' ? topEntry.slug : null
  const lastFocusedItemSlug = useRef<Slug | null>(null)

  const itemCard = useItemCardContent(topItemSlug)
  const itemDetailQuery = itemCard.itemQuery

  const namedDetailStack = useMemo(() => {
    return stack.map((entry) => {
      if (entry.name) return entry
      const name =
        entry.category === 'items' && entry.slug === itemDetailQuery.data?.slug
          ? itemDetailQuery.data.name
          : undefined
      return name ? { ...entry, name } : entry
    })
  }, [stack, itemDetailQuery.data])

  useEffect(() => {
    if (itemDetailQuery.data?.slug !== topItemSlug) return
    nameResource({ category: 'items', slug: topItemSlug, name: itemDetailQuery.data.name })
    onDetailRendered?.()
  }, [itemDetailQuery.data, topItemSlug, nameResource, onDetailRendered])

  useEffect(() => {
    if (stack.length <= 1 && focusItemSlug === null) lastFocusedItemSlug.current = null
    const shouldFocus =
      lastFocusedItemSlug.current !== topItemSlug &&
      (focusItemSlug === topItemSlug || stack.length > 1)
    if (shouldFocus && itemDetailQuery.data?.slug === topItemSlug) {
      document.getElementById(DETAIL_TITLE_ID)?.focus()
      lastFocusedItemSlug.current = topItemSlug
      if (focusItemSlug === topItemSlug) onFocusItem?.()
    }
  }, [stack.length, itemDetailQuery.data, topItemSlug, focusItemSlug, onFocusItem])

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
          {renderedDetailBody(topEntry, itemCard, matchingBonuses, (slug, name) =>
            pushResource({ category: 'items', slug, name }),
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
          key={`${topEntry.category}-${topEntry.slug}`}
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
      return (
        <StatusPlaceholder
          error={itemCard.itemQuery.error}
          path={`/v1/items/${topEntry.slug}`}
          missingResourceName="item"
          onRetry={() => void itemCard.itemQuery.refetch()}
        />
      )
    }
    return <StatusPlaceholder reason="not-found" missingItemSlug={topEntry.slug} />
  }
  return <StatusPlaceholder reason="empty-table" category={topEntry.category} />
}
