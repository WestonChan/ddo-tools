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

export function resolveActiveAccent(): string {
  const stored = readStoredAccent()?.toLowerCase()
  return ACCENT_PRESETS.find((p) => p.accent.toLowerCase() === stored)?.accent
    ?? ACCENT_PRESETS[0].accent
}

export function restoreAccent(): void {
  document.documentElement.style.setProperty('--accent', resolveActiveAccent())
}
