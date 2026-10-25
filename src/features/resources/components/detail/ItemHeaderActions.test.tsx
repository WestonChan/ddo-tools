import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ItemHeaderActions } from './ItemHeaderActions'

afterEach(() => {
  cleanup()
})

describe('ItemHeaderActions linked wiki window chip', () => {
  it('keeps the Link wiki chip disabled until Phase 4g', () => {
    render(<ItemHeaderActions name="Voice of the Master" />)
    const chip = screen.getByRole('button', { name: 'Link wiki' })
    expect(chip).toBeDisabled()
    expect(chip.parentElement).toHaveAttribute(
      'data-tip',
      'Linked wiki window arrives with Phase 4g',
    )
    expect(screen.queryByRole('link', { name: /DDO Wiki/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Report a mismatch/ }).parentElement).toHaveAttribute(
      'data-tip',
      'Report a mismatch',
    )
  })
})
