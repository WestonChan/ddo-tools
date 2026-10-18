import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

interface PackageManifest {
  engines: { node: string }
  devDependencies: Record<string, string>
}

function majorVersionIn(versionRange: string): string {
  const majorVersion = versionRange.match(/\d+/)?.[0]
  if (!majorVersion) throw new Error(`No version number in "${versionRange}"`)
  return majorVersion
}

it('declares one Node major in .nvmrc, engines and @types/node', () => {
  const packageManifest: PackageManifest = JSON.parse(readFileSync('package.json', 'utf8'))
  const declaredMajorVersions = {
    nvmrc: majorVersionIn(readFileSync('.nvmrc', 'utf8')),
    engines: majorVersionIn(packageManifest.engines.node),
    typesNode: majorVersionIn(packageManifest.devDependencies['@types/node']),
  }
  expect(
    new Set(Object.values(declaredMajorVersions)),
    JSON.stringify(declaredMajorVersions),
  ).toHaveProperty('size', 1)
})

it('has every CI job read its Node version from .nvmrc', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8')
  const setupNodeSteps = ciWorkflow.match(/uses: actions\/setup-node@/g) ?? []
  const nvmrcReads = ciWorkflow.match(/node-version-file: \.nvmrc/g) ?? []
  expect(setupNodeSteps.length).toBeGreaterThan(0)
  expect(nvmrcReads).toHaveLength(setupNodeSteps.length)
  expect(ciWorkflow).not.toMatch(/node-version:/)
})
