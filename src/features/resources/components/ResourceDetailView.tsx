import { useMemo, type JSX } from 'react'
import { useDatabase } from '../../../hooks/useDatabase'
import { DetailNavProvider } from '../contexts/DetailNavContext'
import { useDetailStack, type StackEntry } from '../hooks/useDetailStack'
import { findItemNameById, getItemDetail } from '../queries/items'
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
 * component for the current top of stack. Today only `items` is wired;
 * Phase 4c will grow the switch as feats/enhancements/bonuses ship.
 */
export function ResourceDetailView({
  urlEntry,
  baseCategory,
}: ResourceDetailViewProps): JSX.Element {
  const { db } = useDatabase()
  const { stack, pushDetail, popDetail, jumpToCrumb, closeDrawer, deepLinkUrl } = useDetailStack({
    urlEntry,
    baseCategory,
  })

  const top = stack[stack.length - 1] ?? null

  // Item detail for the current top — only when category === 'items'.
  // Future categories add their own queries here (or a per-category hook).
  const itemDetail = useMemo(() => {
    if (!db || top === null || top.category !== 'items') return null
    return getItemDetail(db, top.id)
  }, [db, top])

  // Resolve display names from the DB for any stack entry that doesn't
  // already carry one (e.g., URL-seeded depth-1 entries on page reload).
  // Cheap — one indexed-PK SELECT per missing name. Recomputes only when
  // the stack or db identity changes.
  const enrichedStack = useMemo(() => {
    if (!db) return stack
    return stack.map((entry) => {
      if (entry.name) return entry
      if (entry.category === 'items') {
        const name = findItemNameById(db, entry.id)
        if (name) return { ...entry, name }
      }
      return entry
    })
  }, [stack, db])

  return (
    <DetailNavProvider api={{ pushDetail, deepLinkUrl, closeDrawer, baseCategory }}>
      <div className="resources-drawer-bar">
        <DetailBar stack={enrichedStack} onBack={popDetail} onJumpToCrumb={jumpToCrumb} />
      </div>
      <div className="resources-drawer-body">
        <section className="resources-detail">{renderParsedBody(top, itemDetail)}</section>
      </div>
    </DetailNavProvider>
  )
}

/**
 * Category dispatch for the parsed-detail body. Today only `items` has a
 * real renderer; other categories fall through to a "coming soon"
 * placeholder until Phase 4c ships their detail components.
 */
function renderParsedBody(
  top: StackEntry | null,
  itemDetail: ReturnType<typeof getItemDetail> | null,
): JSX.Element {
  if (top === null) return <DetailEmpty kind="no-selection" />
  if (top.category === 'items') {
    // Keyed on the entity, so navigating to another item remounts the body
    // instead of feeding new props to the old instance. Detail components hold
    // per-item UI state — an expanded augment slot, for one — and without this
    // the next item opens with the previous item's slot already expanded.
    return itemDetail ? (
      <ItemDetail key={`${top.category}-${top.id}`} detail={itemDetail} />
    ) : (
      <DetailEmpty kind="not-found" id={top.id} />
    )
  }
  return <DetailEmpty kind="empty-table" category={top.category} />
}
