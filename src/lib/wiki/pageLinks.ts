export const WIKI_ORIGIN = 'https://ddowiki.com'

export const WIKI_PAGE_BASE_URL = `${WIKI_ORIGIN}/page`

export const WIKI_COMPARE_WINDOW_NAME = 'ddowiki-compare'

export function wikiPageUrlFor(pageName: string): string {
  return `${WIKI_PAGE_BASE_URL}/${encodeURIComponent(pageName.replace(/ /g, '_'))}`
}

export function openWikiCompareWindow(url: string): void {
  const widthPixels = Math.min(1000, Math.floor(window.screen.availWidth / 2))
  const heightPixels = window.screen.availHeight
  const compareWindow = window.open(
    url,
    WIKI_COMPARE_WINDOW_NAME,
    `popup=yes,width=${widthPixels},height=${heightPixels},left=0,top=0`,
  )
  compareWindow?.focus()
}
