import { describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import { appFontFaces, loadAppFonts } from './appFonts'

function googleFontFacesFromIndexHtml(): Array<{
  family: string
  weight: number
  style: 'normal' | 'italic'
}> {
  const fontStylesheetUrl = indexHtml.match(
    /href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/,
  )?.[1]
  if (!fontStylesheetUrl) throw new Error('Google Fonts stylesheet missing from index.html')
  return new URL(fontStylesheetUrl).searchParams.getAll('family').flatMap((familyParameter) => {
    const [family, faceParameters] = familyParameter.split(':')
    if (!faceParameters) return [{ family, weight: 400, style: 'normal' as const }]
    const [axes, faceValues] = faceParameters.split('@')
    if (!faceValues) throw new Error(`Google Fonts faces missing for ${family}`)
    if (axes === 'wght') {
      return faceValues.split(';').map((weight) => ({
        family,
        weight: Number(weight),
        style: 'normal' as const,
      }))
    }
    if (axes === 'ital,wght') {
      return faceValues.split(';').map((faceValue) => {
        const [italic, weight] = faceValue.split(',')
        return {
          family,
          weight: Number(weight),
          style: italic === '1' ? ('italic' as const) : ('normal' as const),
        }
      })
    }
    throw new Error(`Unexpected Google Fonts axes: ${axes}`)
  })
}

describe('app fonts', () => {
  it('lists every face requested by index.html', () => {
    const byFace = (face: { family: string; weight: number; style: string }): string =>
      `${face.family}/${face.weight}/${face.style}`
    expect(appFontFaces.map(byFace).sort()).toEqual(
      googleFontFacesFromIndexHtml().map(byFace).sort(),
    )
  })

  it('requests every face in parallel and settles after failed faces', async () => {
    const pendingLoads: Array<{
      resolve: (faces: FontFace[]) => void
      reject: (reason: Error) => void
    }> = []
    const fontSet = {
      load: vi.fn(
        () =>
          new Promise<FontFace[]>((resolve, reject) => {
            pendingLoads.push({ resolve, reject })
          }),
      ),
    }
    let hasSettled = false
    const fontsReady = loadAppFonts(fontSet)
    void fontsReady.then(() => {
      hasSettled = true
    })
    expect(fontSet.load).toHaveBeenCalledTimes(9)
    expect(fontSet.load).toHaveBeenCalledWith('normal 400 16px "IM Fell DW Pica SC"')
    expect(fontSet.load).toHaveBeenCalledWith('italic 400 16px "Source Sans 3"')
    expect(fontSet.load).toHaveBeenCalledWith('normal 700 16px "JetBrains Mono"')
    pendingLoads[0].reject(new Error('font CDN unavailable'))
    for (const pendingLoad of pendingLoads.slice(1)) pendingLoad.resolve([])
    await fontsReady
    expect(hasSettled).toBe(true)
  })
})
