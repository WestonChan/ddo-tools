import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Category } from '../types'

export interface StackEntry {
  category: Category
  id: number
  name?: string
}

export interface UseDetailStackOptions {
  /** URL-derived current entry (the depth-1 detail). Drives the URL→stack
   *  sync effect: when it changes externally (browser back, fresh mount,
   *  bookmark click), the stack reconciles. */
  urlEntry: StackEntry | null
  /** Picker category to navigate back to when the stack is closed. */
  baseCategory: Category
}

export interface DetailStackApi {
  stack: StackEntry[]
  isOpen: boolean
  pushDetail: (entry: StackEntry) => void
  popDetail: () => void
  jumpToCrumb: (index: number) => void
  closeDrawer: () => void
  /** Absolute URL pointing at the CURRENT TOP of the stack — used by the
   *  copy-link button so depth-2+ users share what they're actually viewing. */
  deepLinkUrl: string | null
}

function entriesEqual(a: StackEntry, b: StackEntry): boolean {
  return a.category === b.category && a.id === b.id
}

/**
 * Detail-stack state for a category-driven inspector view (resources today;
 * gear/build potentially later).
 *
 * URL coordination is hybrid:
 * - Depth-1 push navigates the URL (so /resources/items/42 is bookmarkable
 *   and shareable). The URL-sync effect populates the stack from `urlEntry`.
 * - Depth-2+ push is pure in-memory — URL stays at the depth-1 entry.
 * - Close (any depth) navigates with `replace` so browser back doesn't
 *   reopen the drawer.
 *
 * Browser back/forward at depth 2+ collapses the entire stack (the URL pops,
 * the sync effect clears the stack). That's the explicit cost of "deeper
 * navigation lives only in memory."
 */
export function useDetailStack({
  urlEntry,
  baseCategory,
}: UseDetailStackOptions): DetailStackApi {
  const navigate = useNavigate()
  const [stack, setStack] = useState<StackEntry[]>(() => (urlEntry ? [urlEntry] : []))

  // URL → stack reconciliation. Fires when the parent re-renders with a
  // new urlEntry (which only happens on URL change, since urlEntry is
  // derived from the route). The functional updater returns the same
  // reference when nothing changes, so React de-dupes and there's no
  // cascading-render concern despite the lint rule's general warning.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStack((prev) => {
      if (urlEntry === null) {
        return prev.length === 0 ? prev : []
      }
      if (prev.length === 0) return [urlEntry]
      if (entriesEqual(prev[0], urlEntry)) return prev
      // URL changed to a different depth-1 entry — external nav resets the
      // stack to just that entry, dropping any in-memory deeper layers.
      return [urlEntry]
    })
  }, [urlEntry])

  const pushDetail = useCallback(
    (entry: StackEntry) => {
      if (stack.length === 0) {
        // Depth 1: navigate. The URL-sync effect will populate the stack
        // once urlEntry updates on the next render.
        navigate({ to: `/resources/${entry.category}/${entry.id}` })
        return
      }
      // Deeper: pure in-memory push, URL unchanged. Suppress a push of the
      // entry already on top so re-clicking the cross-reference you just
      // followed doesn't stack a duplicate crumb. Revisiting an entry that
      // sits deeper in the stack is still allowed — A > B > A is a real path.
      setStack((prev) => {
        const top = prev[prev.length - 1]
        if (top && entriesEqual(top, entry)) return prev
        return [...prev, entry]
      })
    },
    [stack.length, navigate],
  )

  const closeDrawer = useCallback(() => {
    setStack([])
    navigate({ to: `/resources/${baseCategory}`, replace: true })
  }, [navigate, baseCategory])

  const popDetail = useCallback(() => {
    if (stack.length <= 1) {
      closeDrawer()
      return
    }
    setStack((prev) => prev.slice(0, -1))
  }, [stack.length, closeDrawer])

  const jumpToCrumb = useCallback(
    (index: number) => {
      if (index < 0) {
        closeDrawer()
        return
      }
      setStack((prev) => prev.slice(0, index + 1))
    },
    [closeDrawer],
  )

  const top = stack[stack.length - 1] ?? null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const deepLinkUrl = top ? `${origin}${base}/resources/${top.category}/${top.id}` : null

  return {
    stack,
    isOpen: stack.length > 0,
    pushDetail,
    popDetail,
    jumpToCrumb,
    closeDrawer,
    deepLinkUrl,
  }
}
