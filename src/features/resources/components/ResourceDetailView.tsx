import { useMemo, type JSX } from 'react'
import { DetailNavProvider } from '../contexts/DetailNavContext'
import { useDetailStack, type StackEntry } from '../hooks/useDetailStack'
import { isApiError } from '../../../lib/api'
import type { AugmentCandidate, ItemDetail as ItemDetailRow } from '../queries/items'
import { useItemDetail, useItemRows, useSlotCandidates } from '../queries/useItems'
import type { Category } from '../types'
import { DetailBar } from './DetailBar'
import { DetailEmpty } from './DetailEmpty'
import { ItemDetail } from './detail/ItemDetail'

interface ResourceDetailViewProps {
  urlEntry: StackEntry | null
  baseCategory: Category
}

export function ResourceDetailView({
  urlEntry,
  baseCategory,
}: ResourceDetailViewProps): JSX.Element {
  const { stack, pushDetail, popDetail, jumpToCrumb, closeDrawer, deepLinkUrl } = useDetailStack({
    urlEntry,
    baseCategory,
  })

  const top = stack[stack.length - 1] ?? null
  const topItemId = top !== null && top.category === 'items' ? top.id : null

  const detail = useItemDetail(topItemId)
  const candidates = useSlotCandidates(detail.data?.augmentSlots ?? [])

  const rows = useItemRows(false)
  const enrichedStack = useMemo(() => {
    const names = new Map((rows.data ?? []).map((r) => [r.id, r.name] as const))
    if (detail.data) names.set(detail.data.id, detail.data.name)
    return stack.map((entry) => {
      if (entry.name) return entry
      const name = entry.category === 'items' ? names.get(entry.id) : undefined
      return name ? { ...entry, name } : entry
    })
  }, [stack, rows.data, detail.data])

  return (
    <DetailNavProvider api={{ pushDetail, deepLinkUrl, closeDrawer, baseCategory }}>
      <div className="resources-drawer-bar">
        <DetailBar stack={enrichedStack} onBack={popDetail} onJumpToCrumb={jumpToCrumb} />
      </div>
      <div className="resources-drawer-body">
        <section className="resources-detail">
          {renderParsedBody(top, detail.data ?? null, detail.isPending, detail.error, candidates)}
        </section>
      </div>
    </DetailNavProvider>
  )
}

function renderParsedBody(
  top: StackEntry | null,
  itemDetail: ItemDetailRow | null,
  isPending: boolean,
  error: unknown,
  candidates: Record<string, AugmentCandidate[]>,
): JSX.Element {
  if (top === null) return <DetailEmpty kind="no-selection" />
  if (top.category === 'items') {
    if (itemDetail) {
      return (
        <ItemDetail key={`${top.category}-${top.id}`} detail={itemDetail} candidates={candidates} />
      )
    }
    if (isPending && !error) return <DetailEmpty kind="loading" />
    if (error && !(isApiError(error) && error.status === 404)) {
      return <DetailEmpty kind="error" />
    }
    return <DetailEmpty kind="not-found" id={top.id} />
  }
  return <DetailEmpty kind="empty-table" category={top.category} />
}
