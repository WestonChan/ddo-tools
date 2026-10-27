import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { createPersistedValueFamily } from '../lib/persistedState'
import { usePersistedState } from './usePersistedState'

const labelFamily = createPersistedValueFamily<string, string>({
  storageArea: 'localStorage',
  storageKeyFor: (familyKey) => `test:label:${familyKey}`,
  codec: 'text',
  defaultValue: 'none',
  validatedValue: (candidate) => (typeof candidate === 'string' ? candidate : undefined),
})

function Label({ familyKey, testId }: { familyKey: string; testId: string }): JSX.Element {
  return <p data-testid={testId}>{usePersistedState(labelFamily(familyKey))}</p>
}

describe('usePersistedState', () => {
  it('shows the stored value on first render', () => {
    localStorage.setItem('test:label:a', 'stored')
    render(<Label familyKey="a" testId="label" />)
    expect(screen.getByTestId('label')).toHaveTextContent('stored')
  })

  it('updates every component on the same state after a save', () => {
    render(
      <>
        <Label familyKey="a" testId="first" />
        <Label familyKey="a" testId="second" />
      </>,
    )
    act(() => {
      labelFamily('a').save('changed')
    })
    expect(screen.getByTestId('first')).toHaveTextContent('changed')
    expect(screen.getByTestId('second')).toHaveTextContent('changed')
  })

  it('re-subscribes when the family key changes', () => {
    labelFamily('a').save('from a')
    labelFamily('b').save('from b')
    const { rerender } = render(<Label familyKey="a" testId="label" />)
    expect(screen.getByTestId('label')).toHaveTextContent('from a')
    rerender(<Label familyKey="b" testId="label" />)
    expect(screen.getByTestId('label')).toHaveTextContent('from b')
    act(() => {
      labelFamily('a').save('ignored')
      labelFamily('b').save('seen')
    })
    expect(screen.getByTestId('label')).toHaveTextContent('seen')
  })

  it('renders the same snapshot on every render without a save', () => {
    const seenSnapshots: string[] = []
    function Probe(): JSX.Element {
      seenSnapshots.push(usePersistedState(labelFamily('a')))
      return <p />
    }
    const { rerender } = render(<Probe />)
    rerender(<Probe />)
    expect(new Set(seenSnapshots).size).toBe(1)
  })
})
