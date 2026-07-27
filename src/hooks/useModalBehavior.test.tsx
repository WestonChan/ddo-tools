import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRef, type JSX } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModalBehavior } from './useModalBehavior'
import { useAnyModalActive, _resetModalActiveForTests } from './useModalActive'

// Only the behavior Modal.test.tsx can't express lives here: Modal engages
// the hook on mount (mount === open), so the activate/deactivate-without-
// remount path and the registerActive opt-out need a direct harness.

function Harness({
  active,
  onClose,
  registerActive,
}: {
  active: boolean
  onClose: () => void
  registerActive?: boolean
}): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useModalBehavior({ active, onClose, panelRef, registerActive })
  return (
    <div ref={panelRef} tabIndex={-1} data-testid="panel">
      <button>Inside</button>
    </div>
  )
}

function ActiveProbe(): JSX.Element {
  return <span data-testid="probe">{String(useAnyModalActive())}</span>
}

let opener: HTMLButtonElement
let other: HTMLButtonElement

beforeEach(() => {
  _resetModalActiveForTests()
  opener = document.createElement('button')
  other = document.createElement('button')
  document.body.append(opener, other)
})

afterEach(() => {
  opener.remove()
  other.remove()
})

describe('useModalBehavior', () => {
  it('engages and disengages with the active flag without remounting', async () => {
    const onClose = vi.fn()
    opener.focus()
    const { rerender } = render(<Harness active={false} onClose={onClose} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(opener).toHaveFocus()

    rerender(<Harness active onClose={onClose} />)
    expect(screen.getByTestId('panel')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(<Harness active={false} onClose={onClose} />)
    expect(opener).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to whatever was focused at the moment it activated', () => {
    // The restore target is captured on the false -> true render transition,
    // not read at deactivation time: by then focus has usually moved into (or
    // out of) the panel, and handing it to that element would be wrong.
    const onClose = vi.fn()
    opener.focus()
    const { rerender } = render(<Harness active={false} onClose={onClose} />)

    rerender(<Harness active onClose={onClose} />)
    other.focus()

    rerender(<Harness active={false} onClose={onClose} />)
    expect(opener).toHaveFocus()
  })

  it('skips the modal-active refcount when registerActive is false', () => {
    // The mobile nav overlay IS the chrome the refcount readers inert, so it
    // opts out and AppLayout wires the surrounding regions itself.
    render(<ActiveProbe />)
    render(<Harness active onClose={vi.fn()} registerActive={false} />)
    expect(screen.getByTestId('probe')).toHaveTextContent('false')
  })
})
