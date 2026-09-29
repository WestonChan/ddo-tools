import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, type JSX } from 'react'
import { useAddRemoveGestures } from './useAddRemoveGestures'

function AddRemoveGestureHarness({
  onAdd,
  onRemove,
  longPressDelayMs,
}: {
  onAdd: () => void
  onRemove: () => void
  longPressDelayMs?: number
}): JSX.Element {
  const { ref, onClick, onContextMenu } = useAddRemoveGestures(onAdd, onRemove, longPressDelayMs)
  return createElement('div', {
    ref,
    onClick,
    onContextMenu,
    'data-testid': 'target',
  })
}

function dispatchTouchEvent(pressTarget: HTMLElement, touchEventType: 'touchstart' | 'touchend' | 'touchcancel'): void {
  pressTarget.dispatchEvent(new Event(touchEventType, { bubbles: true, cancelable: true }))
}

describe('useAddRemoveGestures', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('desktop: click / right-click', () => {
    it('fires onAdd on left-click', () => {
      const onAdd = vi.fn()
      const onRemove = vi.fn()
      const { getByTestId } = render(createElement(AddRemoveGestureHarness, { onAdd, onRemove }))
      const pressTarget = getByTestId('target')

      act(() => {
        pressTarget.click()
      })

      expect(onAdd).toHaveBeenCalledTimes(1)
      expect(onRemove).not.toHaveBeenCalled()
    })

    it('fires onRemove on right-click', () => {
      const onAdd = vi.fn()
      const onRemove = vi.fn()
      const { getByTestId } = render(createElement(AddRemoveGestureHarness, { onAdd, onRemove }))
      const pressTarget = getByTestId('target')

      act(() => {
        pressTarget.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
      })

      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onAdd).not.toHaveBeenCalled()
    })
  })

  describe('mobile: tap / long-press', () => {
    it('fires onAdd on quick tap (touch start + end before timeout)', () => {
      const onAdd = vi.fn()
      const onRemove = vi.fn()
      const { getByTestId } = render(createElement(AddRemoveGestureHarness, { onAdd, onRemove, longPressDelayMs: 500 }))
      const pressTarget = getByTestId('target')

      act(() => {
        dispatchTouchEvent(pressTarget, 'touchstart')
      })
      act(() => {
        vi.advanceTimersByTime(200)
      })
      act(() => {
        dispatchTouchEvent(pressTarget, 'touchend')
      })

      expect(onAdd).toHaveBeenCalledTimes(1)
      expect(onRemove).not.toHaveBeenCalled()
    })

    it('fires onRemove when held past timeout', () => {
      const onAdd = vi.fn()
      const onRemove = vi.fn()
      const { getByTestId } = render(createElement(AddRemoveGestureHarness, { onAdd, onRemove, longPressDelayMs: 500 }))
      const pressTarget = getByTestId('target')

      act(() => {
        dispatchTouchEvent(pressTarget, 'touchstart')
      })
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(onRemove).toHaveBeenCalledTimes(1)

      act(() => {
        dispatchTouchEvent(pressTarget, 'touchend')
      })
      expect(onAdd).not.toHaveBeenCalled()
    })

    it('does not fire either callback on cancel', () => {
      const onAdd = vi.fn()
      const onRemove = vi.fn()
      const { getByTestId } = render(createElement(AddRemoveGestureHarness, { onAdd, onRemove, longPressDelayMs: 500 }))
      const pressTarget = getByTestId('target')

      act(() => {
        dispatchTouchEvent(pressTarget, 'touchstart')
      })
      act(() => {
        dispatchTouchEvent(pressTarget, 'touchcancel')
      })
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(onAdd).not.toHaveBeenCalled()
      expect(onRemove).not.toHaveBeenCalled()
    })

    it('respects custom timeout duration', () => {
      const onAdd = vi.fn()
      const onRemove = vi.fn()
      const { getByTestId } = render(createElement(AddRemoveGestureHarness, { onAdd, onRemove, longPressDelayMs: 200 }))
      const pressTarget = getByTestId('target')

      act(() => {
        dispatchTouchEvent(pressTarget, 'touchstart')
      })
      act(() => {
        vi.advanceTimersByTime(250)
      })

      expect(onRemove).toHaveBeenCalledTimes(1)
    })
  })
})
