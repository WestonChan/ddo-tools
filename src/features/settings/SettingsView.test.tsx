import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsView } from './SettingsView'
import { ACCENT_PRESETS } from '../../lib/accent'

beforeEach(() => {
  document.documentElement.removeAttribute('style')
  localStorage.clear()
})

function swatch(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${name}$`) })
}

function selectedSwatchNames(): string[] {
  return ACCENT_PRESETS.filter((p) => swatch(p.name).classList.contains('selected')).map(
    (p) => p.name,
  )
}

function expectSelectionMatchesAppliedAccent(): void {
  const applied = document.documentElement.style.getPropertyValue('--accent')
  const selected = selectedSwatchNames()
  expect(selected).toHaveLength(1)
  expect(ACCENT_PRESETS.find((p) => p.name === selected[0])?.accent).toBe(applied)
}

describe('SettingsView accent swatches', () => {
  it('marks the stored accent as selected across a reload', () => {
    localStorage.setItem('accent', ACCENT_PRESETS[1].accent)
    render(<SettingsView />)
    expect(swatch(ACCENT_PRESETS[1].name)).toHaveClass('selected')
    expect(swatch(ACCENT_PRESETS[0].name)).not.toHaveClass('selected')
  })

  it('marks the stored accent as selected when it is in the legacy JSON format', () => {
    localStorage.setItem(
      'accent',
      JSON.stringify({ accent: ACCENT_PRESETS[2].accent, hover: '#000000' }),
    )
    render(<SettingsView />)
    expect(swatch(ACCENT_PRESETS[2].name)).toHaveClass('selected')
  })

  it('marks the default accent as selected when nothing is stored', () => {
    render(<SettingsView />)
    expect(swatch(ACCENT_PRESETS[0].name)).toHaveClass('selected')
  })

  it('marks the default accent as selected when the stored entry is unusable', () => {
    localStorage.setItem('accent', '{"accent": ')
    render(<SettingsView />)
    expect(swatch(ACCENT_PRESETS[0].name)).toHaveClass('selected')
  })

  it('survives a reload of an accent written by the real click path', () => {
    const { unmount } = render(<SettingsView />)
    fireEvent.click(swatch(ACCENT_PRESETS[3].name))
    unmount()

    document.documentElement.removeAttribute('style')
    render(<SettingsView />)
    expect(swatch(ACCENT_PRESETS[3].name)).toHaveClass('selected')
    expectSelectionMatchesAppliedAccent()
  })

  it('falls back to the default when the stored accent is not one of the presets', () => {
    localStorage.setItem('accent', JSON.stringify({ accent: '#d4af37', hover: '#e5c158' }))
    render(<SettingsView />)
    expect(swatch(ACCENT_PRESETS[0].name)).toHaveClass('selected')
    expectSelectionMatchesAppliedAccent()
  })

  it('always applies an accent that one swatch reports as selected', () => {
    for (const stored of [
      null,
      ACCENT_PRESETS[2].accent,
      '{"accent": ',
      JSON.stringify({ hover: '#fedcba' }),
      JSON.stringify({ accent: '#d4af37', hover: '#e5c158' }),
      '#not-a-color',
    ]) {
      localStorage.clear()
      if (stored !== null) localStorage.setItem('accent', stored)
      document.documentElement.removeAttribute('style')
      const { unmount } = render(<SettingsView />)
      expectSelectionMatchesAppliedAccent()
      unmount()
    }
  })
})
