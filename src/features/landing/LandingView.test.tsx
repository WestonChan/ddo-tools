import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithRouter } from '../../test/renderWithRouter'
import { REPOSITORY_URL } from '../../lib/githubIssue'
import LandingView from './LandingView'
import type { CharactersTileSummary } from './components/EntryTiles'

const THORDAK_SUMMARY: CharactersTileSummary = {
  characterName: 'Thordak',
  classLabel: '12 Favored Soul / 6 Artificer / 2 Alchemist',
  raceLabel: 'Eladrin Chaosmancer',
  pastLifeTotalCount: 7,
}

async function renderLanding(summary: CharactersTileSummary | null): Promise<void> {
  renderWithRouter(<LandingView activeCharacterSummary={summary} />, '/')
  await screen.findByRole('heading', { name: 'DDO Tools' })
}

function charactersTile(): HTMLElement {
  return screen.getByRole('link', { name: /^Characters & builds/ })
}

describe('LandingView', () => {
  it('renders one entry tile per destination', async () => {
    await renderLanding(null)

    expect(charactersTile()).toHaveAttribute('href', '/characters')
    expect(screen.getByRole('link', { name: /^Build plan/ })).toHaveAttribute('href', '/build-plan')
    expect(screen.getByRole('link', { name: /^Gear/ })).toHaveAttribute('href', '/gear')
    expect(screen.getByRole('link', { name: /^Resources/ })).toHaveAttribute('href', '/resources')
  })

  it('describes the Characters tile generically when there is no active character', async () => {
    await renderLanding(null)

    expect(
      within(charactersTile()).getByText('Manage characters, lives, planned builds'),
    ).toBeInTheDocument()
  })

  it('summarizes the active character on the Characters tile', async () => {
    await renderLanding(THORDAK_SUMMARY)

    expect(
      within(charactersTile()).getByText(
        'Thordak · 12 Favored Soul / 6 Artificer / 2 Alchemist · Eladrin Chaosmancer · 7 past lives',
      ),
    ).toBeInTheDocument()
    expect(
      within(charactersTile()).queryByText('Manage characters, lives, planned builds'),
    ).not.toBeInTheDocument()
  })

  it('leaves past lives out of the summary when there are none', async () => {
    await renderLanding({ ...THORDAK_SUMMARY, pastLifeTotalCount: 0 })

    expect(charactersTile()).toHaveTextContent(/Eladrin Chaosmancer$/)
  })

  it('counts a single past life in the singular', async () => {
    await renderLanding({ ...THORDAK_SUMMARY, pastLifeTotalCount: 1 })

    expect(charactersTile()).toHaveTextContent(/Eladrin Chaosmancer · 1 past life$/)
  })

  it('shows the site version and a GitHub link in the footer', async () => {
    await renderLanding(null)

    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(`v${__APP_VERSION__}`)
    expect(within(footer).getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      REPOSITORY_URL,
    )
  })
})
