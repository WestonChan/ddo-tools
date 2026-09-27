import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Category } from '../types'

export interface StackEntry {
  category: Category
  id: number
  name?: string
}

export interface UseDetailStackOptions {
  urlEntry: StackEntry | null
  baseCategory: Category
}

export interface DetailStackApi {
  stack: StackEntry[]
  isOpen: boolean
  pushDetail: (entry: StackEntry) => void
  popDetail: () => void
  jumpToCrumb: (index: number) => void
  closeDrawer: () => void
  deepLinkUrl: string | null
}

function entriesEqual(a: StackEntry, b: StackEntry): boolean {
  return a.category === b.category && a.id === b.id
}

export function useDetailStack({
  urlEntry,
  baseCategory,
}: UseDetailStackOptions): DetailStackApi {
  const navigate = useNavigate()
  const [stack, setStack] = useState<StackEntry[]>(() => (urlEntry ? [urlEntry] : []))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStack((prev) => {
      if (urlEntry === null) {
        return prev.length === 0 ? prev : []
      }
      if (prev.length === 0) return [urlEntry]
      if (entriesEqual(prev[0], urlEntry)) return prev
      return [urlEntry]
    })
  }, [urlEntry])

  const pushDetail = useCallback(
    (entry: StackEntry) => {
      if (stack.length === 0) {
        navigate({ to: `/resources/${entry.category}/${entry.id}` })
        return
      }
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
