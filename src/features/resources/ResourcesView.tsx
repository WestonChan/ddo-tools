import { useCallback, useEffect, useRef, type JSX } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CategoryTabs } from './components/CategoryTabs'
import { PickerPanel } from './components/PickerPanel'
import { ResourceDetailView } from './components/ResourceDetailView'
import { ApiGate, Modal } from '../../components'
import { useItemRows } from './queries/useItems'
import { DETAIL_TITLE_ID, isCategory, type Category } from './types'
import './ResourcesView.css'

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
  const searchRef = useRef<HTMLInputElement | null>(null)

  const items = useItemRows(category === 'items')

  function handleSelect(next: Category): void {
    navigate({ to: `/resources/${next}` })
  }

  const closeDrawer = useCallback((): void => {
    navigate({ to: `/resources/${category}`, replace: true })
  }, [navigate, category])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const inField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
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
            <ApiGate isPending={items.isPending} error={items.error} onRetry={() => void items.refetch()}>
              <PickerPanel
                category={category}
                rows={items.data ?? []}
                selectedId={id}
                searchInputRef={searchRef}
              />
            </ApiGate>
          ) : (
            <p className="section-placeholder">{category} coming soon.</p>
          )}
        </aside>
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
