import { useCallback, useEffect, useState } from 'react'

export type View =
  | 'characters'
  | 'overview'
  | 'build-plan'
  | 'gear'
  | 'damage-calc'
  | 'farm-checklist'
  | 'debug'
  | 'settings'

const VALID_VIEWS: View[] = [
  'characters',
  'overview',
  'build-plan',
  'gear',
  'damage-calc',
  'farm-checklist',
  'debug',
  'settings',
]

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') // '/ddo-builder'

function getViewFromPath(): View {
  const path = window.location.pathname
    .replace(BASE, '')
    .replace(/^\//, '')
    .replace(/\/.*$/, '') // strip sub-paths (e.g., debug/items -> debug)
  return VALID_VIEWS.includes(path as View) ? (path as View) : 'build-plan'
}

export function useRouter() {
  const [view, setView] = useState<View>(getViewFromPath)

  useEffect(() => {
    const onPopState = () => setView(getViewFromPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((target: View) => {
    window.history.pushState(null, '', `${BASE}/${target}`)
    setView(target)
  }, [])

  return { view, navigate }
}
