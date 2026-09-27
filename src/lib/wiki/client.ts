
export const WIKI_ORIGIN = 'https://ddowiki.com'

export const WIKI_PAGE_BASE = `${WIKI_ORIGIN}/page`

export const WIKI_COMPARE_WINDOW = 'ddowiki-compare'

export function buildWikiPageUrl(pageName: string): string {
  return `${WIKI_PAGE_BASE}/${encodeURIComponent(pageName.replace(/ /g, '_'))}`
}

export function openCompareWindow(url: string): void {
  const width = Math.min(1000, Math.floor(window.screen.availWidth / 2))
  const height = window.screen.availHeight
  const win = window.open(
    url,
    WIKI_COMPARE_WINDOW,
    `popup=yes,width=${width},height=${height},left=0,top=0`,
  )
  win?.focus()
}
