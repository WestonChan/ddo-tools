import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import {
  DetailNavigationProvider,
  useDetailNavigation,
  type DetailNavigation,
} from './DetailNavigationContext'

function DetailNavigationReader({
  onRead,
}: {
  onRead: (navigation: DetailNavigation) => void
}): null {
  const navigation = useDetailNavigation()
  onRead(navigation)
  return null
}

describe('DetailNavigationContext', () => {
  it('returns a no-op API when no provider is mounted', () => {
    let capturedNavigation: DetailNavigation | null = null
    render(
      <DetailNavigationReader
        onRead={(navigation) => {
          capturedNavigation = navigation
        }}
      />,
    )
    expect(capturedNavigation).not.toBeNull()
    expect(capturedNavigation!.deepLinkUrl).toBeNull()
    expect(capturedNavigation!.pickerCategory).toBe('items')
    expect(() => capturedNavigation!.pushResource({ category: 'items', id: 42 })).not.toThrow()
    expect(() => capturedNavigation!.closeDetail()).not.toThrow()
  })

  it('forwards the provided API through the provider', () => {
    const pushResource = vi.fn()
    const closeDetail = vi.fn()
    let capturedNavigation: DetailNavigation | null = null
    render(
      <DetailNavigationProvider
        navigation={{
          pushResource,
          closeDetail,
          deepLinkUrl: 'https://example.test/x',
          pickerCategory: 'items',
        }}
      >
        <DetailNavigationReader
          onRead={(navigation) => {
            capturedNavigation = navigation
          }}
        />
      </DetailNavigationProvider>,
    )
    capturedNavigation!.pushResource({ category: 'items', id: 7 })
    expect(pushResource).toHaveBeenCalledWith({ category: 'items', id: 7 })
    capturedNavigation!.closeDetail()
    expect(closeDetail).toHaveBeenCalled()
    expect(capturedNavigation!.deepLinkUrl).toBe('https://example.test/x')
  })
})
