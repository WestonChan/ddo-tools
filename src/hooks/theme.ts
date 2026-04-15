export const THEMES = [
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

export function applyAccent(accent: string) {
  document.documentElement.style.setProperty('--accent', accent)
  localStorage.setItem('accent', accent)
}

export function restoreAccent() {
  try {
    const stored = localStorage.getItem('accent')
    if (!stored) {
      // No stored preference — apply the default theme so the CSS :root
      // values don't need to be kept in sync with THEMES manually.
      document.documentElement.style.setProperty('--accent', THEMES[0].accent)
      return
    }
    // Handle both old format ({accent, hover}) and new format (plain string)
    if (stored.startsWith('{')) {
      const { accent } = JSON.parse(stored)
      if (accent) {
        document.documentElement.style.setProperty('--accent', accent)
      }
    } else {
      document.documentElement.style.setProperty('--accent', stored)
    }
  } catch {
    // ignore malformed data
  }
}
