import { beforeEach, describe, expect, it } from 'vitest'
import { ACCENT_PRESETS, applyAccent, saveAccent, activeAccent, restoreAccent } from './accent'

function appliedAccent(): string {
  return document.documentElement.style.getPropertyValue('--accent')
}

beforeEach(() => {
  document.documentElement.removeAttribute('style')
  localStorage.clear()
})

describe('ACCENT_PRESETS', () => {
  it('is non-empty and every entry has a name and an accent', () => {
    expect(ACCENT_PRESETS.length).toBeGreaterThan(0)
    for (const preset of ACCENT_PRESETS) {
      expect(preset.name).toBeTruthy()
      expect(preset.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('has unique names and unique accents', () => {
    expect(new Set(ACCENT_PRESETS.map((t) => t.name)).size).toBe(ACCENT_PRESETS.length)
    expect(new Set(ACCENT_PRESETS.map((t) => t.color)).size).toBe(ACCENT_PRESETS.length)
  })
})

describe('applyAccent', () => {
  it('sets the --accent custom property without touching localStorage', () => {
    applyAccent('#123456')
    expect(appliedAccent()).toBe('#123456')
    expect(localStorage.getItem('accent')).toBeNull()
  })
})

describe('saveAccent', () => {
  it('writes the accent to localStorage without applying it', () => {
    saveAccent('#123456')
    expect(localStorage.getItem('accent')).toBe('#123456')
    expect(appliedAccent()).toBe('')
  })
})

describe('accent round-trip', () => {
  it('reads back and restores exactly what saveAccent stored', () => {
    saveAccent(ACCENT_PRESETS[4].color)
    expect(activeAccent()).toBe(ACCENT_PRESETS[4].color)

    document.documentElement.removeAttribute('style')
    restoreAccent()
    expect(appliedAccent()).toBe(ACCENT_PRESETS[4].color)
  })
})

describe('restoreAccent', () => {
  it('reads the accent field out of the legacy {accent, hover} JSON format', () => {
    localStorage.setItem(
      'accent',
      JSON.stringify({ accent: ACCENT_PRESETS[6].color, hover: '#fedcba' }),
    )
    restoreAccent()
    expect(appliedAccent()).toBe(ACCENT_PRESETS[6].color)
  })

  it('applies a plain hex string stored in the current format', () => {
    localStorage.setItem('accent', ACCENT_PRESETS[3].color)
    restoreAccent()
    expect(appliedAccent()).toBe(ACCENT_PRESETS[3].color)
  })

  it('falls back to the first theme when nothing is stored', () => {
    restoreAccent()
    expect(appliedAccent()).toBe(ACCENT_PRESETS[0].color)
  })

  it('falls back to the first theme without throwing when the stored JSON is malformed', () => {
    localStorage.setItem('accent', '{"accent": ')
    expect(() => restoreAccent()).not.toThrow()
    expect(appliedAccent()).toBe(ACCENT_PRESETS[0].color)
  })

  it('falls back to the first theme when the stored JSON has no accent key', () => {
    localStorage.setItem('accent', JSON.stringify({ hover: '#fedcba' }))
    restoreAccent()
    expect(appliedAccent()).toBe(ACCENT_PRESETS[0].color)
  })
})

describe('activeAccent', () => {
  it('returns a plain hex string stored in the current format', () => {
    localStorage.setItem('accent', ACCENT_PRESETS[3].color)
    expect(activeAccent()).toBe(ACCENT_PRESETS[3].color)
  })

  it('returns the accent field out of the legacy {accent, hover} JSON format', () => {
    localStorage.setItem(
      'accent',
      JSON.stringify({ accent: ACCENT_PRESETS[6].color, hover: '#fedcba' }),
    )
    expect(activeAccent()).toBe(ACCENT_PRESETS[6].color)
  })

  it('returns the first theme when nothing is stored', () => {
    expect(activeAccent()).toBe(ACCENT_PRESETS[0].color)
  })

  it('returns the first theme when the stored JSON is malformed', () => {
    localStorage.setItem('accent', '{"accent": ')
    expect(activeAccent()).toBe(ACCENT_PRESETS[0].color)
  })

  it('returns the first theme when the stored JSON has no accent key', () => {
    localStorage.setItem('accent', JSON.stringify({ hover: '#fedcba' }))
    expect(activeAccent()).toBe(ACCENT_PRESETS[0].color)
  })

  it('returns the first theme when the stored accent is not one of the presets', () => {
    localStorage.setItem('accent', JSON.stringify({ accent: '#d4af37', hover: '#e5c158' }))
    expect(activeAccent()).toBe(ACCENT_PRESETS[0].color)
  })

  it('matches a preset case-insensitively and returns the canonical casing', () => {
    localStorage.setItem('accent', ACCENT_PRESETS[1].color.toUpperCase())
    expect(activeAccent()).toBe(ACCENT_PRESETS[1].color)
  })

  it('agrees with what restoreAccent applies in every case', () => {
    for (const storedText of [
      null,
      ACCENT_PRESETS[3].color,
      '{"accent": ',
      JSON.stringify({ hover: '#abc' }),
      JSON.stringify({ accent: '#d4af37', hover: '#e5c158' }),
    ]) {
      localStorage.clear()
      if (storedText !== null) localStorage.setItem('accent', storedText)
      document.documentElement.removeAttribute('style')
      restoreAccent()
      expect(appliedAccent()).toBe(activeAccent())
    }
  })
})
