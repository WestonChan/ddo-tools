import indexHtml from '../../index.html?raw'

const PRE_PAINT_SCRIPT_PATTERN = /<script>([\s\S]*?)<\/script>/

export function runPrePaintScript(): void {
  const prePaintScript = PRE_PAINT_SCRIPT_PATTERN.exec(indexHtml)?.[1]
  if (!prePaintScript) throw new Error('index.html has no inline pre-paint script')
  new Function(prePaintScript)()
}
