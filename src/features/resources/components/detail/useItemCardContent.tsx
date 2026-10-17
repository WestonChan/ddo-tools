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

export function useItemCardContent(itemId: number | null): ItemCardContent {
  const itemQuery = useItem(itemId)
  const setQueries = useSets(itemQuery.data?.sets.map((set) => set.id) ?? [])
  const failedSetIndex = setQueries.findIndex((query) => query.error)
  const failedSetQuery = setQueries[failedSetIndex]
  const item = itemQuery.data ?? null
  const status = itemQuery.error ? (
    <ApiErrorNotice
      error={itemQuery.error}
      path={`/v1/items/${itemId}`}
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
      path={`/v1/sets/${item.sets[failedSetIndex].id}`}
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
