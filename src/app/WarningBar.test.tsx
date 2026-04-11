import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WarningBar } from './WarningBar'
import type { BuildWarning } from './WarningBar'

const mockNavigate = vi.fn()

const warnings: BuildWarning[] = [
  { message: '2 feat slots empty (L6, L12)', view: 'build-plan', severity: 'warning' },
  { message: 'No weapon equipped', view: 'gear', severity: 'error' },
]

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('WarningBar', () => {
  it('renders "No warnings" when warnings array is empty', () => {
    render(<WarningBar warnings={[]} onNavigate={mockNavigate} />)
    expect(screen.getByText('No warnings')).toBeInTheDocument()
  })

  it('renders collapsed summary with warning count', () => {
    render(<WarningBar warnings={warnings} onNavigate={mockNavigate} />)
    expect(screen.getByText('2 warnings')).toBeInTheDocument()
  })

  it('renders singular "warning" for count of 1', () => {
    render(<WarningBar warnings={[warnings[0]]} onNavigate={mockNavigate} />)
    expect(screen.getByText('1 warning')).toBeInTheDocument()
  })

  it('expands to show individual warnings on click', async () => {
    const user = userEvent.setup()
    render(<WarningBar warnings={warnings} onNavigate={mockNavigate} />)

    // Warnings not visible initially
    expect(screen.queryByText('2 feat slots empty (L6, L12)')).not.toBeInTheDocument()

    // Click to expand
    await user.click(screen.getByText('2 warnings'))

    expect(screen.getByText('2 feat slots empty (L6, L12)')).toBeInTheDocument()
    expect(screen.getByText('No weapon equipped')).toBeInTheDocument()
  })

  it('navigates to the correct view when a warning is clicked', async () => {
    const user = userEvent.setup()
    render(<WarningBar warnings={warnings} onNavigate={mockNavigate} />)

    // Expand first
    await user.click(screen.getByText('2 warnings'))

    // Click the gear warning
    await user.click(screen.getByText('No weapon equipped'))

    expect(mockNavigate).toHaveBeenCalledWith('gear')
  })
})
