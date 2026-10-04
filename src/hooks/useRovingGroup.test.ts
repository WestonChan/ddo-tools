import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRovingGroup } from './useRovingGroup'

describe('useRovingGroup', () => {
  it('consumes navigation keys without focusing the current item again', () => {
    const focusItem = vi.fn()
    const { result } = renderHook(() =>
      useRovingGroup({
        keys: ['items'],
        preferredKey: 'items',
        direction: 'horizontal',
        isWrapping: true,
        focusItem,
      }),
    )

    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      act(() => expect(result.current.moveFocus('items', key)).toBe(true))
    }
    expect(focusItem).not.toHaveBeenCalled()
    expect(result.current.tabStopKey).toBe('items')
  })

  it('moves focus when the target differs and ignores clamped boundary moves', () => {
    const focusItem = vi.fn()
    const { result } = renderHook(() =>
      useRovingGroup({ keys: ['first', 'second'], direction: 'horizontal', focusItem }),
    )

    act(() => expect(result.current.moveFocus('first', 'ArrowLeft')).toBe(true))
    expect(focusItem).not.toHaveBeenCalled()
    act(() => expect(result.current.moveFocus('first', 'ArrowRight')).toBe(true))
    expect(focusItem).toHaveBeenCalledExactlyOnceWith('second')
  })
})
