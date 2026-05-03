import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterProvider } from '../features/character'
import { BottomBar } from './BottomBar'

describe('BottomBar', () => {
  let openSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })
  afterEach(() => {
    openSpy.mockRestore()
  })

  it('preserves BuildInfo on the LEFT (character name still renders)', () => {
    render(
      <CharacterProvider>
        <BottomBar warnings={[]} />
      </CharacterProvider>,
    )
    // BuildInfo renders the character name; CharacterProvider seeds a default.
    expect(document.querySelector('.bottom-bar-build')).not.toBeNull()
  })

  it('renders the Report button on the RIGHT clustered in .bottom-bar-actions', () => {
    render(
      <CharacterProvider>
        <BottomBar warnings={[]} />
      </CharacterProvider>,
    )
    const button = screen.getByRole('button', { name: 'Report a bug — opens GitHub issue' })
    expect(button).toBeInTheDocument()
    // The Report button + WarningStatus are clustered in .bottom-bar-actions.
    const actions = document.querySelector('.bottom-bar-actions')
    expect(actions).not.toBeNull()
    expect(actions?.contains(button)).toBe(true)
  })

  it('opens a pre-filled GitHub issue in a new tab on click', async () => {
    const user = userEvent.setup()
    render(
      <CharacterProvider>
        <BottomBar warnings={[]} />
      </CharacterProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Report a bug — opens GitHub issue' }))
    expect(openSpy).toHaveBeenCalledOnce()
    const [url, target, features] = openSpy.mock.calls[0]
    expect(url).toContain('github.com/WestonChan/ddo-tools/issues/new')
    expect(url).toContain('title=User%20report')
    expect(target).toBe('_blank')
    expect(features).toBe('noopener,noreferrer')
  })

  it('keeps WarningStatus rendered alongside the new Report button', () => {
    render(
      <CharacterProvider>
        <BottomBar warnings={[]} />
      </CharacterProvider>,
    )
    // The "No warnings" pill is the existing WarningStatus zero-state.
    expect(screen.getByRole('button', { name: /No warnings/ })).toBeInTheDocument()
  })
})
