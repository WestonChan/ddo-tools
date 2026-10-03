/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type JSX, type ReactNode } from 'react'
import type { ResourceCategory } from '../resourceCategories'
import type { ResourceReference } from '../hooks/useDetailStack'

export interface DetailNavigation {
  pushResource: (resource: ResourceReference) => void
  deepLinkUrl: string | null
  closeDetail: () => void
  pickerCategory: ResourceCategory
}

const NO_OP_DETAIL_NAVIGATION: DetailNavigation = {
  pushResource: () => {},
  deepLinkUrl: null,
  closeDetail: () => {},
  pickerCategory: 'items',
}

const DetailNavigationContext = createContext<DetailNavigation>(NO_OP_DETAIL_NAVIGATION)

export function DetailNavigationProvider({
  navigation,
  children,
}: {
  navigation: DetailNavigation
  children: ReactNode
}): JSX.Element {
  return (
    <DetailNavigationContext.Provider value={navigation}>
      {children}
    </DetailNavigationContext.Provider>
  )
}

export function useDetailNavigation(): DetailNavigation {
  return useContext(DetailNavigationContext)
}
