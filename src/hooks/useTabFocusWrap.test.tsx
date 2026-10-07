import { expect, it } from 'vitest'
import { useRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTabFocusWrap } from './useTabFocusWrap'

function FocusWrapHarness({ isActive }: { isActive: boolean }): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null)
  useTabFocusWrap(panelRef, isActive)
  return (
    <>
      <button>Before panel</button>
      <div ref={panelRef} tabIndex={-1} data-testid="panel">
        <button>First control</button>
        <div tabIndex={-1}>Other ledger row</div>
        <div tabIndex={0}>Roving ledger row</div>
        <button>Last control</button>
      </div>
      <button>After panel</button>
    </>
  )
}

it('wraps the active panel through its focusable controls and stops when inactive', async () => {
  const { rerender } = render(<FocusWrapHarness isActive />)
  const panel = screen.getByTestId('panel')
  const first = screen.getByRole('button', { name: 'First control' })
  const rovingRow = screen.getByText('Roving ledger row')
  const last = screen.getByRole('button', { name: 'Last control' })

  panel.focus()
  await userEvent.tab()
  expect(first).toHaveFocus()
  await userEvent.tab()
  expect(rovingRow).toHaveFocus()
  await userEvent.tab()
  expect(last).toHaveFocus()
  await userEvent.tab()
  expect(first).toHaveFocus()
  await userEvent.tab({ shift: true })
  expect(last).toHaveFocus()
  panel.focus()
  await userEvent.tab({ shift: true })
  expect(last).toHaveFocus()

  rerender(<FocusWrapHarness isActive={false} />)
  await userEvent.tab()
  expect(screen.getByRole('button', { name: 'After panel' })).toHaveFocus()
})
