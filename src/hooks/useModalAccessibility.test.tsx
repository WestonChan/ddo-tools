import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRef, type JSX } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModalAccessibility } from './useModalAccessibility'
import { useIsAnyModalActive, resetActiveModalCountForTests } from './useRegisterActiveModal'

function ModalAccessibilityHarness({
  isActive,
  onClose,
  shouldRegisterAsActiveModal,
}: {
  isActive: boolean
  onClose: () => void
  shouldRegisterAsActiveModal?: boolean
}): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useModalAccessibility({ isActive, onClose, panelRef, shouldRegisterAsActiveModal })
  return (
    <div ref={panelRef} tabIndex={-1} data-testid="panel">
      <button>Inside</button>
    </div>
  )
}

function AnyModalActiveProbe(): JSX.Element {
  return <span data-testid="probe">{String(useIsAnyModalActive())}</span>
}

let opener: HTMLButtonElement
let otherButton: HTMLButtonElement

beforeEach(() => {
  resetActiveModalCountForTests()
  opener = document.createElement('button')
  otherButton = document.createElement('button')
  document.body.append(opener, otherButton)
})

afterEach(() => {
  opener.remove()
  otherButton.remove()
})

describe('useModalAccessibility', () => {
  it('engages and disengages with the active flag without remounting', async () => {
    const onClose = vi.fn()
    opener.focus()
    const { rerender } = render(<ModalAccessibilityHarness isActive={false} onClose={onClose} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(opener).toHaveFocus()

    rerender(<ModalAccessibilityHarness isActive onClose={onClose} />)
    expect(screen.getByTestId('panel')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(<ModalAccessibilityHarness isActive={false} onClose={onClose} />)
    expect(opener).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to whatever was focused at the moment it activated', () => {
    const onClose = vi.fn()
    opener.focus()
    const { rerender } = render(<ModalAccessibilityHarness isActive={false} onClose={onClose} />)

    rerender(<ModalAccessibilityHarness isActive onClose={onClose} />)
    otherButton.focus()

    rerender(<ModalAccessibilityHarness isActive={false} onClose={onClose} />)
    expect(opener).toHaveFocus()
  })

  it('skips the modal-active refcount when shouldRegisterAsActiveModal is false', () => {
    render(<AnyModalActiveProbe />)
    render(
      <ModalAccessibilityHarness isActive onClose={vi.fn()} shouldRegisterAsActiveModal={false} />,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('false')
  })
})
