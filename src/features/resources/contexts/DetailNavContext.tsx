/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type JSX, type ReactNode } from 'react'
import type { Category } from '../types'
import type { StackEntry } from '../hooks/useDetailStack'

export interface DetailNavApi {
  pushDetail: (entry: StackEntry) => void
  deepLinkUrl: string | null
  closeDrawer: () => void
  baseCategory: Category
}

const NOOP_API: DetailNavApi = {
  pushDetail: () => {
  },
  deepLinkUrl: null,
  closeDrawer: () => {
  },
  baseCategory: 'items',
}

const DetailNavContext = createContext<DetailNavApi>(NOOP_API)

export function DetailNavProvider({
  api,
  children,
}: {
  api: DetailNavApi
  children: ReactNode
}): JSX.Element {
  return <DetailNavContext.Provider value={api}>{children}</DetailNavContext.Provider>
}

export function useDetailNav(): DetailNavApi {
  return useContext(DetailNavContext)
}
