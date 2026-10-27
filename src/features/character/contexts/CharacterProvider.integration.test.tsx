import type { JSX } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../../test/renderWithRouter'
import { resetPersistedStateForTests } from '../../../lib/persistedState'
import { STUB_CHARACTERS, STUB_PLANNED_BUILDS } from '../data/stubCharacters'
import { useCharacters } from '../hooks/useCharacters'
import CharacterView from '../CharacterView'
import { CharacterProvider } from './CharacterProvider'

const CURRENT_LIFE_ID = '3b'

function Probe(): JSX.Element {
  const { selectedCharacter, viewedBuild, comparisonBuild, plannedBuilds, buildSelection } =
    useCharacters()
  return (
    <>
      <p data-testid="selected-character">{selectedCharacter.name}</p>
      <p data-testid="viewed-build">{viewedBuild.id}</p>
      <p data-testid="comparison">{comparisonBuild?.id ?? 'none'}</p>
      <p data-testid="selection-build-id">{buildSelection.buildId}</p>
      <p data-testid="planned-names">{plannedBuilds.map((build) => build.name).join('|')}</p>
      <p data-testid="untracked">{JSON.stringify(selectedCharacter.untrackedLives)}</p>
    </>
  )
}

function Actions(): JSX.Element {
  const { setComparisonBuildId, setUntrackedStackCount, setPlannedBuilds, setCharacters } =
    useCharacters()
  const addPlannedBuild = (id: string, name: string) => (previous: typeof STUB_PLANNED_BUILDS) => [
    ...previous,
    { ...STUB_PLANNED_BUILDS[0], id, name },
  ]
  return (
    <>
      <button type="button" onClick={() => setComparisonBuildId('1a')}>
        Compare 1a
      </button>
      <button type="button" onClick={() => setUntrackedStackCount('heroic', 'fighter', 5)}>
        Five fighter lives
      </button>
      <button
        type="button"
        onClick={() => setCharacters(() => null as unknown as typeof STUB_CHARACTERS)}
      >
        Break characters
      </button>
      <button
        type="button"
        onClick={() => {
          setPlannedBuilds(addPlannedBuild('new-a', 'Alpha'))
          setPlannedBuilds(addPlannedBuild('new-b', 'Beta'))
        }}
      >
        Add two builds
      </button>
    </>
  )
}

async function renderProvider(): Promise<{ unmount: () => void }> {
  const { renderResult } = renderWithRouter(
    <CharacterProvider>
      <Probe />
      <Actions />
      <CharacterView />
    </CharacterProvider>,
    '/characters',
  )
  await screen.findByTestId('planned-names')
  return renderResult
}

function storedText(key: string): string | null {
  return localStorage.getItem(key)
}

function expectedCharactersAfterEdit(): unknown {
  const characters = structuredClone(STUB_CHARACTERS)
  characters[0].untrackedLives.heroic.fighter = 5
  return characters
}

function expectedPlannedBuildsAfterRename(): unknown {
  return STUB_PLANNED_BUILDS.map((build) =>
    build.id === '4' ? { ...build, name: 'Stalwart dwarf' } : build,
  )
}

async function renameDwarfTank(): Promise<void> {
  const heading = await screen.findByRole('heading', { name: 'Planned lives' })
  const section = heading.closest('section')
  if (!section) throw new Error('No Planned lives section')
  await userEvent.click(within(section).getByRole('button', { name: 'Rename Dwarf Tank' }))
  const nameInput = within(section).getByRole('textbox', { name: 'Planned build name' })
  await userEvent.clear(nameInput)
  await userEvent.type(nameInput, 'Stalwart dwarf{Enter}')
}

async function editThroughControls(): Promise<void> {
  await renameDwarfTank()
  await userEvent.click(screen.getByRole('button', { name: 'Compare 1a' }))
  await userEvent.click(screen.getByRole('button', { name: 'Five fighter lives' }))
}

describe('CharacterProvider storage', () => {
  it('writes each key as the bare JSON of its value', async () => {
    await renderProvider()
    await editThroughControls()

    expect(storedText('ddo-characters')).toBe(JSON.stringify(expectedCharactersAfterEdit()))
    expect(storedText('ddo-selection')).toBe(
      JSON.stringify({ characterId: 'char-1', buildId: CURRENT_LIFE_ID, comparisonBuildId: '1a' }),
    )
    expect(storedText('ddo-plannedBuilds')).toBe(JSON.stringify(expectedPlannedBuildsAfterRename()))
  })

  it('shows after a reload exactly what was saved', async () => {
    const { unmount } = await renderProvider()
    await editThroughControls()
    unmount()
    resetPersistedStateForTests()

    await renderProvider()

    expect(screen.getByTestId('planned-names')).toHaveTextContent('Stalwart dwarf')
    expect(screen.getByTestId('comparison')).toHaveTextContent('1a')
    expect(screen.getByTestId('untracked')).toHaveTextContent('"fighter":5')
  })

  const charactersWithLegacyOverrides = structuredClone(STUB_CHARACTERS).map((character) => {
    const { untrackedLives, ...rest } = character
    const overrides = structuredClone(untrackedLives)
    if (character.id === 'char-1') overrides.heroic.fighter = 7
    return { ...rest, pastLifeOverrides: overrides }
  })

  it.each([
    [
      'a current-shape selection',
      'ddo-selection',
      { characterId: 'char-2', buildId: '10', comparisonBuildId: '4' },
      { character: 'Aelindra', viewed: '10', comparison: '4' },
    ],
    [
      'a legacy life selection',
      'ddo-selection',
      { characterId: 'char-1', lifeId: '1c', plannedBuildId: null },
      { character: 'Thordak', viewed: '1c', comparison: 'none' },
    ],
    [
      'a legacy planned-build selection',
      'ddo-selection',
      { characterId: 'char-1', lifeId: '', plannedBuildId: '4' },
      { character: 'Thordak', viewed: '4', comparison: 'none' },
    ],
    [
      'a selection saved before comparisons existed',
      'ddo-selection',
      { characterId: 'char-2', buildId: '10' },
      { character: 'Aelindra', viewed: '10', comparison: 'none' },
    ],
    [
      'characters with legacy pastLifeOverrides',
      'ddo-characters',
      charactersWithLegacyOverrides,
      { character: 'Thordak', viewed: CURRENT_LIFE_ID, comparison: 'none', fighter: 7 },
    ],
    [
      'planned builds with a renamed entry',
      'ddo-plannedBuilds',
      STUB_PLANNED_BUILDS.map((build) =>
        build.id === '4' ? { ...build, name: 'Stalwart dwarf' } : build,
      ),
      {
        character: 'Thordak',
        viewed: CURRENT_LIFE_ID,
        comparison: 'none',
        plannedName: 'Stalwart dwarf',
      },
    ],
  ])(
    'loads %s that today stores, without rewriting it',
    async (_description, key, stored, expected: Record<string, unknown>) => {
      const storedJson = JSON.stringify(stored)
      localStorage.setItem(key, storedJson)

      await renderProvider()

      expect(screen.getByTestId('selected-character')).toHaveTextContent(String(expected.character))
      expect(screen.getByTestId('viewed-build')).toHaveTextContent(String(expected.viewed))
      expect(screen.getByTestId('comparison')).toHaveTextContent(String(expected.comparison))
      if (expected.fighter !== undefined)
        expect(screen.getByTestId('untracked')).toHaveTextContent(`"fighter":${expected.fighter}`)
      if (expected.plannedName !== undefined)
        expect(screen.getByTestId('planned-names')).toHaveTextContent(String(expected.plannedName))
      expect(localStorage.getItem(key)).toBe(storedJson)
    },
  )

  it.each(['{}', 'null', '"x"'])(
    'gives the stub planned builds for a stored value that is not an array (%s)',
    async (storedJson) => {
      localStorage.setItem('ddo-plannedBuilds', storedJson)

      await renderProvider()

      expect(screen.getByTestId('planned-names')).toHaveTextContent(
        STUB_PLANNED_BUILDS.map((build) => build.name).join('|'),
      )
    },
  )

  it('composes two updaters called in one handler', async () => {
    await renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'Add two builds' }))

    expect(screen.getByTestId('planned-names').textContent).toMatch(/Alpha\|Beta$/)
    expect(storedText('ddo-plannedBuilds')).toContain('"Alpha"')
    expect(storedText('ddo-plannedBuilds')).toContain('"Beta"')
  })

  it('keeps the stored characters byte-identical when a save cannot be migrated', async () => {
    await renderProvider()
    await userEvent.click(screen.getByRole('button', { name: 'Five fighter lives' }))
    const storedBefore = storedText('ddo-characters')
    expect(storedBefore).toContain('"fighter":5')

    await userEvent.click(screen.getByRole('button', { name: 'Break characters' }))

    expect(storedText('ddo-characters')).toBe(storedBefore)
    expect(screen.getByTestId('untracked')).toHaveTextContent('"fighter":5')
  })
})
