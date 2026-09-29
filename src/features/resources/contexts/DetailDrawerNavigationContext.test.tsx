import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import {
  DetailDrawerNavigationProvider,
  useDetailDrawerNavigation,
  type DetailDrawerNavigation,
} from './DetailDrawerNavigationContext'

function DetailDrawerNavigationReader({
  onRead,
}: {
  onRead: (navigation: DetailDrawerNavigation) => void
}): null {
  const navigation = useDetailDrawerNavigation()
  onRead(navigation)
  return null
}

describe('DetailDrawerNavigationContext', () => {
  it('returns a no-op API when no provider is mounted', () => {
    let capturedNavigation: DetailDrawerNavigation | null = null
    render(
      <DetailDrawerNavigationReader
        onRead={(navigation) => {
          capturedNavigation = navigation
        }}
      />,
    )
    expect(capturedNavigation).not.toBeNull()
    expect(capturedNavigation!.deepLinkUrl).toBeNull()
    expect(capturedNavigation!.pickerCategory).toBe('items')
    expect(() => capturedNavigation!.pushResource({ category: 'items', id: 42 })).not.toThrow()
    expect(() => capturedNavigation!.closeDrawer()).not.toThrow()
  })

  it('forwards the provided API through the provider', () => {
    const pushResource = vi.fn()
    const closeDrawer = vi.fn()
    let capturedNavigation: DetailDrawerNavigation | null = null
    render(
      <DetailDrawerNavigationProvider
        navigation={{
          pushResource,
          closeDrawer,
          deepLinkUrl: 'https://example.test/x',
          pickerCategory: 'items',
        }}
      >
        <DetailDrawerNavigationReader
          onRead={(navigation) => {
            capturedNavigation = navigation
          }}
        />
      </DetailDrawerNavigationProvider>,
    )
    capturedNavigation!.pushResource({ category: 'items', id: 7 })
    expect(pushResource).toHaveBeenCalledWith({ category: 'items', id: 7 })
    capturedNavigation!.closeDrawer()
    expect(closeDrawer).toHaveBeenCalled()
    expect(capturedNavigation!.deepLinkUrl).toBe('https://example.test/x')
  })
})
