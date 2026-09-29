import type { SentryEventReference } from './sentry'

export const REPOSITORY_URL = 'https://github.com/WestonChan/ddo-tools'

export interface IssueUrls {
  searchUrl: string
  newIssueUrl: string
}

export function urlWithoutQueryOrFragment(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.origin + parsedUrl.pathname
  } catch {
    return url.split(/[?#]/, 1)[0] ?? url
  }
}

const USER_REPORT_BODY_TEMPLATE = `**Describe the bug**
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

export function githubIssueUrls(
  error?: Error,
  labels?: string | string[],
  preferredTitle?: string,
  sentryEventReference?: SentryEventReference,
): IssueUrls {
  const issueLabels = toLabelList(labels)
  const labelsQueryParameter = issueLabels.length
    ? `labels=${issueLabels.map(encodeURIComponent).join(',')}&`
    : ''
  const labelSearchTerms = issueLabels.length
    ? '+' + issueLabels.map((l) => encodeURIComponent(`label:${l}`)).join('+')
    : ''
  const searchUrl = `${REPOSITORY_URL}/issues?q=is%3Aopen${labelSearchTerms}`

  const title = issueTitle(error, preferredTitle)
  const body = issueBody(error, sentryEventReference)

  const newIssueUrl =
    `${REPOSITORY_URL}/issues/new?${labelsQueryParameter}` +
    `title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`

  return { searchUrl, newIssueUrl }
}

function toLabelList(labels: string | string[] | undefined): string[] {
  if (!labels) return []
  if (Array.isArray(labels)) return labels.filter(Boolean)
  return [labels]
}

function issueTitle(error: Error | undefined, preferredTitle: string | undefined): string {
  const trimmedPreferredTitle = preferredTitle?.trim()
  if (trimmedPreferredTitle) return trimmedPreferredTitle
  if (!error) return 'User report'
  const trimmedMessage = (error.message ?? '').trim()
  if (!trimmedMessage) return 'Untitled error'
  const firstClause = trimmedMessage.split(/[—:]/, 1)[0]?.trim()
  if (!firstClause) return 'Untitled error'
  return firstClause
}

function issueBody(
  error: Error | undefined,
  sentryEventReference: SentryEventReference | undefined,
): string {
  const bodySections: string[] = []

  if (error) {
    bodySections.push(`**Error:** ${error.message || 'Untitled error'}`)
    if (error.stack) {
      bodySections.push('**Stack trace:**\n```\n' + error.stack + '\n```')
    }
  } else {
    bodySections.push(USER_REPORT_BODY_TEMPLATE)
  }

  if (typeof window !== 'undefined') {
    bodySections.push(`**URL:** ${urlWithoutQueryOrFragment(window.location.href)}`)
    if (typeof window.navigator !== 'undefined') {
      bodySections.push(`**Browser:** ${window.navigator.userAgent}`)
    }
  }

  if (sentryEventReference?.eventId) {
    bodySections.push(`**Sentry event:** \`${sentryEventReference.eventId}\``)
  }
  if (sentryEventReference?.replayUrl) {
    bodySections.push(`**Replay:** ${sentryEventReference.replayUrl}`)
  }

  return bodySections.join('\n\n')
}
