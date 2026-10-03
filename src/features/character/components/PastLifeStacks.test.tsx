import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PastLifeStacks } from './PastLifeStacks'
import type { Character, Life } from '../types'

function createLife(overrides: Partial<Life> = {}): Life {
  return {
    id: 'life-1',
    name: '',
    race: 'human',
    classes: [{ classId: 'fighter', levels: 20 }],
    feats: [],
    enhancements: [],
    status: 'current',
    ...overrides,
  }
}

function createCharacter(): Character {
  return {
    id: 'c1',
    name: 'Test',
    lives: [createLife()],
    currentLifeIndex: 0,
    untrackedLives: { heroic: {}, racial: {}, iconic: {}, epic: {} },
    createdAt: '',
    updatedAt: '',
  }
}

afterEach(() => {
  cleanup()
})

describe('PastLifeStacks', () => {
  it('lists each epic past life only under its own sphere', () => {
    render(
      <PastLifeStacks
        character={createCharacter()}
        viewedLifeId="life-1"
        onSetUntrackedStackCount={() => {}}
      />,
    )
    expect(screen.getByText('Epic — Arcane')).toBeInTheDocument()
    expect(screen.getAllByText('Ancient Blessings')).toHaveLength(1)
    expect(screen.getAllByText('Ancient Knowledge')).toHaveLength(1)
  })

  it('uses a shared hint for a desired stack already owned by the character', () => {
    const character = createCharacter()
    character.untrackedLives.epic['ancient-blessings'] = 1
    const plannedBuild = createLife({
      desiredPastLives: {
        heroic: {},
        racial: {},
        iconic: {},
        epic: { 'ancient-blessings': 1 },
      },
    })
    const { container } = render(
      <PastLifeStacks
        character={character}
        viewedLifeId="life-1"
        viewedPlannedBuild={plannedBuild}
        onSetUntrackedStackCount={() => {}}
      />,
    )
    expect(
      container.querySelector('[data-tip="Character has this — build needs it"]'),
    ).toBeInTheDocument()
  })
})
