import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useRegisterActiveModal,
  useIsAnyModalActive,
  resetActiveModalCountForTests,
} from './useRegisterActiveModal'

beforeEach(() => {
  resetActiveModalCountForTests()
})

describe('useRegisterActiveModal / useIsAnyModalActive', () => {
  it('reports inactive when no modal has registered', () => {
    const { result } = renderHook(() => useIsAnyModalActive())
    expect(result.current).toBe(false)
  })

  it('reports active while a modal asserts itself', () => {
    const reader = renderHook(() => useIsAnyModalActive())
    const modal = renderHook(({ active }) => useRegisterActiveModal(active), {
      initialProps: { active: true },
    })
    expect(reader.result.current).toBe(true)

    modal.unmount()
    expect(reader.result.current).toBe(false)
  })

  it('toggles with the active flag without remounting', () => {
    const reader = renderHook(() => useIsAnyModalActive())
    const modal = renderHook(({ active }) => useRegisterActiveModal(active), {
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
    const reader = renderHook(() => useIsAnyModalActive())
    const modalA = renderHook(() => useRegisterActiveModal(true))
    const modalB = renderHook(() => useRegisterActiveModal(true))
    expect(reader.result.current).toBe(true)

    modalA.unmount()
    expect(reader.result.current).toBe(true)

    modalB.unmount()
    expect(reader.result.current).toBe(false)
  })

  it('gives a late-mounting reader the current state synchronously', () => {
    renderHook(() => useRegisterActiveModal(true))
    const lateReader = renderHook(() => useIsAnyModalActive())
    expect(lateReader.result.current).toBe(true)
  })
})
