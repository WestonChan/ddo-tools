// URL + navigation helpers for the DDO Wiki at ddowiki.com. Hardcoded base
// URL — no env override (would be a redirect-injection surface).
//
// ── Why this module no longer fetches anything ──────────────────────────
// As of July 2026, ddowiki.com fronts its entire origin (api.php included)
// with AWS WAF Bot Control's JavaScript challenge. Ungated clients get
// `HTTP 202`, an empty body, and `x-amzn-waf-action: challenge`. The
// clearance token binds to the top-level browsing context, so:
//   - iframes can never clear it (verified: plain, `credentialless`, and
//     post-clearance frames all fail with "Max challenge attempts exceeded"),
//   - cross-origin fetch to api.php is always challenged (no cookies are
//     sent cross-site, and `access-control-allow-origin: *` forbids
//     credentialed requests),
//   - only top-level navigation passes.
// Full write-up: docs/ddowiki-api.md. Hence: we only build URLs and open
// top-level windows. The old health-check ping and `WikiError` taxonomy
// died with the embedded preview — see git history if the API is ever
// exempted from the challenge and content fetching comes back.

/** Canonical origin of the DDO Wiki. Single source of truth for any code
 *  that builds a wiki URL. */
export const WIKI_ORIGIN = 'https://ddowiki.com'

/** Base path for wiki page URLs. Prefer `buildWikiPageUrl` over appending
 *  slugs by hand. */
export const WIKI_PAGE_BASE = `${WIKI_ORIGIN}/page`

/** Shared browsing-context name for the wiki compare window. Every wiki
 *  link targets this name, so clicks re-navigate one window instead of
 *  stacking tabs. */
export const WIKI_COMPARE_WINDOW = 'ddowiki-compare'

/** Build a wiki page URL from a page name: spaces become underscores, the
 *  rest is percent-encoded (`Item:Foo` → `.../page/Item%3AFoo`). */
export function buildWikiPageUrl(pageName: string): string {
  return `${WIKI_PAGE_BASE}/${encodeURIComponent(pageName.replace(/ /g, '_'))}`
}

/**
 * Open `url` in the shared wiki compare window — a standalone popup sized
 * to the left half of the screen, so the app and the wiki sit side by
 * side and every wiki click updates the same window (the QA workflow the
 * old embedded preview served, minus the embedding the WAF now blocks).
 *
 * `window.open` features apply only at creation; later calls with the same
 * name just re-navigate, so a user's manual re-arrangement sticks.
 * `focus()` asks the browser to raise the window on re-navigation — some
 * platforms decline (focus-stealing policy), which is fine.
 */
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
