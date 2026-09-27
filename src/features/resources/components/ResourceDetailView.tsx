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
  /** The URL-derived entry. When the URL has no detail id, pass null and
   *  the parent should hide the wrapping drawer entirely. */
  urlEntry: StackEntry | null
  /** Picker category to navigate back to when the user closes the drawer. */
  baseCategory: Category
}

/**
 * Reusable detail-with-navigation surface. Owns the in-memory stack, the
 * breadcrumb / back / copy-link / close-all bar, and the parsed-detail
 * body. Does NOT own the wrapping chrome (drawer, backdrop) — those stay
 * in the consumer (ResourcesView for now). Wiki access is the compare-
 * window icon in the EntityHeader title row (ddowiki's bot protection
 * killed the old embedded preview — see lib/wiki/client.ts).
 *
 * Category-dispatched body: renders the right per-category detail
 * component for the current top of stack. Today only `items` is wired.
 */
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

  // Resolve display names for any stack entry that doesn't already carry
  // one (e.g., URL-seeded depth-1 entries on page reload). The item list is
  // already cached for the picker, so this is a lookup, not a request.
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

/**
 * Category dispatch for the parsed-detail body. Today only `items` has a
 * real renderer; other categories fall through to a "coming soon"
 * placeholder.
 */
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
      // Keyed on the entity, so navigating to another item remounts the body
      // instead of feeding new props to the old instance. Detail components
      // hold per-item UI state — an expanded augment slot, for one — and
      // without this the next item opens with the previous item's slot
      // already expanded.
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
