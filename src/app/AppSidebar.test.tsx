import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppSidebar from './AppSidebar'

// Mock useCharacter to avoid needing CharacterProvider
vi.mock('../features/character', () => ({
  useCharacter: () => ({
    character: { id: '1', name: 'Thordak', server: 'Thrane' },
    activeBuild: {
      id: 'b1',
      race: 'human',
      classes: [
        { classId: 'paladin', levels: 18 },
        { classId: 'rogue', levels: 2 },
      ],
    },
  }),
  formatClassSummary: () => '18 Paladin / 2 Rogue',
  formatRace: () => 'Human',
}))

const mockNavigate = vi.fn()

function renderSidebar(expanded = true) {
  return render(
    <AppSidebar
      activeView="build-plan"
      onViewChange={mockNavigate}
      expanded={expanded}
      onToggleExpanded={() => {}}
    />,
  )
}

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('AppSidebar', () => {
  describe('expanded state', () => {
    it('renders top-level nav items', () => {
      renderSidebar(true)
      expect(screen.getByText('Build Overview')).toBeInTheDocument()
      expect(screen.getByText('Gear')).toBeInTheDocument()
    })

    it('renders group labels', () => {
      renderSidebar(true)
      expect(screen.getByText('Build Plan')).toBeInTheDocument()
      expect(screen.getByText('Tools')).toBeInTheDocument()
    })

    it('shows all group items (always expanded)', () => {
      renderSidebar(true)
      expect(screen.getByText('Level Plan')).toBeInTheDocument()
      expect(screen.getByText('Skills')).toBeInTheDocument()
      expect(screen.getByText('Spells')).toBeInTheDocument()
      expect(screen.getByText('Enhancements')).toBeInTheDocument()
      expect(screen.getByText('Reaper')).toBeInTheDocument()
      expect(screen.getByText('Destinies')).toBeInTheDocument()
      expect(screen.getByText('Damage Calc')).toBeInTheDocument()
      expect(screen.getByText('Farm Checklist')).toBeInTheDocument()
      expect(screen.getByText('Debug')).toBeInTheDocument()
    })

    it('renders build info at the top', () => {
      renderSidebar(true)
      expect(screen.getByText('Thordak')).toBeInTheDocument()
      expect(screen.getByText('Human 18 Paladin / 2 Rogue')).toBeInTheDocument()
    })

    it('renders settings at the bottom', () => {
      renderSidebar(true)
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('navigates when a nav item is clicked', async () => {
      const user = userEvent.setup()
      renderSidebar(true)

      await user.click(screen.getByText('Gear'))
      expect(mockNavigate).toHaveBeenCalledWith('gear')
    })

    it('navigates to characters when build info is clicked', async () => {
      const user = userEvent.setup()
      renderSidebar(true)

      await user.click(screen.getByText('Human 18 Paladin / 2 Rogue'))
      expect(mockNavigate).toHaveBeenCalledWith('characters')
    })

    it('shows disabled compare button', () => {
      renderSidebar(true)
      const compareBtn = document.querySelector('.sidebar-compare-btn')
      expect(compareBtn).toBeInTheDocument()
      expect(compareBtn).toBeDisabled()
    })
  })

  describe('collapsed state', () => {
    it('hides text labels', () => {
      renderSidebar(false)
      expect(screen.queryByText('Build Overview')).not.toBeInTheDocument()
      expect(screen.queryByText('Gear')).not.toBeInTheDocument()
    })

    it('renders nav buttons as icons', () => {
      renderSidebar(false)
      const buttons = screen.getAllByRole('button')
      // toggle + nav items + build info + settings
      expect(buttons.length).toBeGreaterThanOrEqual(7)
    })
  })
})
