import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsView } from './SettingsView'
import { ACCENT_PRESETS, accentPresetNamed, restoreAccent } from '../../lib/accent'
import { resetThemeForTests } from '../../hooks/useTheme'
import { installMatchMedia, restoreMatchMedia } from '../../test/matchMediaStub'

beforeEach(() => {
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-theme')
  localStorage.clear()
  resetThemeForTests()
  installMatchMedia(false)
})

afterEach(() => {
  restoreMatchMedia()
})

function accentSwatch(presetName: string): HTMLElement {
  return screen.getByRole('button', { name: presetName })
}

function themeSegment(label: string): HTMLElement {
  return screen.getByRole('button', { name: label })
}

function pressedSwatchNames(): string[] {
  return ACCENT_PRESETS.filter(
    (preset) => accentSwatch(preset.name).getAttribute('aria-pressed') === 'true',
  ).map((preset) => preset.name)
}

function appliedAccent(): string {
  return document.documentElement.style.getPropertyValue('--accent')
}

describe('SettingsView appearance', () => {
  it('offers the five accent presets and marks Gold pressed by default', () => {
    restoreAccent()
    render(<SettingsView />)
    expect(pressedSwatchNames()).toEqual(['Gold'])
    expect(appliedAccent()).toBe('#c8a24a')
  })

  it('applies the picked preset ramp and marks only that swatch pressed', () => {
    render(<SettingsView />)

    fireEvent.click(accentSwatch('Arcane'))

    expect(appliedAccent()).toBe(accentPresetNamed('Arcane')?.ramp[400])
    expect(document.documentElement.style.getPropertyValue('--gold-300')).toBe('#6f9bcb')
    expect(pressedSwatchNames()).toEqual(['Arcane'])
  })

  it('keeps the picked preset selected across a reload', () => {
    const { unmount } = render(<SettingsView />)
    fireEvent.click(accentSwatch('Rust'))
    unmount()

    document.documentElement.removeAttribute('style')
    restoreAccent()
    render(<SettingsView />)

    expect(pressedSwatchNames()).toEqual(['Rust'])
    expect(appliedAccent()).toBe(accentPresetNamed('Rust')?.ramp[400])
  })

  it('shows a legacy stored hex as Gold', () => {
    localStorage.setItem('accent', '#ef4444')
    render(<SettingsView />)
    expect(pressedSwatchNames()).toEqual(['Gold'])
  })

  it('shows the OS sub-line only while System is the theme preference', () => {
    localStorage.setItem('theme', 'dark')
    render(<SettingsView />)
    expect(themeSegment('Dark')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Follows your OS setting')).not.toBeInTheDocument()

    fireEvent.click(themeSegment('System'))

    expect(themeSegment('System')).toHaveAttribute('aria-pressed', 'true')
    expect(themeSegment('Dark')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Follows your OS setting')).toBeInTheDocument()

    fireEvent.click(themeSegment('Light'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(screen.queryByText('Follows your OS setting')).not.toBeInTheDocument()
  })
})
