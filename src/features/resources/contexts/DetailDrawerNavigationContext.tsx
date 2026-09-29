/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type JSX, type ReactNode } from 'react'
import type { ResourceCategory } from '../resourceCategories'
import type { ResourceReference } from '../hooks/useDetailDrawerStack'

export interface DetailDrawerNavigation {
  pushResource: (resource: ResourceReference) => void
  deepLinkUrl: string | null
  closeDrawer: () => void
  pickerCategory: ResourceCategory
}

const NO_OP_DETAIL_DRAWER_NAVIGATION: DetailDrawerNavigation = {
  pushResource: () => {
  },
  deepLinkUrl: null,
  closeDrawer: () => {
  },
  pickerCategory: 'items',
}

const DetailDrawerNavigationContext = createContext<DetailDrawerNavigation>(NO_OP_DETAIL_DRAWER_NAVIGATION)

export function DetailDrawerNavigationProvider({
  navigation,
  children,
}: {
  navigation: DetailDrawerNavigation
  children: ReactNode
}): JSX.Element {
  return <DetailDrawerNavigationContext.Provider value={navigation}>{children}</DetailDrawerNavigationContext.Provider>
}

export function useDetailDrawerNavigation(): DetailDrawerNavigation {
  return useContext(DetailDrawerNavigationContext)
}
