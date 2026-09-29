import type { JSX } from 'react'
import { BookOpen } from 'lucide-react'
import { HoverTooltip } from './Tooltip'
import {
  wikiPageUrlFor,
  openWikiCompareWindow,
  WIKI_COMPARE_WINDOW_NAME,
} from '../lib/wiki/pageLinks'
import './WikiLinkIcon.css'

interface WikiLinkIconProps {
  href?: string
  pageName?: string
  size?: number
}

export function WikiLinkIcon({ href, pageName, size = 12 }: WikiLinkIconProps): JSX.Element | null {
  const wikiPageUrl = href ?? (pageName ? wikiPageUrlFor(pageName) : null)
  if (!wikiPageUrl) return null

  const ariaLabel = pageName ? `Open ${pageName} on DDO Wiki` : 'Open on DDO Wiki'

  return (
    <HoverTooltip text="Open in DDO Wiki (compare window)">
      <a
        href={wikiPageUrl}
        target={WIKI_COMPARE_WINDOW_NAME}
        rel="nofollow"
        className="wiki-link-icon hoverable"
        aria-label={ariaLabel}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          openWikiCompareWindow(wikiPageUrl)
        }}
      >
        <BookOpen size={size} aria-hidden />
      </a>
    </HoverTooltip>
  )
}
