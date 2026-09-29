import { useMemo, type JSX } from 'react'
import { DetailDrawerNavigationProvider } from '../contexts/DetailDrawerNavigationContext'
import { useDetailDrawerStack, type ResourceReference } from '../hooks/useDetailDrawerStack'
import { isApiError } from '../../../lib/api'
import type { AugmentSummary, Item } from '../queries/items'
import { useItem, useItemSummaries, useFittingAugmentsBySlotLabel } from '../queries/useItems'
import type { ResourceCategory } from '../resourceCategories'
import { DetailBreadcrumbBar } from './DetailBreadcrumbBar'
import { StatusPlaceholder } from './StatusPlaceholder'
import { ItemDetailBody } from './detail/ItemDetailBody'

interface ResourceDetailDrawerProps {
  resourceInUrl: ResourceReference | null
  pickerCategory: ResourceCategory
}

export function ResourceDetailDrawer({
  resourceInUrl,
  pickerCategory,
}: ResourceDetailDrawerProps): JSX.Element {
  const { stack, pushResource, popResource, jumpToBreadcrumb, closeDrawer, deepLinkUrl } =
    useDetailDrawerStack({
      resourceInUrl,
      pickerCategory,
    })

  const topEntry = stack[stack.length - 1] ?? null
  const topItemId = topEntry !== null && topEntry.category === 'items' ? topEntry.id : null

  const itemDetailQuery = useItem(topItemId)
  const augmentsBySlotLabel = useFittingAugmentsBySlotLabel(
    itemDetailQuery.data?.augmentSlots ?? [],
  )

  const itemsQuery = useItemSummaries(false)
  const namedDetailStack = useMemo(() => {
    const itemNamesById = new Map((itemsQuery.data ?? []).map((r) => [r.id, r.name] as const))
    if (itemDetailQuery.data) itemNamesById.set(itemDetailQuery.data.id, itemDetailQuery.data.name)
    return stack.map((entry) => {
      if (entry.name) return entry
      const name = entry.category === 'items' ? itemNamesById.get(entry.id) : undefined
      return name ? { ...entry, name } : entry
    })
  }, [stack, itemsQuery.data, itemDetailQuery.data])

  return (
    <DetailDrawerNavigationProvider
      navigation={{ pushResource, deepLinkUrl, closeDrawer, pickerCategory }}
    >
      <div className="resources-drawer-bar">
        <DetailBreadcrumbBar
          detailStack={namedDetailStack}
          onBackOneLevel={popResource}
          onJumpToCrumb={jumpToBreadcrumb}
        />
      </div>
      <div className="resources-drawer-body">
        <section className="resources-detail">
          {renderedDetailBody(
            topEntry,
            itemDetailQuery.data ?? null,
            itemDetailQuery.isPending,
            itemDetailQuery.error,
            augmentsBySlotLabel,
          )}
        </section>
      </div>
    </DetailDrawerNavigationProvider>
  )
}

function renderedDetailBody(
  topEntry: ResourceReference | null,
  itemDetail: Item | null,
  isPending: boolean,
  error: unknown,
  augmentsBySlotLabel: Record<string, AugmentSummary[]>,
): JSX.Element {
  if (topEntry === null) return <StatusPlaceholder reason="no-selection" />
  if (topEntry.category === 'items') {
    if (itemDetail) {
      return (
        <ItemDetailBody
          key={`${topEntry.category}-${topEntry.id}`}
          item={itemDetail}
          augmentsBySlotLabel={augmentsBySlotLabel}
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
