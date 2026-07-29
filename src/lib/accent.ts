export const ACCENT_PRESETS = [
  { name: 'Gold', accent: '#b8962e' },
  { name: 'Crimson', accent: '#ef4444' },
  { name: 'Mint', accent: '#6ee7b7' },
  { name: 'Coral', accent: '#f97066' },
  { name: 'Ice', accent: '#67e8f9' },
  { name: 'Marigold', accent: '#eab308' },
  { name: 'Plum', accent: '#a855f7' },
  { name: 'Sand', accent: '#d6c5a3' },
  { name: 'Sage', accent: '#7ba3b8' },
]

const STORAGE_KEY = 'accent'

/** The one place a raw `accent` entry is turned into a color. Handles both
 *  the current format (a plain string) and the legacy one ({accent, hover}
 *  JSON). Returns null when the entry is absent, empty, unparseable, or
 *  parses to an object with no `accent` key — callers decide what an
 *  unusable entry means for them. */
function parseStoredAccent(stored: string | null): string | null {
  if (!stored) return null
  if (!stored.startsWith('{')) return stored
  try {
    const { accent } = JSON.parse(stored) as { accent?: string }
    return accent ?? null
  } catch {
    return null
  }
}

/** Reads the persisted accent preference, or null when nothing usable is
 *  stored. Internal: `resolveActiveAccent` is the module's public reader, so
 *  no caller outside this file can see the raw null and invent its own
 *  fallback — which is the bug this pair replaced. */
function readStoredAccent(): string | null {
  try {
    return parseStoredAccent(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function applyAccent(accent: string): void {
  document.documentElement.style.setProperty('--accent', accent)
  localStorage.setItem(STORAGE_KEY, accent)
}

/** The accent actually in effect, and always one of `ACCENT_PRESETS` — the
 *  grid is the complete set of choices the UI offers, so a stored color
 *  outside it cannot be shown as selected and cannot be returned to once the
 *  user clicks away. Absent, unreadable, and off-palette entries therefore
 *  all resolve to the default: each is stale data rather than a preference a
 *  user could have expressed. Anything that needs to *display* the current
 *  accent must read it here, so what is applied and what is shown as selected
 *  cannot drift apart. */
export function resolveActiveAccent(): string {
  const stored = readStoredAccent()?.toLowerCase()
  // Match case-insensitively but return the preset's own casing, so callers
  // can compare against ACCENT_PRESETS by string equality.
  return ACCENT_PRESETS.find((p) => p.accent.toLowerCase() === stored)?.accent
    ?? ACCENT_PRESETS[0].accent
}

export function restoreAccent(): void {
  document.documentElement.style.setProperty('--accent', resolveActiveAccent())
}
