import { render, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { createElement, type Dispatch, type JSX, type SetStateAction } from 'react'
import { useLocalStorage } from './useLocalStorage'

let lastSetter: Dispatch<SetStateAction<unknown>> = () => {}

function LocalStorageHarness({
  storageKey,
  initialValue,
  onRender,
}: {
  storageKey: string
  initialValue: unknown
  onRender: (val: unknown, set: Dispatch<SetStateAction<unknown>>) => void
}): JSX.Element {
  const [storedValue, setStoredValue] = useLocalStorage(storageKey, initialValue)
  onRender(storedValue, setStoredValue as Dispatch<SetStateAction<unknown>>)
  return createElement('div', { 'data-testid': 'value' }, JSON.stringify(storedValue))
}

function renderLocalStorageHook(
  storageKey: string,
  initial: unknown,
): {
  getValue: () => unknown
  getSetter: () => Dispatch<SetStateAction<unknown>>
} {
  let lastRenderedValue: unknown
  const onRender = (
    renderedValue: unknown,
    setStoredValue: Dispatch<SetStateAction<unknown>>,
  ): void => {
    lastRenderedValue = renderedValue
    lastSetter = setStoredValue
  }
  render(createElement(LocalStorageHarness, { storageKey, initialValue: initial, onRender }))
  return { getValue: () => lastRenderedValue, getSetter: () => lastSetter }
}

function renderTwoLocalStorageHooks(
  key: string,
  initialValue: unknown,
): {
  getValueA: () => unknown
  getValueB: () => unknown
  getSetterA: () => Dispatch<SetStateAction<unknown>>
  getSetterB: () => Dispatch<SetStateAction<unknown>>
} {
  let valueA: unknown, valueB: unknown
  let setterA: Dispatch<SetStateAction<unknown>> = () => {}
  let setterB: Dispatch<SetStateAction<unknown>> = () => {}

  const onRenderA = (
    renderedValue: unknown,
    setStoredValue: Dispatch<SetStateAction<unknown>>,
  ): void => {
    valueA = renderedValue
    setterA = setStoredValue
  }
  const onRenderB = (
    renderedValue: unknown,
    setStoredValue: Dispatch<SetStateAction<unknown>>,
  ): void => {
    valueB = renderedValue
    setterB = setStoredValue
  }

  render(
    createElement(
      'div',
      null,
      createElement(LocalStorageHarness, { storageKey: key, initialValue, onRender: onRenderA }),
      createElement(LocalStorageHarness, { storageKey: key, initialValue, onRender: onRenderB }),
    ),
  )
  return {
    getValueA: () => valueA,
    getValueB: () => valueB,
    getSetterA: () => setterA,
    getSetterB: () => setterB,
  }
}

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initialValue when localStorage is empty', () => {
    const { getValue } = renderLocalStorageHook('test-key', 'hello')
    expect(getValue()).toBe('hello')
  })

  it('returns stored value when localStorage has data', () => {
    localStorage.setItem('test-key', JSON.stringify({ a: 1 }))
    const { getValue } = renderLocalStorageHook('test-key', {})
    expect(getValue()).toEqual({ a: 1 })
  })

  it('writes to localStorage when value changes', () => {
    const { getValue, getSetter } = renderLocalStorageHook('test-key', 'start')
    act(() => {
      getSetter()('updated')
    })
    expect(getValue()).toBe('updated')
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('updated')
  })

  it('falls back to initialValue when stored data is corrupt JSON', () => {
    localStorage.setItem('test-key', 'not-valid-json{{{')
    const { getValue } = renderLocalStorageHook('test-key', 'fallback')
    expect(getValue()).toBe('fallback')
  })

  it('works with functional updater form of setState', () => {
    const { getValue, getSetter } = renderLocalStorageHook('test-key', 5)
    act(() => {
      getSetter()((prev: unknown) => (prev as number) + 10)
    })
    expect(getValue()).toBe(15)
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(15)
  })

  it('syncs value across two hook instances sharing the same key', () => {
    const { getValueA, getValueB, getSetterA } = renderTwoLocalStorageHooks('sync-key', 'initial')
    expect(getValueA()).toBe('initial')
    expect(getValueB()).toBe('initial')

    act(() => {
      getSetterA()('updated-by-A')
    })

    expect(getValueA()).toBe('updated-by-A')
    expect(getValueB()).toBe('updated-by-A')
    expect(JSON.parse(localStorage.getItem('sync-key')!)).toBe('updated-by-A')
  })

  it('syncs in both directions', () => {
    const { getValueA, getValueB, getSetterA, getSetterB } = renderTwoLocalStorageHooks(
      'sync-key',
      0,
    )

    act(() => {
      getSetterA()(10)
    })
    expect(getValueA()).toBe(10)
    expect(getValueB()).toBe(10)

    act(() => {
      getSetterB()(20)
    })
    expect(getValueA()).toBe(20)
    expect(getValueB()).toBe(20)
  })
})
