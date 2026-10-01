export const ACCENT_RAMP_STEPS = [200, 300, 400, 500, 600, 700] as const

type AccentRampStep = (typeof ACCENT_RAMP_STEPS)[number]

export interface AccentPreset {
  name: string
  ramp: Record<AccentRampStep, string>
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  {
    name: 'Gold',
    ramp: {
      200: '#e8d29c',
      300: '#d9b967',
      400: '#c8a24a',
      500: '#a8863a',
      600: '#836828',
      700: '#5f4b1d',
    },
  },
  {
    name: 'Arcane',
    ramp: {
      200: '#a9c4e2',
      300: '#6f9bcb',
      400: '#4c7db8',
      500: '#3a6396',
      600: '#2a4a72',
      700: '#1f3654',
    },
  },
  {
    name: 'Moss',
    ramp: {
      200: '#b9d7bb',
      300: '#86bb8c',
      400: '#5b9a63',
      500: '#4e8b5a',
      600: '#37653f',
      700: '#284a2e',
    },
  },
  {
    name: 'Rust',
    ramp: {
      200: '#eab3ab',
      300: '#d9837a',
      400: '#c05348',
      500: '#a8423a',
      600: '#7c2e28',
      700: '#5a211d',
    },
  },
  {
    name: 'Violet',
    ramp: {
      200: '#cdbde3',
      300: '#a98fcf',
      400: '#8b6cb5',
      500: '#73549c',
      600: '#574079',
      700: '#3f2e58',
    },
  },
]

const DEFAULT_ACCENT_PRESET = ACCENT_PRESETS[0]

const ACCENT_STORAGE_KEY = 'accent'

export function accentPresetNamed(presetName: string): AccentPreset | undefined {
  return ACCENT_PRESETS.find((preset) => preset.name === presetName)
}

function accentPresetWithBaseColor(legacyHex: string): AccentPreset | undefined {
  const lowercaseHex = legacyHex.toLowerCase()
  return ACCENT_PRESETS.find((preset) => preset.ramp[400] === lowercaseHex)
}

function legacyJsonAccentHex(storedText: string): string | null {
  try {
    const { accent } = JSON.parse(storedText) as { accent?: unknown }
    return typeof accent === 'string' ? accent : null
  } catch {
    return null
  }
}

function accentPresetFromStoredText(storedText: string | null): AccentPreset {
  if (!storedText) return DEFAULT_ACCENT_PRESET
  const namedPreset = accentPresetNamed(storedText)
  if (namedPreset) return namedPreset
  const legacyHex = storedText.startsWith('{') ? legacyJsonAccentHex(storedText) : storedText
  return (legacyHex && accentPresetWithBaseColor(legacyHex)) || DEFAULT_ACCENT_PRESET
}

function storedAccentText(): string | null {
  try {
    return localStorage.getItem(ACCENT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function applyAccent(presetName: string): void {
  const preset = accentPresetNamed(presetName) ?? DEFAULT_ACCENT_PRESET
  const rootStyle = document.documentElement.style
  for (const step of ACCENT_RAMP_STEPS) rootStyle.setProperty(`--gold-${step}`, preset.ramp[step])
  rootStyle.setProperty('--accent', preset.ramp[400])
}

export function saveAccent(presetName: string): void {
  localStorage.setItem(ACCENT_STORAGE_KEY, presetName)
}

export function activeAccent(): string {
  return accentPresetFromStoredText(storedAccentText()).name
}

export function restoreAccent(): void {
  applyAccent(activeAccent())
}

export function persistNormalizedAccent(): void {
  try {
    saveAccent(activeAccent())
  } catch {
    return
  }
}
