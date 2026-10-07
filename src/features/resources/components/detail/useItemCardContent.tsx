import type { ReactNode } from 'react'
import { ApiErrorNotice } from '../../../../components'
import { useItem, useSet } from '../../queries/useItems'
import type { Item } from '../../queries/items'
import type { SetDetail } from '../../queries/sets'

interface ItemCardContent {
  itemQuery: ReturnType<typeof useItem>
  item: Item | null
  setDetail: SetDetail | null
  status: ReactNode
}

export function useItemCardContent(itemId: number | null): ItemCardContent {
  const itemQuery = useItem(itemId)
  const setQuery = useSet(itemQuery.data?.setId ?? null)
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
  ) : setQuery.error ? (
    <ApiErrorNotice
      error={setQuery.error}
      path={`/v1/sets/${item.setId}`}
      missingResourceName="set"
      onRetry={() => void setQuery.refetch()}
    />
  ) : null
  return { itemQuery, item, setDetail: setQuery.data ?? null, status }
}
