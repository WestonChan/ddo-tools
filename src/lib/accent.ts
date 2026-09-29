export const ACCENT_PRESETS = [
  { name: 'Gold', color: '#b8962e' },
  { name: 'Crimson', color: '#ef4444' },
  { name: 'Mint', color: '#6ee7b7' },
  { name: 'Coral', color: '#f97066' },
  { name: 'Ice', color: '#67e8f9' },
  { name: 'Marigold', color: '#eab308' },
  { name: 'Plum', color: '#a855f7' },
  { name: 'Sand', color: '#d6c5a3' },
  { name: 'Sage', color: '#7ba3b8' },
]

const ACCENT_STORAGE_KEY = 'accent'

function parseStoredAccent(storedText: string | null): string | null {
  if (!storedText) return null
  if (!storedText.startsWith('{')) return storedText
  try {
    const { accent } = JSON.parse(storedText) as { accent?: string }
    return accent ?? null
  } catch {
    return null
  }
}

function storedAccent(): string | null {
  try {
    return parseStoredAccent(localStorage.getItem(ACCENT_STORAGE_KEY))
  } catch {
    return null
  }
}

export function applyAccent(accent: string): void {
  document.documentElement.style.setProperty('--accent', accent)
}

export function saveAccent(accent: string): void {
  localStorage.setItem(ACCENT_STORAGE_KEY, accent)
}

export function activeAccent(): string {
  const lowercaseStoredAccent = storedAccent()?.toLowerCase()
  return (
    ACCENT_PRESETS.find((p) => p.color.toLowerCase() === lowercaseStoredAccent)?.color ??
    ACCENT_PRESETS[0].color
  )
}

export function restoreAccent(): void {
  applyAccent(activeAccent())
}
