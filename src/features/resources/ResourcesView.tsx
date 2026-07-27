import { useCallback, useEffect, useMemo, useRef, type JSX } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CategoryTabs } from './components/CategoryTabs'
import { PickerPanel } from './components/PickerPanel'
import { ResourceDetailView } from './components/ResourceDetailView'
import { Modal } from '../../components'
import { useDatabase } from '../../hooks/useDatabase'
import { listItems } from './queries/items'
import { DETAIL_TITLE_ID, isCategory, type Category } from './types'
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

  // DatabaseGate (in routeComponents.tsx) blocks rendering until db is ready,
  // so non-null is guaranteed by the time this component mounts.
  const itemRows = useMemo(() => (db && category === 'items' ? listItems(db) : []), [db, category])

  function handleSelect(next: Category): void {
    navigate({ to: `/resources/${next}` })
  }

  // Backdrop click + Escape both dismiss the drawer. `replace: true` matches
  // the URL-sync semantics in useDetailStack — closeDrawer doesn't push a
  // new history entry that browser back would have to unwind through.
  const closeDrawer = useCallback((): void => {
    navigate({ to: `/resources/${category}`, replace: true })
  }, [navigate, category])

  // '/' focuses the picker's search input while the resources view is
  // mounted. (Escape-to-close and drawer focus management belong to <Modal> /
  // useModalBehavior — see src/hooks/useModalBehavior.ts.)
  //
  // Listener goes on `document`, not the view root. Keydown fires at the
  // focused element and bubbles up, so a root-level listener only ran when
  // focus was already inside the view — which it isn't after clicking
  // "Resources" in the nav bar (focus on the nav link) or opening a deep link
  // (focus on <body>). Both flows left the advertised key dead.
  //
  // Effect lifetime scopes this: the listener exists only while a /resources
  // route is rendered.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const inField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      // Gated on the drawer being closed: the picker is obscured + `inert`
      // while it's open, so focusing the hidden search input would be
      // visually inert and confusing for screen readers.
      if (e.key === '/' && !inField && id === null) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [id])

  // The popover only needs identity (category + id). Display names are
  // resolved against the DB by ResourceDetailView at render time, so the
  // entry passed in here doesn't need to carry a name.
  const urlEntry = id !== null ? { category, id } : null

  return (
    <div className="resources-view">
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
        {/* `labelledBy` points at the EntityHeader's <h2>, so the dialog
            announces the item's name instead of an internal id. `label` is a
            fallback for when no detail renders (unknown id → DetailEmpty,
            which has no heading): per the accessible-name spec an
            unresolvable labelledby falls through to it. */}
        {id !== null && (
          <Modal
            variant="drawer-right"
            onClose={closeDrawer}
            labelledBy={DETAIL_TITLE_ID}
            label="Item details"
            backdropLabel="Close item details"
          >
            <ResourceDetailView urlEntry={urlEntry} baseCategory={category} />
          </Modal>
        )}
      </div>
    </div>
  )
}

export default ResourcesView
