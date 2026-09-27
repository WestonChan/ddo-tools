import type { JSX } from 'react'
import { BookOpen } from 'lucide-react'
import { TooltipWrapper } from './Tooltip'
import { buildWikiPageUrl, openCompareWindow, WIKI_COMPARE_WINDOW } from '../lib/wiki/client'
import './WikiLinkIcon.css'

interface WikiLinkIconProps {
  href?: string
  pageName?: string
  size?: number
}

export function WikiLinkIcon({ href, pageName, size = 12 }: WikiLinkIconProps): JSX.Element | null {
  const url = href ?? (pageName ? buildWikiPageUrl(pageName) : null)
  if (!url) return null

  const ariaLabel = pageName ? `Open ${pageName} on DDO Wiki` : 'Open on DDO Wiki'

  return (
    <TooltipWrapper text="Open in DDO Wiki (compare window)">
      <a
        href={url}
        target={WIKI_COMPARE_WINDOW}
        rel="nofollow"
        className="wiki-link-icon hoverable"
        aria-label={ariaLabel}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          openCompareWindow(url)
        }}
      >
        <BookOpen size={size} aria-hidden />
      </a>
    </TooltipWrapper>
  )
}
