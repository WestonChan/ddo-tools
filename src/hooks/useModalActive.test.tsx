import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useModalActive,
  useAnyModalActive,
  _resetModalActiveForTests,
} from './useModalActive'

beforeEach(() => {
  _resetModalActiveForTests()
})

describe('useModalActive / useAnyModalActive', () => {
  it('reports inactive when no modal has registered', () => {
    const { result } = renderHook(() => useAnyModalActive())
    expect(result.current).toBe(false)
  })

  it('reports active while a modal asserts itself', () => {
    const reader = renderHook(() => useAnyModalActive())
    const modal = renderHook(({ active }) => useModalActive(active), {
      initialProps: { active: true },
    })
    expect(reader.result.current).toBe(true)

    modal.unmount()
    expect(reader.result.current).toBe(false)
  })

  it('toggles with the active flag without remounting', () => {
    const reader = renderHook(() => useAnyModalActive())
    const modal = renderHook(({ active }) => useModalActive(active), {
      initialProps: { active: false },
    })
    expect(reader.result.current).toBe(false)

    act(() => {
      modal.rerender({ active: true })
    })
    expect(reader.result.current).toBe(true)

    act(() => {
      modal.rerender({ active: false })
    })
    expect(reader.result.current).toBe(false)
  })

  it('refcounts stacked modals — background stays inert until BOTH close', () => {
    const reader = renderHook(() => useAnyModalActive())
    const modalA = renderHook(() => useModalActive(true))
    const modalB = renderHook(() => useModalActive(true))
    expect(reader.result.current).toBe(true)

    modalA.unmount()
    expect(reader.result.current).toBe(true)

    modalB.unmount()
    expect(reader.result.current).toBe(false)
  })

  it('gives a late-mounting reader the current state synchronously', () => {
    renderHook(() => useModalActive(true))
    const lateReader = renderHook(() => useAnyModalActive())
    expect(lateReader.result.current).toBe(true)
  })
})
