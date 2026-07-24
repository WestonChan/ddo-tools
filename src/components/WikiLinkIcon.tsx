import type { JSX } from 'react'
import { BookOpen } from 'lucide-react'
import { TooltipWrapper } from './Tooltip'
import { buildWikiPageUrl, openCompareWindow, WIKI_COMPARE_WINDOW } from '../lib/wiki/client'
import './WikiLinkIcon.css'

interface WikiLinkIconProps {
  /** Precomputed wiki URL. Use when an authoritative URL is available in
   *  the data layer (e.g. `items.wiki_url`, future `quests.wiki_url`) —
   *  beats name-derivation for disambiguated pages, namespaced titles
   *  ("Item:Foo"), and apostrophe-encoding quirks. Takes precedence over
   *  `pageName`. */
  href?: string
  /** Wiki page name. Spaces become underscores; the rest is percent-
   *  encoded. Used to derive the URL when no `href` is given. Also
   *  feeds the aria-label so screen readers announce the destination
   *  ("Open <name> on DDO Wiki"). */
  pageName?: string
  /** Icon size in pixels. Default 12 — matches inline-text contexts; bump
   *  up for header/footer placements where the icon stands alone. */
  size?: number
}

/**
 * Small icon-only link that opens a DDO Wiki page in the shared compare
 * window (see `openCompareWindow`): a plain click re-navigates one
 * right-half popup so the wiki follows the user's clicks beside the app —
 * the parser-QA workflow the old embedded preview served before ddowiki's
 * bot protection made embedding impossible (see `lib/wiki/client.ts`).
 * Modified clicks (cmd/ctrl/shift/alt) keep native open-a-new-tab behavior.
 *
 * The anchor keeps real `href` + `target` semantics underneath the JS
 * handler, so middle-click, right-click → open-in-new-tab, and link
 * previews all still work. `noopener`/`noreferrer` are deliberately
 * omitted — they discard window-name registration, which silently breaks
 * the reuse (verified: with them, every click spawns a new window). Safe
 * here because the URL is pinned to the trusted ddowiki.com origin.
 *
 * Reused anywhere we surface a wiki cross-reference inline next to text —
 * the item-header title row, bonus rows, quest names, future
 * feat/enhancement detail panels. Keeping the URL pattern + tooltip copy +
 * glyph in one place means a single edit if either changes.
 *
 * API: pass `href` when you have an authoritative URL (preferred), or
 * `pageName` when you only have the title. Passing both is fine — `href`
 * is used for the link target, `pageName` provides aria-label context.
 * If neither is provided, the component renders nothing.
 */
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
          // Modified clicks keep native behavior — the user explicitly
          // wants a separate tab/window.
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
