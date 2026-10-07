interface AppFontFace {
  family: string
  weight: number
  style: 'normal' | 'italic'
}

export const appFontFaces: ReadonlyArray<AppFontFace> = [
  { family: 'IM Fell DW Pica SC', weight: 400, style: 'normal' },
  { family: 'Source Sans 3', weight: 400, style: 'normal' },
  { family: 'Source Sans 3', weight: 500, style: 'normal' },
  { family: 'Source Sans 3', weight: 600, style: 'normal' },
  { family: 'Source Sans 3', weight: 700, style: 'normal' },
  { family: 'Source Sans 3', weight: 400, style: 'italic' },
  { family: 'JetBrains Mono', weight: 400, style: 'normal' },
  { family: 'JetBrains Mono', weight: 500, style: 'normal' },
  { family: 'JetBrains Mono', weight: 700, style: 'normal' },
]

export function loadAppFonts(
  fontSet: Pick<FontFaceSet, 'load'> | undefined = document.fonts,
): Promise<void> {
  if (!fontSet?.load) return Promise.resolve()
  return Promise.allSettled(
    appFontFaces.map((face) => fontSet.load(`${face.style} ${face.weight} 16px "${face.family}"`)),
  ).then(() => {})
}
