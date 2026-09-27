import { beforeEach, describe, expect, it } from 'vitest'
import { ACCENT_PRESETS, applyAccent, resolveActiveAccent, restoreAccent } from './accent'

function readAccent(): string {
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
      expect(preset.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('has unique names and unique accents', () => {
    expect(new Set(ACCENT_PRESETS.map((t) => t.name)).size).toBe(ACCENT_PRESETS.length)
    expect(new Set(ACCENT_PRESETS.map((t) => t.accent)).size).toBe(ACCENT_PRESETS.length)
  })
})

describe('applyAccent', () => {
  it('writes both the --accent custom property and localStorage', () => {
    applyAccent('#123456')
    expect(readAccent()).toBe('#123456')
    expect(localStorage.getItem('accent')).toBe('#123456')
  })
})

describe('accent round-trip', () => {
  it('reads back and restores exactly what applyAccent stored', () => {
    applyAccent(ACCENT_PRESETS[4].accent)
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[4].accent)

    document.documentElement.removeAttribute('style')
    restoreAccent()
    expect(readAccent()).toBe(ACCENT_PRESETS[4].accent)
  })
})

describe('restoreAccent', () => {
  it('reads the accent field out of the legacy {accent, hover} JSON format', () => {
    localStorage.setItem(
      'accent',
      JSON.stringify({ accent: ACCENT_PRESETS[6].accent, hover: '#fedcba' }),
    )
    restoreAccent()
    expect(readAccent()).toBe(ACCENT_PRESETS[6].accent)
  })

  it('applies a plain hex string stored in the current format', () => {
    localStorage.setItem('accent', ACCENT_PRESETS[3].accent)
    restoreAccent()
    expect(readAccent()).toBe(ACCENT_PRESETS[3].accent)
  })

  it('falls back to the first theme when nothing is stored', () => {
    restoreAccent()
    expect(readAccent()).toBe(ACCENT_PRESETS[0].accent)
  })

  it('falls back to the first theme without throwing when the stored JSON is malformed', () => {
    localStorage.setItem('accent', '{"accent": ')
    expect(() => restoreAccent()).not.toThrow()
    expect(readAccent()).toBe(ACCENT_PRESETS[0].accent)
  })

  it('falls back to the first theme when the stored JSON has no accent key', () => {
    localStorage.setItem('accent', JSON.stringify({ hover: '#fedcba' }))
    restoreAccent()
    expect(readAccent()).toBe(ACCENT_PRESETS[0].accent)
  })
})

describe('resolveActiveAccent', () => {
  it('returns a plain hex string stored in the current format', () => {
    localStorage.setItem('accent', ACCENT_PRESETS[3].accent)
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[3].accent)
  })

  it('returns the accent field out of the legacy {accent, hover} JSON format', () => {
    localStorage.setItem(
      'accent',
      JSON.stringify({ accent: ACCENT_PRESETS[6].accent, hover: '#fedcba' }),
    )
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[6].accent)
  })

  it('returns the first theme when nothing is stored', () => {
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[0].accent)
  })

  it('returns the first theme when the stored JSON is malformed', () => {
    localStorage.setItem('accent', '{"accent": ')
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[0].accent)
  })

  it('returns the first theme when the stored JSON has no accent key', () => {
    localStorage.setItem('accent', JSON.stringify({ hover: '#fedcba' }))
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[0].accent)
  })

  it('returns the first theme when the stored accent is not one of the presets', () => {
    localStorage.setItem('accent', JSON.stringify({ accent: '#d4af37', hover: '#e5c158' }))
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[0].accent)
  })

  it('matches a preset case-insensitively and returns the canonical casing', () => {
    localStorage.setItem('accent', ACCENT_PRESETS[1].accent.toUpperCase())
    expect(resolveActiveAccent()).toBe(ACCENT_PRESETS[1].accent)
  })

  it('agrees with what restoreAccent applies in every case', () => {
    for (const stored of [
      null,
      ACCENT_PRESETS[3].accent,
      '{"accent": ',
      JSON.stringify({ hover: '#abc' }),
      JSON.stringify({ accent: '#d4af37', hover: '#e5c158' }),
    ]) {
      localStorage.clear()
      if (stored !== null) localStorage.setItem('accent', stored)
      document.documentElement.removeAttribute('style')
      restoreAccent()
      expect(readAccent()).toBe(resolveActiveAccent())
    }
  })
})
