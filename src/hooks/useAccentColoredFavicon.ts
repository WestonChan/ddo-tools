import { useEffect } from 'react'
import { ACCENT_PRESETS } from '../lib/accent'
import { ampersandMarkSvg } from '../lib/ampersandMarkSvg'

export function useAccentColoredFavicon(): void {
  useEffect(() => {
    let currentFaviconBlobUrl: string | null = null

    function readCssVariable(variableName: string, fallbackValue: string): string {
      const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
      return value || fallbackValue
    }

    function redrawFavicon(): void {
      const faviconSvg = ampersandMarkSvg({
        fillColor: readCssVariable('--accent', ACCENT_PRESETS[0].ramp[400]),
        size: 64,
      })
      const faviconBlob = new Blob([faviconSvg], { type: 'image/svg+xml' })
      const faviconBlobUrl = URL.createObjectURL(faviconBlob)
      let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!faviconLink) {
        faviconLink = document.createElement('link')
        faviconLink.rel = 'icon'
        faviconLink.type = 'image/svg+xml'
        document.head.appendChild(faviconLink)
      }
      const previousFaviconBlobUrl = currentFaviconBlobUrl
      faviconLink.href = faviconBlobUrl
      currentFaviconBlobUrl = faviconBlobUrl
      if (previousFaviconBlobUrl) URL.revokeObjectURL(previousFaviconBlobUrl)
    }

    redrawFavicon()

    const rootStyleObserver = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === 'style')) redrawFavicon()
    })
    rootStyleObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => {
      rootStyleObserver.disconnect()
      if (currentFaviconBlobUrl) URL.revokeObjectURL(currentFaviconBlobUrl)
    }
  }, [])
}
