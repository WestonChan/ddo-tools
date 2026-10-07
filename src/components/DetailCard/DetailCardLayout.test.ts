import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import stylelint from 'stylelint'
import { expect, it } from 'vitest'

const sharedCardClass =
  /\.(?:detail-card(?:__[-\w]+)?|detail-fact-grid(?:__[-\w]+)?|detail-stats(?:__[-\w]+)?|detail-dr-bypass(?:__[-\w]+)?|detail-extras(?:__[-\w]+)?|detail-value-row(?:__[-\w]+)?|augment-slot-word(?:__[-\w]+)?|resources-(?:detail-description|augment-candidates|augment-slot-display|effect-ledger|effect-bonus-group|effect-group-member|effect-ungrouped-bonus|effect-damage|item-source-[-\w]+|clicky-[-\w]+|hover-row|hover-rows|hover-definition|hover-origin|source-item-details|set-tier))\b/

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? cssFiles(path) : entry.name.endsWith('.css') ? [path] : []
  })
}

async function auditedCss(
  css: string,
): Promise<{ layoutDeclarations: string[]; invalidTokens: string[] }> {
  const layoutDeclarations: string[] = []
  const invalidTokens: string[] = []
  const auditRule: stylelint.Rule = Object.assign(
    () => (root: Parameters<ReturnType<stylelint.Rule>>[0]) => {
      root.walkRules((rule) => {
        let selector = rule.selector
        let parent = rule.parent
        while (parent?.type === 'rule') {
          selector = selector.includes('&')
            ? selector.replaceAll('&', parent.selector)
            : `${parent.selector} ${selector}`
          parent = parent.parent
        }
        const isHoverScope =
          selector.includes('.detail-card--hover') || selector.includes('.hover-card')
        if (isHoverScope && sharedCardClass.test(selector)) {
          rule.walkDecls((declaration) => {
            if (declaration.parent === rule && !declaration.prop.startsWith('--')) {
              layoutDeclarations.push(`${selector}: ${declaration.prop}`)
            }
          })
        }
      })
      root.walkDecls(/^--detail-card-/, (declaration) => {
        const property = declaration.prop
        const value = declaration.value.trim()
        const scale = property.endsWith('-height')
          ? /^(?:1lh|var\(--space-[a-z0-9-]+\))$/
          : property.endsWith('-size')
            ? /^var\(--fs-[a-z0-9-]+\)$/
            : property.endsWith('-shadow')
              ? /^(?:var\(--(?:shadow|inset|ring|glow)-[a-z0-9-]+\)|none)$/
              : /^(?:0|transparent|none|var\(--(?:space|surface|border)-[a-z0-9-]+\)|1px solid var\(--border-[a-z0-9-]+\)|calc\(var\(--space-[a-z0-9-]+\) \* \d+\))$/
        if (!scale.test(value)) invalidTokens.push(`${property}: ${value}`)
      })
    },
    { ruleName: 'detail-card/no-hover-layout', messages: {} },
  )
  const auditPlugin = stylelint.createPlugin('detail-card/no-hover-layout', auditRule)
  await stylelint.lint({
    code: css,
    config: { plugins: [auditPlugin], rules: { 'detail-card/no-hover-layout': true } },
  })
  return { layoutDeclarations, invalidTokens }
}

it('finds direct and nested hover layout overrides in any stylesheet', async () => {
  expect(
    (await auditedCss('.hover-card .detail-card__facts { flex-direction: column }'))
      .layoutDeclarations,
  ).toEqual(['.hover-card .detail-card__facts: flex-direction'])
  expect(
    (await auditedCss('.hover-card { & .resources-detail-description { color: red } }'))
      .layoutDeclarations,
  ).toEqual(['.hover-card .resources-detail-description: color'])
  expect(
    (await auditedCss('.detail-card { --detail-card-body-padding: 7px }')).invalidTokens,
  ).toEqual(['--detail-card-body-padding: 7px'])
  expect(
    (await auditedCss('.detail-card { --detail-card-kicker-row-height: 21px }')).invalidTokens,
  ).toEqual(['--detail-card-kicker-row-height: 21px'])
})

it('keeps shared detail layout and its tokens on the same scales in every stylesheet', async () => {
  const results = await Promise.all(
    cssFiles('src').map(async (stylesheet) => ({
      stylesheet,
      audit: await auditedCss(readFileSync(stylesheet, 'utf8')),
    })),
  )
  expect(
    results.flatMap(({ stylesheet, audit }) =>
      audit.layoutDeclarations.map((declaration) => `${relative('.', stylesheet)}: ${declaration}`),
    ),
  ).toEqual([])
  expect(
    results.flatMap(({ stylesheet, audit }) =>
      audit.invalidTokens.map((token) => `${relative('.', stylesheet)}: ${token}`),
    ),
  ).toEqual([])
})
