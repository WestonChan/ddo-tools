import { render, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { createElement, type Dispatch, type JSX, type SetStateAction } from 'react'
import { useLocalStorage } from './useLocalStorage'

// Store the setter via a callback prop — avoids lint issues with refs and globals
let setter: Dispatch<SetStateAction<unknown>> = () => {}

function TestComponent({
  storageKey,
  initial,
  onRender,
}: {
  storageKey: string
  initial: unknown
  onRender: (val: unknown, set: Dispatch<SetStateAction<unknown>>) => void
}): JSX.Element {
  const [value, setValue] = useLocalStorage(storageKey, initial)
  onRender(value, setValue as Dispatch<SetStateAction<unknown>>)
  return createElement('div', { 'data-testid': 'value' }, JSON.stringify(value))
}

function renderHook(key: string, initial: unknown): {
  getValue: () => unknown
  getSetter: () => Dispatch<SetStateAction<unknown>>
} {
  let lastValue: unknown
  const onRender = (val: unknown, set: Dispatch<SetStateAction<unknown>>): void => {
    lastValue = val
    setter = set
  }
  render(createElement(TestComponent, { storageKey: key, initial, onRender }))
  return { getValue: () => lastValue, getSetter: () => setter }
}

/** Render two components sharing the same localStorage key, returning both values and setters. */
function renderTwoHooks(key: string, initial: unknown): {
  getA: () => unknown
  getB: () => unknown
  setA: () => Dispatch<SetStateAction<unknown>>
  setB: () => Dispatch<SetStateAction<unknown>>
} {
  let valueA: unknown, valueB: unknown
  let setterA: Dispatch<SetStateAction<unknown>> = () => {}
  let setterB: Dispatch<SetStateAction<unknown>> = () => {}

  const onRenderA = (val: unknown, set: Dispatch<SetStateAction<unknown>>): void => {
    valueA = val
    setterA = set
  }
  const onRenderB = (val: unknown, set: Dispatch<SetStateAction<unknown>>): void => {
    valueB = val
    setterB = set
  }

  render(
    createElement(
      'div',
      null,
      createElement(TestComponent, { storageKey: key, initial, onRender: onRenderA }),
      createElement(TestComponent, { storageKey: key, initial, onRender: onRenderB }),
    ),
  )
  return {
    getA: () => valueA,
    getB: () => valueB,
    setA: () => setterA,
    setB: () => setterB,
  }
}

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initialValue when localStorage is empty', () => {
    const { getValue } = renderHook('test-key', 'hello')
    expect(getValue()).toBe('hello')
  })

  it('returns stored value when localStorage has data', () => {
    localStorage.setItem('test-key', JSON.stringify({ a: 1 }))
    const { getValue } = renderHook('test-key', {})
    expect(getValue()).toEqual({ a: 1 })
  })

  it('writes to localStorage when value changes', () => {
    const { getValue, getSetter } = renderHook('test-key', 'start')
    act(() => {
      getSetter()('updated')
    })
    expect(getValue()).toBe('updated')
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('updated')
  })

  it('falls back to initialValue when stored data is corrupt JSON', () => {
    localStorage.setItem('test-key', 'not-valid-json{{{')
    const { getValue } = renderHook('test-key', 'fallback')
    expect(getValue()).toBe('fallback')
  })

  it('works with functional updater form of setState', () => {
    const { getValue, getSetter } = renderHook('test-key', 5)
    act(() => {
      getSetter()((prev: unknown) => (prev as number) + 10)
    })
    expect(getValue()).toBe(15)
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(15)
  })

  it('syncs value across two hook instances sharing the same key', () => {
    const { getA, getB, setA } = renderTwoHooks('sync-key', 'initial')
    expect(getA()).toBe('initial')
    expect(getB()).toBe('initial')

    act(() => {
      setA()('updated-by-A')
    })

    expect(getA()).toBe('updated-by-A')
    expect(getB()).toBe('updated-by-A')
    expect(JSON.parse(localStorage.getItem('sync-key')!)).toBe('updated-by-A')
  })

  it('syncs in both directions', () => {
    const { getA, getB, setA, setB } = renderTwoHooks('sync-key', 0)

    act(() => {
      setA()(10)
    })
    expect(getA()).toBe(10)
    expect(getB()).toBe(10)

    act(() => {
      setB()(20)
    })
    expect(getA()).toBe(20)
    expect(getB()).toBe(20)
  })
})
