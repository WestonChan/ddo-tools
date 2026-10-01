import type { JSX } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { CharacterProvider } from './contexts/CharacterProvider'
import { useCharacters } from './hooks/useCharacters'
import CharacterView from './CharacterView'

function ComparisonSetter({ buildId, label }: { buildId: string; label: string }): JSX.Element {
  const { setComparisonBuildId } = useCharacters()
  return (
    <button type="button" onClick={() => setComparisonBuildId(buildId)}>
      {label}
    </button>
  )
}

function renderCharacterView(): void {
  renderWithRouter(
    <CharacterProvider>
      <ComparisonSetter buildId="4" label="Compare Dwarf Tank" />
      <ComparisonSetter buildId="1a" label="Compare an earlier Thordak life" />
      <CharacterView />
    </CharacterProvider>,
    '/characters',
  )
}

async function pageSection(title: string): Promise<HTMLElement> {
  const heading = await screen.findByRole('heading', { name: title })
  const section = heading.closest('section')
  if (!section) throw new Error(`No section around the ${title} heading`)
  return section
}

async function rowIn(sectionTitle: string, rowName: RegExp): Promise<HTMLElement> {
  return within(await pageSection(sectionTitle)).getByRole('button', { name: rowName })
}

function lifeRowButton(lifeNumber: number): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^Life ${lifeNumber}(?!\\d)`) })
}

beforeEach(() => {
  localStorage.clear()
})

describe('CharacterView character rows', () => {
  it('marks the character owning the viewed build active and moves the mark to the character picked', async () => {
    renderCharacterView()
    const thordakRow = await rowIn('Characters', /^Thordak/)
    expect(thordakRow).toHaveAttribute('aria-current', 'true')
    expect(within(thordakRow).getByText('active')).toBeInTheDocument()
    expect(within(await rowIn('Characters', /^Aelindra/)).queryByText('active')).toBeNull()

    await userEvent.click(await rowIn('Characters', /^Aelindra/))

    const aelindraRow = await rowIn('Characters', /^Aelindra/)
    expect(aelindraRow).toHaveAttribute('aria-current', 'true')
    expect(within(aelindraRow).getByText('active')).toBeInTheDocument()
    expect(await rowIn('Characters', /^Thordak/)).not.toHaveAttribute('aria-current')
    expect(within(await rowIn('Characters', /^Thordak/)).queryByText('active')).toBeNull()
  })

  it('labels the viewed character "active · comparing" when it also owns the comparison build', async () => {
    renderCharacterView()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Compare an earlier Thordak life' }),
    )

    expect(
      within(await rowIn('Characters', /^Thordak/)).getByText('active · comparing'),
    ).toBeInTheDocument()
  })

  it('keeps the export and delete controls outside the row button', async () => {
    renderCharacterView()
    const thordakRow = await rowIn('Characters', /^Thordak/)

    expect(within(thordakRow).queryByRole('button')).toBeNull()
    expect(
      within(await pageSection('Characters')).getAllByRole('button', { name: /^Export / }),
    ).toHaveLength(2)
  })
})

describe('CharacterView planned lives', () => {
  it('marks the compared planned build "comparing" and the picked planned build active', async () => {
    renderCharacterView()
    expect(within(await rowIn('Planned lives', /^Dwarf Tank/)).queryByText('comparing')).toBeNull()

    await userEvent.click(await screen.findByRole('button', { name: 'Compare Dwarf Tank' }))

    expect(
      within(await rowIn('Planned lives', /^Dwarf Tank/)).getByText('comparing'),
    ).toBeInTheDocument()

    await userEvent.click(await rowIn('Planned lives', /^Unnamed build/))

    expect(await rowIn('Planned lives', /^Unnamed build/)).toHaveAttribute('aria-current', 'true')
    expect(
      within(await rowIn('Planned lives', /^Unnamed build/)).getByText('active'),
    ).toBeInTheDocument()
    expect(within(await rowIn('Characters', /^Thordak/)).queryByText('active')).toBeNull()
  })

  it('renames a planned build through its rename control', async () => {
    renderCharacterView()
    const plannedLivesSection = await pageSection('Planned lives')

    await userEvent.click(
      within(plannedLivesSection).getByRole('button', { name: 'Rename Dwarf Tank' }),
    )
    const nameInput = within(plannedLivesSection).getByRole('textbox', {
      name: 'Planned build name',
    })
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Stalwart dwarf{Enter}')

    expect(await rowIn('Planned lives', /^Stalwart dwarf/)).toBeInTheDocument()
  })

  it('returns focus to the row’s Rename button once renaming ends with Enter, Escape or a click away', async () => {
    renderCharacterView()
    const plannedLivesSection = await pageSection('Planned lives')
    function nameInput(): HTMLElement {
      return within(plannedLivesSection).getByRole('textbox', { name: 'Planned build name' })
    }

    await userEvent.click(
      within(plannedLivesSection).getByRole('button', { name: 'Rename Dwarf Tank' }),
    )
    await userEvent.type(nameInput(), '{Escape}')
    expect(
      within(plannedLivesSection).getByRole('button', { name: 'Rename Dwarf Tank' }),
    ).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await userEvent.clear(nameInput())
    await userEvent.type(nameInput(), 'Stalwart dwarf{Enter}')
    expect(
      within(plannedLivesSection).getByRole('button', { name: 'Rename Stalwart dwarf' }),
    ).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await userEvent.click(document.body)
    expect(
      within(plannedLivesSection).getByRole('button', { name: 'Rename Stalwart dwarf' }),
    ).toHaveFocus()
  })
})

describe('CharacterView reincarnation history', () => {
  it('views a life picked from the reincarnation history and marks it current', async () => {
    renderCharacterView()
    expect(await screen.findByRole('button', { name: /^Life 14(?!\d)/ })).toHaveAttribute(
      'aria-current',
      'true',
    )

    await userEvent.click(lifeRowButton(13))

    expect(lifeRowButton(13)).toHaveAttribute('aria-current', 'true')
    expect(lifeRowButton(14)).not.toHaveAttribute('aria-current')
  })
})
