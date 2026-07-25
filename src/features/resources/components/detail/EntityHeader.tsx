import { useEffect, useRef, useState, type JSX } from 'react'
import { Check, Flag, Link as LinkIcon } from 'lucide-react'
import { TooltipWrapper, WikiLinkIcon } from '../../../../components'
import { useDetailNav } from '../../contexts/DetailNavContext'
import { DETAIL_TITLE_ID } from '../../types'
import { KeyValueGrid, type KvItem } from './KeyValueGrid'

interface EntityHeaderProps {
  name: string
  // Per-rarity tint on the title. Light/dark themes both adjust at runtime via
  // the `data-rarity` attribute → CSS variable lookup, so the component never
  // hardcodes hue.
  rarity?: string | null
  // Compact KV pairs (slot, ML, material, etc.) that sit under the name.
  attributes: KvItem[]
  // Authoritative wiki URL for the entity (e.g. `items.wiki_url`). Renders
  // the wiki compare-window icon in the title row when set. Optional so
  // categories without wiki coverage simply omit the icon.
  wikiUrl?: string | null
  // Wiki page name used to derive a URL when `wikiUrl` is absent, and to
  // give the icon's aria-label its destination name.
  wikiPageName?: string | null
}

const COPY_FEEDBACK_MS = 1500

// Primary header surface for any per-category detail component. Owns:
// - Title row: item name + copy-link, wiki compare-window, and report icons.
// - KV grid of attributes underneath.
// The "Back to <category>" link lives at the column root (rendered by
// ResourceDetailView) so every category gets it for free without each
// per-category detail wiring it up.
export function EntityHeader({
  name,
  rarity,
  attributes,
  wikiUrl,
  wikiPageName,
}: EntityHeaderProps): JSX.Element {
  const { deepLinkUrl } = useDetailNav()
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    },
    [],
  )

  async function handleCopy(): Promise<void> {
    if (!deepLinkUrl) return
    try {
      await navigator.clipboard.writeText(deepLinkUrl)
      setCopied(true)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => {
        setCopied(false)
        copyTimer.current = null
      }, COPY_FEEDBACK_MS)
    } catch {
      /* clipboard write may fail in older browsers / insecure contexts —
         silently no-op. */
    }
  }

  return (
    <header className="resources-entity-header">
      <div className="resources-entity-title-row">
        {/* `id` is the drawer's `aria-labelledby` target — see DETAIL_TITLE_ID. */}
        <h2
          id={DETAIL_TITLE_ID}
          className="resources-entity-name"
          data-rarity={rarity?.toLowerCase() ?? undefined}
        >
          {name}
        </h2>
        <TooltipWrapper text={copied ? 'Copied!' : 'Copy link to this item'}>
          <button
            type="button"
            className="resources-entity-copy hoverable"
            onClick={handleCopy}
            disabled={!deepLinkUrl}
            aria-label={copied ? 'Link copied' : 'Copy link to this item'}
          >
            {copied ? <Check size={14} /> : <LinkIcon size={14} />}
          </button>
        </TooltipWrapper>
        <WikiLinkIcon
          href={wikiUrl ?? undefined}
          pageName={wikiPageName ?? undefined}
          size={14}
        />
        <TooltipWrapper text="Report mismatch — coming soon">
          <button
            type="button"
            className="resources-entity-copy"
            disabled
            aria-label="Report a mismatch between our parsed data and the wiki"
          >
            <Flag size={14} />
          </button>
        </TooltipWrapper>
      </div>
      {attributes.length > 0 && <KeyValueGrid items={attributes} />}
    </header>
  )
}
