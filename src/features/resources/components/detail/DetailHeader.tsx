import { useEffect, useRef, useState, type JSX } from 'react'
import { Check, Flag, Link as LinkIcon, Link2Off } from 'lucide-react'
import { DetailCardHeader, HintAnchor, WikiLinkIcon } from '../../../../components'
import { githubIssueUrls } from '../../../../lib/githubIssue'
import { useDetailNavigation } from '../../contexts/DetailNavigationContext'
import { DETAIL_TITLE_ID } from '../../resourceCategories'

const COPY_FEEDBACK_MS = 1500

export function DetailHeader({
  name,
  kicker = '',
  wikiUrl,
  wikiPageName,
  isLegacy = false,
  isCraftable = false,
  variant = 'drawer',
}: {
  name: string
  kicker?: string
  wikiUrl?: string | null
  wikiPageName?: string | null
  isLegacy?: boolean
  isCraftable?: boolean
  variant?: 'drawer' | 'hover'
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
    <DetailCardHeader
      kicker={kicker}
      name={name}
      titleId={variant === 'drawer' ? DETAIL_TITLE_ID : undefined}
      badges={
        <>
          {isLegacy && (
            <span className="resources-chip" data-kind="legacy">
              Legacy
            </span>
          )}
          {isCraftable && (
            <span className="resources-chip" data-kind="craftable">
              Craftable
            </span>
          )}
        </>
      }
      actions={
        variant === 'drawer' && (
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
    />
  )
}
