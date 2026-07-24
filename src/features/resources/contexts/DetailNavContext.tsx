/* eslint-disable react-refresh/only-export-components */
// React-refresh prefers context+component+hook to live in separate files;
// for a small context like this the convenience of one file outweighs the
// HMR cost (the whole module reloads instead of swapping the component).
import { createContext, useContext, type JSX, type ReactNode } from 'react'
import type { Category } from '../types'
import type { StackEntry } from '../hooks/useDetailStack'

export interface DetailNavApi {
  /** Push a new entry onto the detail stack. Used by per-category detail
   *  components to surface internal cross-references (e.g. an item's bonus
   *  links to that bonus's own detail). */
  pushDetail: (entry: StackEntry) => void
  /** Absolute URL pointing at the current TOP of the stack — used by the
   *  copy-link affordance on the entity header. */
  deepLinkUrl: string | null
  /** Close every level and dismiss the drawer/embed. */
  closeDrawer: () => void
  /** The picker category to navigate back to ("items", "feats", etc.). Used
   *  by the "Back to <category>" link in the entity header. */
  baseCategory: Category
}

const NOOP_API: DetailNavApi = {
  pushDetail: () => {
    /* default: no-op */
  },
  deepLinkUrl: null,
  closeDrawer: () => {
    /* default: no-op */
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

/** Read detail-nav affordances. Outside a provider, every method is a
 *  no-op so consumers don't need null-checks. */
export function useDetailNav(): DetailNavApi {
  return useContext(DetailNavContext)
}
