import { useEffect, useRef, useState, type JSX } from 'react'
import { Check, Flag, Link as LinkIcon, Link2Off } from 'lucide-react'
import { HoverTooltip, WikiLinkIcon } from '../../../../components'
import { useDetailDrawerNavigation } from '../../contexts/DetailDrawerNavigationContext'
import { DETAIL_DRAWER_TITLE_ID } from '../../resourceCategories'
import { KeyValueGrid, type KeyValuePair } from './KeyValueGrid'

interface DetailHeaderProps {
  name: string
  attributes: KeyValuePair[]
  wikiUrl?: string | null
  wikiPageName?: string | null
}

const COPY_FEEDBACK_MS = 1500

export function DetailHeader({
  name,
  attributes,
  wikiUrl,
  wikiPageName,
}: DetailHeaderProps): JSX.Element {
  const { deepLinkUrl } = useDetailDrawerNavigation()
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const copiedResetTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copiedResetTimeoutRef.current !== null) clearTimeout(copiedResetTimeoutRef.current)
    },
    [],
  )

  async function copyDeepLink(): Promise<void> {
    if (!deepLinkUrl) return
    try {
      await navigator.clipboard.writeText(deepLinkUrl)
      setIsLinkCopied(true)
      if (copiedResetTimeoutRef.current !== null) clearTimeout(copiedResetTimeoutRef.current)
      copiedResetTimeoutRef.current = window.setTimeout(() => {
        setIsLinkCopied(false)
        copiedResetTimeoutRef.current = null
      }, COPY_FEEDBACK_MS)
    } catch {}
  }

  return (
    <header className="resources-entity-header">
      <div className="resources-entity-title-row">
        <h2 id={DETAIL_DRAWER_TITLE_ID} className="resources-entity-name">
          {name}
        </h2>
        <div className="resources-entity-actions">
          <button
            type="button"
            className="resources-wiki-window-toggle"
            aria-pressed={false}
            disabled
            title="Linked wiki window arrives with Phase 4g"
          >
            <Link2Off size={13} aria-hidden />
            Link wiki
          </button>
          <HoverTooltip text={isLinkCopied ? 'Copied!' : 'Copy link to this item'}>
            <button
              type="button"
              className="resources-icon-button"
              onClick={copyDeepLink}
              disabled={!deepLinkUrl}
              aria-label={isLinkCopied ? 'Link copied' : 'Copy link to this item'}
            >
              {isLinkCopied ? <Check size={14} /> : <LinkIcon size={14} />}
            </button>
          </HoverTooltip>
          <WikiLinkIcon
            href={wikiUrl ?? undefined}
            pageName={wikiPageName ?? undefined}
            size={14}
          />
          <HoverTooltip text="Report mismatch — coming soon">
            <button
              type="button"
              className="resources-icon-button"
              disabled
              aria-label="Report a mismatch between our parsed data and the wiki"
            >
              <Flag size={14} />
            </button>
          </HoverTooltip>
        </div>
      </div>
      {attributes.length > 0 && <KeyValueGrid pairs={attributes} />}
    </header>
  )
}
