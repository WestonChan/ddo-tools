import { useEffect, useRef, useState, type JSX } from 'react'
import { Check, Flag, Link as LinkIcon, Link2Off } from 'lucide-react'
import { HintAnchor, WikiLinkIcon } from '../../../../components'
import { githubIssueUrls } from '../../../../lib/githubIssue'
import { useDetailNavigation } from '../../contexts/DetailNavigationContext'

const COPY_FEEDBACK_MS = 1500

export function ItemHeaderActions({
  name,
  wikiUrl,
  wikiPageName,
}: {
  name: string
  wikiUrl?: string | null
  wikiPageName?: string | null
}): JSX.Element {
  const { deepLinkUrl } = useDetailNavigation()
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
      copiedResetTimeoutRef.current = window.setTimeout(
        () => setIsLinkCopied(false),
        COPY_FEEDBACK_MS,
      )
    } catch {}
  }

  return (
    <>
      <HintAnchor text="Linked wiki window arrives with Phase 4g">
        <button type="button" className="resources-wiki-chip" aria-pressed={false} disabled>
          <Link2Off size={13} aria-hidden />
          Link wiki
        </button>
      </HintAnchor>
      <HintAnchor text={isLinkCopied ? 'Copied!' : 'Copy link to this item'}>
        <button
          type="button"
          className="resources-icon-button"
          onClick={copyDeepLink}
          disabled={!deepLinkUrl}
          aria-label={isLinkCopied ? 'Link copied' : 'Copy link to this item'}
        >
          {isLinkCopied ? <Check size={14} /> : <LinkIcon size={14} />}
        </button>
      </HintAnchor>
      <WikiLinkIcon
        href={wikiUrl ?? undefined}
        pageName={wikiPageName ?? undefined}
        icon="external"
        className="resources-wiki-external"
        size={14}
      />
      <HintAnchor text="Report a mismatch">
        <a
          className="resources-icon-button"
          href={githubIssueUrls(undefined, [], `Item data mismatch: ${name}`).newIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Report a mismatch between our parsed data and the wiki"
        >
          <Flag size={14} />
        </a>
      </HintAnchor>
    </>
  )
}
