import type { JSX } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { CharacterProvider, useCharacters } from '../features/character'
import { renderWithRouter } from '../test/renderWithRouter'
import { NavBarCharacterCard } from './NavBarCharacterCard'

function PlannedBuildDeleteButton({ buildName }: { buildName: string }): JSX.Element {
  const { plannedBuilds, deletePlannedBuild } = useCharacters()
  const plannedBuildToDelete = plannedBuilds.find((plannedBuild) => plannedBuild.name === buildName)
  return (
    <button
      type="button"
      onClick={() => plannedBuildToDelete && deletePlannedBuild(plannedBuildToDelete.id)}
    >
      Delete {buildName}
    </button>
  )
}

function renderCard({ isExpanded = true }: { isExpanded?: boolean } = {}): void {
  renderWithRouter(
    <CharacterProvider>
      <NavBarCharacterCard isExpanded={isExpanded} />
      <PlannedBuildDeleteButton buildName="Dwarf Tank" />
    </CharacterProvider>,
  )
}

async function viewedBuildButton(): Promise<HTMLElement> {
  return screen.findByRole('button', { name: /^Viewed build: / })
}

function comparisonButton(): HTMLElement {
  return screen.getByRole('button', { name: /^(Compared build: |Compare…)/ })
}

async function pickFromSwitcher(rowName: string): Promise<void> {
  await userEvent.click(await viewedBuildButton())
  const switcher = screen.getByRole('group', { name: 'Switch build' })
  await userEvent.click(within(switcher).getByRole('button', { name: rowName }))
}

async function menuEntriesIn(menuTrigger: HTMLElement, menuName: string): Promise<string[]> {
  await userEvent.click(menuTrigger)
  const menu = screen.getByRole('group', { name: menuName })
  const menuEntries = Array.from(menu.children).map((entry) => entry.textContent ?? '')
  await userEvent.keyboard('{Escape}')
  return menuEntries
}

async function groupedRowsIn(menuTrigger: HTMLElement, menuName: string): Promise<string[]> {
  await userEvent.click(menuTrigger)
  const menu = screen.getByRole('group', { name: menuName })
  const groupedRows: string[] = []
  let eyebrowAbove = ''
  for (const entry of Array.from(menu.children)) {
    if (entry.classList.contains('anchored-menu-eyebrow')) eyebrowAbove = entry.textContent ?? ''
    else if (entry.tagName === 'BUTTON') groupedRows.push(`${eyebrowAbove} › ${entry.textContent}`)
  }
  await userEvent.keyboard('{Escape}')
  return groupedRows
}

async function selectedRowTextIn(
  menuTrigger: HTMLElement,
  menuName: string,
): Promise<string | null> {
  await userEvent.click(menuTrigger)
  const menu = screen.getByRole('group', { name: menuName })
  const selectedRow = menu.querySelector('[aria-current]')
  await userEvent.keyboard('{Escape}')
  return selectedRow?.textContent ?? null
}

async function pickComparison(rowName: string): Promise<void> {
  await userEvent.click(comparisonButton())
  const comparePicker = screen.getByRole('group', { name: 'Compare against' })
  await userEvent.click(within(comparePicker).getByRole('button', { name: rowName }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('NavBarCharacterCard', () => {
  it("shows the selected character's current life as the viewed build", async () => {
    renderCard()
    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Thordak/)
    expect(comparisonButton()).toHaveAccessibleName('Compare…')
  })

  it('lists each character with its lives, then the planned builds under their own eyebrow', async () => {
    renderCard()
    await userEvent.click(await viewedBuildButton())

    const switcher = screen.getByRole('group', { name: 'Switch build' })
    const switcherEntries = Array.from(switcher.children).map((entry) => entry.textContent)
    expect(switcherEntries).toEqual([
      'Thordak',
      'Life 8',
      'Life 9',
      'Life 10',
      'Life 11',
      'Life 12',
      'Life 13',
      'Life 14 (current)',
      'Aelindra',
      'Life 1 (current)',
      'Planned builds',
      'Dwarf Tank (planned)',
      'Unnamed build (planned)',
    ])
  })

  it('makes a planned build picked in the switcher the viewed build and closes the switcher', async () => {
    renderCard()
    await pickFromSwitcher('Dwarf Tank (planned)')

    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Dwarf Tank .* planned$/)
    expect(screen.queryByRole('group', { name: 'Switch build' })).not.toBeInTheDocument()
  })

  it("switches character when another character's life is picked", async () => {
    renderCard()
    await pickFromSwitcher('Life 1 (current)')

    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Aelindra/)
  })

  it('groups the compare picker like the switcher, without the viewed build', async () => {
    renderCard()
    await viewedBuildButton()

    expect(await menuEntriesIn(comparisonButton(), 'Compare against')).toEqual([
      'Thordak',
      'Life 8',
      'Life 9',
      'Life 10',
      'Life 11',
      'Life 12',
      'Life 13',
      'Aelindra',
      'Life 1 (current)',
      'Planned builds',
      'Dwarf Tank (planned)',
      'Unnamed build (planned)',
    ])

    await pickComparison('Dwarf Tank (planned)')

    expect(comparisonButton()).toHaveAccessibleName(/^Compared build: Dwarf Tank/)
    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Thordak/)
  })

  it.each(['Life 13', 'Dwarf Tank (planned)', 'Life 1 (current)'])(
    'lists the same rows in both menus apart from the viewed build (viewing %s)',
    async (viewedRowLabel) => {
      renderCard()
      await pickFromSwitcher(viewedRowLabel)

      const switcherRows = await groupedRowsIn(await viewedBuildButton(), 'Switch build')
      const comparePickerRows = await groupedRowsIn(comparisonButton(), 'Compare against')

      expect(comparePickerRows).toEqual(
        switcherRows.filter((row) => !row.endsWith(` › ${viewedRowLabel}`)),
      )
    },
  )

  it('stops comparing from the compare picker', async () => {
    renderCard()
    await viewedBuildButton()
    await pickComparison('Dwarf Tank (planned)')

    await userEvent.click(comparisonButton())
    await userEvent.click(screen.getByRole('button', { name: 'Stop comparing' }))

    expect(comparisonButton()).toHaveAccessibleName('Compare…')
  })

  it('swaps the viewed and compared builds', async () => {
    renderCard()
    await viewedBuildButton()
    await pickComparison('Life 1 (current)')

    await userEvent.click(screen.getByRole('button', { name: 'Swap' }))

    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Aelindra/)
    expect(comparisonButton()).toHaveAccessibleName(/^Compared build: Thordak/)
  })

  it('disables Swap while no comparison is set', async () => {
    renderCard()
    await viewedBuildButton()
    expect(screen.getByRole('button', { name: 'Swap' })).toBeDisabled()
  })

  it('keeps the comparison when another life of the compared character is viewed', async () => {
    renderCard()
    await pickFromSwitcher('Life 1 (current)')
    await pickComparison('Life 14 (current)')

    await pickFromSwitcher('Life 13')

    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Thordak .* Life 13$/)
    expect(comparisonButton()).toHaveAccessibleName(/^Compared build: Thordak · [^·]+ · [^·]+$/)
  })

  it('marks the viewed and compared builds in the menus after a pick and after Swap', async () => {
    renderCard()
    await pickFromSwitcher('Life 13')
    await pickComparison('Life 1 (current)')

    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Thordak .* Life 13$/)
    expect(await selectedRowTextIn(await viewedBuildButton(), 'Switch build')).toBe('Life 13')
    expect(comparisonButton()).toHaveAccessibleName(/^Compared build: Aelindra/)
    expect(await selectedRowTextIn(comparisonButton(), 'Compare against')).toBe('Life 1 (current)')

    await userEvent.click(screen.getByRole('button', { name: 'Swap' }))

    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Aelindra/)
    expect(await selectedRowTextIn(await viewedBuildButton(), 'Switch build')).toBe(
      'Life 1 (current)',
    )
    expect(comparisonButton()).toHaveAccessibleName(/^Compared build: Thordak .* Life 13$/)
    expect(await selectedRowTextIn(comparisonButton(), 'Compare against')).toBe('Life 13')
  })

  it('points each menu trigger at the menu it opens without claiming a menu role', async () => {
    renderCard()
    const trigger = await viewedBuildButton()
    expect(trigger).not.toHaveAttribute('aria-haspopup')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)

    const switcher = screen.getByRole('group', { name: 'Switch build' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', switcher.id)
  })

  it('drops the comparison when the compared build becomes the viewed build', async () => {
    renderCard()
    await viewedBuildButton()
    await pickComparison('Dwarf Tank (planned)')

    await pickFromSwitcher('Dwarf Tank (planned)')

    expect(await viewedBuildButton()).toHaveAccessibleName(/^Viewed build: Dwarf Tank/)
    expect(comparisonButton()).toHaveAccessibleName('Compare…')
  })

  it('drops the comparison when the compared build is deleted', async () => {
    renderCard()
    await viewedBuildButton()
    await pickComparison('Dwarf Tank (planned)')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dwarf Tank' }))

    expect(comparisonButton()).toHaveAccessibleName('Compare…')
    expect(screen.getByRole('button', { name: 'Swap' })).toBeDisabled()
  })

  it('falls back to the current life and keeps the comparison when the viewed planned build is deleted', async () => {
    renderCard()
    await pickFromSwitcher('Dwarf Tank (planned)')
    await pickComparison('Life 13')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dwarf Tank' }))

    expect(await viewedBuildButton()).toHaveAccessibleName(
      /^Viewed build: Thordak · [^·]+ · [^·]+$/,
    )
    expect(comparisonButton()).toHaveAccessibleName(/^Compared build: Thordak .* Life 13$/)
  })

  it('drops the comparison when deleting the viewed planned build falls back to the compared life', async () => {
    renderCard()
    await pickFromSwitcher('Dwarf Tank (planned)')
    await pickComparison('Life 14 (current)')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dwarf Tank' }))

    expect(await viewedBuildButton()).toHaveAccessibleName(
      /^Viewed build: Thordak · [^·]+ · [^·]+$/,
    )
    expect(comparisonButton()).toHaveAccessibleName('Compare…')
  })

  it('shows initials in the collapsed rail', async () => {
    renderCard({ isExpanded: false })
    expect(await viewedBuildButton()).toHaveTextContent(/^T$/)
    expect(comparisonButton()).toHaveTextContent(/^—$/)

    await pickComparison('Life 1 (current)')

    expect(comparisonButton()).toHaveTextContent(/^A$/)
  })
})
