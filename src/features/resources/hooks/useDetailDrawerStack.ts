import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ResourceCategory } from '../resourceCategories'

export interface ResourceReference {
  category: ResourceCategory
  id: number
  name?: string
}

export interface UseDetailDrawerStackOptions {
  resourceInUrl: ResourceReference | null
  pickerCategory: ResourceCategory
}

export interface DetailDrawerStack {
  stack: ResourceReference[]
  isDrawerOpen: boolean
  pushResource: (resource: ResourceReference) => void
  popResource: () => void
  jumpToBreadcrumb: (breadcrumbIndex: number) => void
  closeDrawer: () => void
  deepLinkUrl: string | null
}

function isSameResource(a: ResourceReference, b: ResourceReference): boolean {
  return a.category === b.category && a.id === b.id
}

export function useDetailDrawerStack({
  resourceInUrl,
  pickerCategory,
}: UseDetailDrawerStackOptions): DetailDrawerStack {
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

  const closeDrawer = useCallback(() => {
    setStack([])
    navigate({ to: `/resources/${pickerCategory}`, replace: true })
  }, [navigate, pickerCategory])

  const popResource = useCallback(() => {
    if (stack.length <= 1) {
      closeDrawer()
      return
    }
    setStack((previousStack) => previousStack.slice(0, -1))
  }, [stack.length, closeDrawer])

  const jumpToBreadcrumb = useCallback(
    (breadcrumbIndex: number) => {
      if (breadcrumbIndex < 0) {
        closeDrawer()
        return
      }
      setStack((previousStack) => previousStack.slice(0, breadcrumbIndex + 1))
    },
    [closeDrawer],
  )

  const top = stack[stack.length - 1] ?? null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const deepLinkUrl = top ? `${origin}${basePath}/resources/${top.category}/${top.id}` : null

  return {
    stack,
    isDrawerOpen: stack.length > 0,
    pushResource,
    popResource,
    jumpToBreadcrumb,
    closeDrawer,
    deepLinkUrl,
  }
}
