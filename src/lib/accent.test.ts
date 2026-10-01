import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCENT_PRESETS,
  ACCENT_RAMP_STEPS,
  accentPresetNamed,
  applyAccent,
  saveAccent,
  activeAccent,
  restoreAccent,
  persistNormalizedAccent,
} from './accent'
import { runPrePaintScript } from '../test/runPrePaintScript'

const LEGACY_PRESET_HEXES = [
  '#c8a24a',
  '#b8962e',
  '#ef4444',
  '#6ee7b7',
  '#f97066',
  '#67e8f9',
  '#eab308',
  '#a855f7',
  '#d6c5a3',
  '#7ba3b8',
]

function appliedProperty(propertyName: string): string {
  return document.documentElement.style.getPropertyValue(propertyName)
}

function presetRamp(presetName: string): Record<number, string> {
  const preset = accentPresetNamed(presetName)
  if (!preset) throw new Error(`No accent preset named ${presetName}`)
  return preset.ramp
}

beforeEach(() => {
  document.documentElement.removeAttribute('style')
  localStorage.clear()
})

describe('ACCENT_PRESETS', () => {
  it('offers the five named ramps from the design, Gold first', () => {
    expect(ACCENT_PRESETS.map((preset) => preset.name)).toEqual([
      'Gold',
      'Arcane',
      'Moss',
      'Rust',
      'Violet',
    ])
  })

  it('gives every preset a hex for each ramp step', () => {
    for (const preset of ACCENT_PRESETS) {
      expect(Object.keys(preset.ramp).map(Number)).toEqual([...ACCENT_RAMP_STEPS])
      for (const step of ACCENT_RAMP_STEPS) expect(preset.ramp[step]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('keeps the design system gold as the Gold 400 step', () => {
    expect(presetRamp('Gold')).toEqual({
      200: '#e8d29c',
      300: '#d9b967',
      400: '#c8a24a',
      500: '#a8863a',
      600: '#836828',
      700: '#5f4b1d',
    })
  })
})

describe('accentPresetNamed', () => {
  it('finds a preset by its name', () => {
    expect(accentPresetNamed('Arcane')?.ramp[400]).toBe('#4c7db8')
  })

  it('finds nothing for a name that is not a preset', () => {
    expect(accentPresetNamed('Crimson')).toBeUndefined()
    expect(accentPresetNamed('constructor')).toBeUndefined()
  })
})

describe('applyAccent', () => {
  it('sets every ramp step and --accent to the preset 400 step without touching storage', () => {
    applyAccent('Arcane')

    for (const step of ACCENT_RAMP_STEPS) {
      expect(appliedProperty(`--gold-${step}`)).toBe(presetRamp('Arcane')[step])
    }
    expect(appliedProperty('--accent')).toBe('#4c7db8')
    expect(localStorage.getItem('accent')).toBeNull()
  })
})

describe('saveAccent', () => {
  it('writes the preset name without applying it', () => {
    saveAccent('Moss')
    expect(localStorage.getItem('accent')).toBe('Moss')
    expect(appliedProperty('--accent')).toBe('')
  })
})

describe('activeAccent', () => {
  it('reads back a stored preset name', () => {
    saveAccent('Rust')
    expect(activeAccent()).toBe('Rust')
  })

  it('is Gold when nothing is stored', () => {
    expect(activeAccent()).toBe('Gold')
  })

  it('resolves every legacy preset hex to Gold', () => {
    for (const legacyHex of LEGACY_PRESET_HEXES) {
      localStorage.setItem('accent', legacyHex)
      expect(activeAccent()).toBe('Gold')
    }
  })

  it('resolves a legacy hex equal to another preset 400 step to that preset, in any casing', () => {
    localStorage.setItem('accent', '#8B6CB5')
    expect(activeAccent()).toBe('Violet')
  })

  it('resolves the legacy {accent, hover} JSON through its accent hex', () => {
    localStorage.setItem('accent', JSON.stringify({ accent: '#a855f7', hover: '#fedcba' }))
    expect(activeAccent()).toBe('Gold')

    localStorage.setItem('accent', JSON.stringify({ accent: '#5b9a63', hover: '#fedcba' }))
    expect(activeAccent()).toBe('Moss')
  })

  it('is Gold when the stored entry is unusable', () => {
    for (const storedText of [
      '{"accent": ',
      JSON.stringify({ hover: '#fedcba' }),
      'Crimson',
      '__proto__',
      '',
    ]) {
      localStorage.setItem('accent', storedText)
      expect(activeAccent()).toBe('Gold')
    }
  })
})

describe('restoreAccent', () => {
  it('applies the ramp of the stored preset', () => {
    saveAccent('Violet')
    restoreAccent()
    expect(appliedProperty('--accent')).toBe('#8b6cb5')
    expect(appliedProperty('--gold-700')).toBe('#3f2e58')
  })

  it('applies Gold for a legacy hex without rewriting what is stored', () => {
    localStorage.setItem('accent', '#b8962e')

    restoreAccent()

    expect(appliedProperty('--accent')).toBe('#c8a24a')
    expect(localStorage.getItem('accent')).toBe('#b8962e')
  })
})

describe('persistNormalizedAccent', () => {
  it('stores the resolved preset name in place of a legacy value without applying it', () => {
    localStorage.setItem('accent', '#ef4444')

    persistNormalizedAccent()

    expect(localStorage.getItem('accent')).toBe('Gold')
    expect(appliedProperty('--accent')).toBe('')
  })

  it('rewrites the legacy JSON as the name of the preset it resolves to', () => {
    localStorage.setItem('accent', JSON.stringify({ accent: '#c05348', hover: '#abc' }))

    persistNormalizedAccent()

    expect(localStorage.getItem('accent')).toBe('Rust')
  })

  it('does not throw when storage refuses the write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    expect(() => persistNormalizedAccent()).not.toThrow()

    setItem.mockRestore()
  })
})

describe('index.html pre-paint script', () => {
  it('applies the same ramp as restoreAccent for every stored accent', () => {
    for (const storedText of [
      null,
      'Arcane',
      'Violet',
      '#b8962e',
      '#ef4444',
      '#5B9A63',
      JSON.stringify({ accent: '#c05348', hover: '#abc' }),
      JSON.stringify({ accent: '#a855f7', hover: '#abc' }),
      '{"accent": ',
      'constructor',
    ]) {
      localStorage.clear()
      if (storedText !== null) localStorage.setItem('accent', storedText)

      document.documentElement.removeAttribute('style')
      restoreAccent()
      const restoredStyle = document.documentElement.getAttribute('style')

      document.documentElement.removeAttribute('style')
      runPrePaintScript()
      const prePaintedStyle = document.documentElement.getAttribute('style')

      expect(prePaintedStyle, `stored ${storedText}`).toBe(restoredStyle)
    }
  })
})
