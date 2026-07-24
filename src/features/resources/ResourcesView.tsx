import { useEffect, useMemo, useRef, type JSX } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CategoryTabs } from './components/CategoryTabs'
import { PickerPanel } from './components/PickerPanel'
import { ResourceDetailView } from './components/ResourceDetailView'
import { useDatabase } from '../../hooks/useDatabase'
import { useModalActive } from '../../hooks/useModalActive'
import { listItems } from './queries/items'
import { isCategory, type Category } from './types'
import './ResourcesView.css'

// Resolve category + id from the matched route's params so all three nested
// routes (`/resources`, `/resources/$category`, `/resources/$category/$id`)
// share a single component without re-mounting on navigation between levels.
// `strict: false` is the idiomatic call when one component serves multiple
// routes — strict mode requires `from: '<route id>'` for type-safe extraction
// from one specific route, which doesn't apply when the matched route varies
// at render time. TanStack already extracted `$category` / `$id` from the
// URL; we just normalize the strings into our typed values.
function useResourcesParams(): { category: Category; id: number | null } {
  const params = useParams({ strict: false })
  const category: Category =
    params.category && isCategory(params.category) ? params.category : 'items'
  const parsed = params.id !== undefined ? Number(params.id) : NaN
  const id = Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  return { category, id }
}

function ResourcesView(): JSX.Element {
  const { category, id } = useResourcesParams()
  const navigate = useNavigate()
  const { db } = useDatabase()
  const searchRef = useRef<HTMLInputElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // While the detail drawer is open, register as an active modal so
  // AppLayout inerts the surrounding nav bar + bottom bar (focus stays
  // trapped in the drawer area, background shortcuts don't fire). The
  // picker inside .resources-body is inerted separately below since it's
  // a sibling of the drawer in the same view's stacking context.
  useModalActive(id !== null)

  // DatabaseGate (in routeComponents.tsx) blocks rendering until db is ready,
  // so non-null is guaranteed by the time this component mounts.
  const itemRows = useMemo(() => (db && category === 'items' ? listItems(db) : []), [db, category])

  function handleSelect(next: Category): void {
    navigate({ to: `/resources/${next}` })
  }

  // Backdrop click + Escape both dismiss the drawer. `replace: true` matches
  // the URL-sync semantics in useDetailStack — closeDrawer doesn't push a
  // new history entry that browser back would have to unwind through.
  function closeDrawer(): void {
    navigate({ to: `/resources/${category}`, replace: true })
  }

  // Global shortcuts within the resources view: '/' focuses the search input
  // (picker only — gated on drawer being closed since the picker is hidden
  // behind the drawer when open), Escape closes the drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const inField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      // Picker's `/`-focus shortcut only fires when the drawer is closed.
      // The picker is visually obscured + `inert` while drawer is open, so
      // focusing its hidden search input would be a no-op visually and
      // confusing for screen readers.
      if (e.key === '/' && !inField && id === null) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape' && id !== null) {
        e.preventDefault()
        navigate({ to: `/resources/${category}`, replace: true })
      }
    }
    const root = rootRef.current
    root?.addEventListener('keydown', onKey)
    return () => {
      root?.removeEventListener('keydown', onKey)
    }
  }, [category, id, navigate])

  // The popover only needs identity (category + id). Display names are
  // resolved against the DB by ResourceDetailView at render time, so the
  // entry passed in here doesn't need to carry a name.
  const urlEntry = id !== null ? { category, id } : null

  return (
    <div className="resources-view" ref={rootRef} tabIndex={-1}>
      <header className="resources-header">
        <CategoryTabs active={category} onSelect={handleSelect} />
      </header>
      <div className={`resources-body${id !== null ? ' resources-body--inspect' : ''}`}>
        <aside
          className="resources-picker"
          aria-hidden={id !== null || undefined}
          inert={id !== null || undefined}
        >
          {category === 'items' ? (
            <PickerPanel
              category={category}
              rows={itemRows}
              selectedId={id}
              searchInputRef={searchRef}
            />
          ) : (
            <p className="section-placeholder">{category} coming soon.</p>
          )}
        </aside>
        {id !== null && (
          <>
            <button
              type="button"
              className="resources-drawer-backdrop"
              onClick={closeDrawer}
              aria-label="Close item details"
            />
            <div
              className="resources-drawer"
              role="dialog"
              aria-label={`Item details — ${urlEntry?.category} #${urlEntry?.id}`}
            >
              <ResourceDetailView urlEntry={urlEntry} baseCategory={category} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResourcesView
