import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'

const proxyControls = ['underline-tab', 'segmented-control-segment']

function sourcePaths(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourcePaths(path) : path.endsWith('.tsx') ? [path] : []
  })
}

function unprotectedControls(path: string, source: string): string[] {
  const syntaxTree = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const violations: string[] = []
  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const classAttribute = node.attributes.properties.find(
        (attribute) =>
          ts.isJsxAttribute(attribute) && attribute.name.getText(syntaxTree) === 'className',
      )
      const classSource = classAttribute?.getText(syntaxTree) ?? ''
      if (
        proxyControls.some((control) => new RegExp(`\\b${control}\\b`).test(classSource)) &&
        !classSource.includes('focus-ring-proxy')
      ) {
        const location = syntaxTree.getLineAndCharacterOfPosition(node.getStart(syntaxTree))
        violations.push(`${path}:${location.line + 1}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(syntaxTree)
  return violations
}

it('requires a ring proxy on every underline tab and segmented control', () => {
  const violations = sourcePaths('src').flatMap((path) =>
    unprotectedControls(path, readFileSync(path, 'utf8')),
  )
  expect(violations).toEqual([])
})

it('detects a tab without its proxy', () => {
  expect(
    unprotectedControls('missing.tsx', '<button className="underline-tab">Tab</button>'),
  ).toEqual(['missing.tsx:1'])
})
