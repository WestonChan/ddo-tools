import { apiDetailPath, type Slug } from '../../../../lib/api'
import type { ReactNode } from 'react'
import { ApiErrorNotice } from '../../../../components'
import { useItem, useSets } from '../../queries/useItems'
import type { Item } from '../../queries/items'
import type { SetDetail } from '../../queries/sets'

interface ItemCardContent {
  itemQuery: ReturnType<typeof useItem>
  item: Item | null
  setDetails: SetDetail[]
  status: ReactNode
}

export function useItemCardContent(itemSlug: Slug | null): ItemCardContent {
  const itemQuery = useItem(itemSlug)
  const setQueries = useSets(itemQuery.data?.sets.map((set) => set.slug) ?? [])
  const failedSetIndex = setQueries.findIndex((query) => query.error)
  const failedSetQuery = setQueries[failedSetIndex]
  const item = itemQuery.data ?? null
  const status = itemQuery.error ? (
    <ApiErrorNotice
      error={itemQuery.error}
      path={apiDetailPath('items', itemSlug)}
      missingResourceName="item"
      onRetry={() => void itemQuery.refetch()}
    />
  ) : !item ? (
    itemQuery.isPending ? (
      'Loading item…'
    ) : (
      'Item unavailable'
    )
  ) : failedSetQuery?.error ? (
    <ApiErrorNotice
      error={failedSetQuery.error}
      path={apiDetailPath('sets', item.sets[failedSetIndex].slug)}
      missingResourceName="set"
      onRetry={() => void failedSetQuery.refetch()}
    />
  ) : null
  return {
    itemQuery,
    item,
    setDetails: setQueries.flatMap((query) => (query.data ? [query.data] : [])),
    status,
  }
}
