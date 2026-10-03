import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ResourceCategory } from '../resourceCategories'

export interface ResourceReference {
  category: ResourceCategory
  id: number
  name?: string
}

export interface UseDetailStackOptions {
  resourceInUrl: ResourceReference | null
  pickerCategory: ResourceCategory
  onCloseDetail?: () => void
}

export interface DetailStack {
  stack: ResourceReference[]
  isDetailOpen: boolean
  pushResource: (resource: ResourceReference) => void
  nameResource: (resource: ResourceReference) => void
  popResource: () => void
  jumpToBreadcrumb: (breadcrumbIndex: number) => void
  closeDetail: () => void
  deepLinkUrl: string | null
}

function isSameResource(a: ResourceReference, b: ResourceReference): boolean {
  return a.category === b.category && a.id === b.id
}

export function useDetailStack({
  resourceInUrl,
  pickerCategory,
  onCloseDetail,
}: UseDetailStackOptions): DetailStack {
  const navigate = useNavigate()
  const [stack, setStack] = useState<ResourceReference[]>(() =>
    resourceInUrl ? [resourceInUrl] : [],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStack((previousStack) => {
      if (resourceInUrl === null) {
        return previousStack.length === 0 ? previousStack : []
      }
      if (previousStack.length === 0) return [resourceInUrl]
      if (isSameResource(previousStack[0], resourceInUrl)) return previousStack
      return [resourceInUrl]
    })
  }, [resourceInUrl])

  const pushResource = useCallback(
    (resource: ResourceReference) => {
      if (stack.length === 0) {
        navigate({ to: `/resources/${resource.category}/${resource.id}` })
        return
      }
      setStack((previousStack) => {
        const top = previousStack[previousStack.length - 1]
        if (top && isSameResource(top, resource)) return previousStack
        return [...previousStack, resource]
      })
    },
    [stack.length, navigate],
  )

  const nameResource = useCallback((resource: ResourceReference) => {
    if (!resource.name) return
    setStack((previousStack) => {
      const hasUnnamedEntry = previousStack.some(
        (entry) => isSameResource(entry, resource) && entry.name !== resource.name,
      )
      if (!hasUnnamedEntry) return previousStack
      return previousStack.map((entry) =>
        isSameResource(entry, resource) ? { ...entry, name: resource.name } : entry,
      )
    })
  }, [])

  const closeDetail = useCallback(() => {
    setStack([])
    if (onCloseDetail) onCloseDetail()
    else navigate({ to: `/resources/${pickerCategory}`, replace: true })
  }, [navigate, pickerCategory, onCloseDetail])

  const popResource = useCallback(() => {
    if (stack.length <= 1) {
      closeDetail()
      return
    }
    setStack((previousStack) => previousStack.slice(0, -1))
  }, [stack.length, closeDetail])

  const jumpToBreadcrumb = useCallback(
    (breadcrumbIndex: number) => {
      if (breadcrumbIndex < 0) {
        closeDetail()
        return
      }
      setStack((previousStack) => previousStack.slice(0, breadcrumbIndex + 1))
    },
    [closeDetail],
  )

  const top = stack[stack.length - 1] ?? null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const deepLinkUrl = top ? `${origin}${basePath}/resources/${top.category}/${top.id}` : null

  return {
    stack,
    isDetailOpen: stack.length > 0,
    pushResource,
    nameResource,
    popResource,
    jumpToBreadcrumb,
    closeDetail,
    deepLinkUrl,
  }
}
