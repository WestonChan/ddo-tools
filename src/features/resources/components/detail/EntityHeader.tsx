import { useEffect, useRef, useState, type JSX } from 'react'
import { Check, Flag, Link as LinkIcon } from 'lucide-react'
import { TooltipWrapper, WikiLinkIcon } from '../../../../components'
import { useDetailNav } from '../../contexts/DetailNavContext'
import { DETAIL_TITLE_ID } from '../../types'
import { KeyValueGrid, type KvItem } from './KeyValueGrid'

interface EntityHeaderProps {
  name: string
  attributes: KvItem[]
  wikiUrl?: string | null
  wikiPageName?: string | null
}

const COPY_FEEDBACK_MS = 1500

export function EntityHeader({
  name,
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
    } catch {}
  }

  return (
    <header className="resources-entity-header">
      <div className="resources-entity-title-row">
        <h2
          id={DETAIL_TITLE_ID}
          className="resources-entity-name"
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
