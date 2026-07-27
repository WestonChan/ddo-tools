import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from './ConfirmModal'
import { _resetModalActiveForTests } from '../hooks/useModalActive'

beforeEach(() => {
  _resetModalActiveForTests()
})

function renderConfirm(overrides: Partial<Parameters<typeof ConfirmModal>[0]> = {}): {
  onConfirm: ReturnType<typeof vi.fn>
  onCancel: ReturnType<typeof vi.fn>
} {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmModal
      title="Apply Planned Build"
      message="This will overwrite your current life's build data."
      confirmLabel="Apply"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmModal', () => {
  it('renders a modal dialog named by its title', () => {
    renderConfirm()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Apply Planned Build')
  })

  it('cancels on Escape', async () => {
    const { onCancel } = renderConfirm()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on Escape while the confirmation field holds focus', async () => {
    // The typed-confirmation input takes focus on open, so an Escape handler
    // scoped to anything narrower than the document would never see the key.
    const { onCancel } = renderConfirm({ requireInput: 'Human 20 Fighter' })
    expect(screen.getByRole('textbox')).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels when the backdrop is clicked', async () => {
    const { onCancel } = renderConfirm()
    await userEvent.click(screen.getByRole('button', { name: /close dialog/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels when the Cancel button is clicked', async () => {
    const { onCancel } = renderConfirm()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('confirms immediately when no typed confirmation is required', async () => {
    const { onConfirm } = renderConfirm()
    const confirm = screen.getByRole('button', { name: 'Apply' })
    expect(confirm).toBeEnabled()

    await userEvent.click(confirm)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('keeps confirm disabled until the required text is typed, ignoring case', async () => {
    const { onConfirm } = renderConfirm({ requireInput: 'Human 20 Fighter' })
    const confirm = screen.getByRole('button', { name: 'Apply' })
    expect(confirm).toBeDisabled()

    await userEvent.type(screen.getByRole('textbox'), 'human 20 fighter')

    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('confirms on Enter from the confirmation field once the phrase matches', async () => {
    const { onConfirm } = renderConfirm({ requireInput: 'Human 20 Fighter' })

    await userEvent.type(screen.getByRole('textbox'), 'human 20 fighter{Enter}')

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('ignores Enter from the confirmation field while the phrase does not match', async () => {
    const { onConfirm } = renderConfirm({ requireInput: 'Human 20 Fighter' })

    await userEvent.type(screen.getByRole('textbox'), 'human 20 wizard{Enter}')

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirms on Enter when no typed confirmation is required', async () => {
    const { onConfirm } = renderConfirm()
    // The primary action holds focus on open, so Enter activates it directly.
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
