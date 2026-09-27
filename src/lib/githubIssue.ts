export const REPO_URL = 'https://github.com/WestonChan/ddo-tools'

export interface SentryContext {
  eventId?: string
  replayUrl?: string
}

export interface IssueUrls {
  searchUrl: string
  newIssueUrl: string
}

export function sanitizeUrl(href: string): string {
  try {
    const url = new URL(href)
    return url.origin + url.pathname
  } catch {
    return href.split(/[?#]/, 1)[0] ?? href
  }
}

const USER_REPORT_TEMPLATE = `**Describe the bug**
A clear and concise description of what the bug is.

**To reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain.

**Additional context**
Anything else worth knowing.

---`

export function buildIssueUrls(
  error?: Error,
  labels?: string | string[],
  contextTitle?: string,
  sentryContext?: SentryContext,
): IssueUrls {
  const labelArray = normalizeLabels(labels)
  const labelQuery = labelArray.length
    ? `labels=${labelArray.map(encodeURIComponent).join(',')}&`
    : ''
  const labelSearch = labelArray.length
    ? '+' + labelArray.map((l) => encodeURIComponent(`label:${l}`)).join('+')
    : ''
  const searchUrl = `${REPO_URL}/issues?q=is%3Aopen${labelSearch}`

  const title = pickTitle(error, contextTitle)
  const body = buildBody(error, sentryContext)

  const newIssueUrl =
    `${REPO_URL}/issues/new?${labelQuery}` +
    `title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`

  return { searchUrl, newIssueUrl }
}

function normalizeLabels(labels: string | string[] | undefined): string[] {
  if (!labels) return []
  if (Array.isArray(labels)) return labels.filter(Boolean)
  return [labels]
}

function pickTitle(error: Error | undefined, contextTitle: string | undefined): string {
  const trimmedContext = contextTitle?.trim()
  if (trimmedContext) return trimmedContext
  if (!error) return 'User report'
  const msg = (error.message ?? '').trim()
  if (!msg) return 'Untitled error'
  const head = msg.split(/[—:]/, 1)[0]?.trim()
  if (!head) return 'Untitled error'
  return head
}

function buildBody(error: Error | undefined, sentryContext: SentryContext | undefined): string {
  const parts: string[] = []

  if (error) {
    parts.push(`**Error:** ${error.message || 'Untitled error'}`)
    if (error.stack) {
      parts.push('**Stack trace:**\n```\n' + error.stack + '\n```')
    }
  } else {
    parts.push(USER_REPORT_TEMPLATE)
  }

  if (typeof window !== 'undefined') {
    parts.push(`**URL:** ${sanitizeUrl(window.location.href)}`)
    if (typeof window.navigator !== 'undefined') {
      parts.push(`**Browser:** ${window.navigator.userAgent}`)
    }
  }

  if (sentryContext?.eventId) {
    parts.push(`**Sentry event:** \`${sentryContext.eventId}\``)
  }
  if (sentryContext?.replayUrl) {
    parts.push(`**Replay:** ${sentryContext.replayUrl}`)
  }

  return parts.join('\n\n')
}
