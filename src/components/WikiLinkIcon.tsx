import type { JSX } from 'react'
import { BookOpen, ExternalLink } from 'lucide-react'
import { HintAnchor } from './HoverCard'
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
  label?: string
  icon?: 'book' | 'external'
  className?: string
  hintText?: string
}

export function WikiLinkIcon({
  href,
  pageName,
  size = 12,
  label,
  icon = 'book',
  className,
  hintText = 'Open in DDO Wiki (compare window)',
}: WikiLinkIconProps): JSX.Element | null {
  const wikiPageUrl = href ?? (pageName ? wikiPageUrlFor(pageName) : null)
  if (!wikiPageUrl) return null

  const ariaLabel = pageName ? `Open ${pageName} on DDO Wiki` : 'Open on DDO Wiki'

  return (
    <HintAnchor text={hintText}>
      <a
        href={wikiPageUrl}
        target={WIKI_COMPARE_WINDOW_NAME}
        rel="nofollow"
        className={`wiki-link-icon hoverable focus-ring-proxy${className ? ` ${className}` : ''}`}
        aria-label={label ?? ariaLabel}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          openWikiCompareWindow(wikiPageUrl)
        }}
      >
        {icon === 'external' ? (
          <ExternalLink size={size} aria-hidden />
        ) : (
          <BookOpen size={size} aria-hidden />
        )}
        {label && <span>{label}</span>}
      </a>
    </HintAnchor>
  )
}
