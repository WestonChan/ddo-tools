import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

interface PackageManifest {
  engines: { node: string }
  devDependencies: Record<string, string>
}

interface NodeDeclarations {
  nvmrc: string
  enginesNode: string
  typesNodeRange: string
}

function nodeMajorDisagreements({
  nvmrc,
  enginesNode,
  typesNodeRange,
}: NodeDeclarations): string[] {
  const major = nvmrc.trim()
  if (!/^\d+$/.test(major)) {
    return [`.nvmrc must hold a bare major number, found "${major}"`]
  }
  const disagreements: string[] = []
  if (enginesNode !== `${major}.x`) {
    disagreements.push(`engines.node must be "${major}.x", found "${enginesNode}"`)
  }
  if (!typesNodeRange.startsWith(`^${major}.`)) {
    disagreements.push(`@types/node must start with "^${major}.", found "${typesNodeRange}"`)
  }
  return disagreements
}

function linesOfEachJob(workflowText: string): Map<string, string[]> {
  const linesByJobName = new Map<string, string[]>()
  let currentJobLines: string[] | undefined
  let isInJobsSection = false
  for (const line of workflowText.split('\n')) {
    if (/^\s*#/.test(line)) continue
    if (/^jobs:\s*$/.test(line)) {
      isInJobsSection = true
    } else if (/^\S/.test(line)) {
      isInJobsSection = false
      currentJobLines = undefined
    } else if (isInJobsSection) {
      const jobName = line.match(/^ {2}([\w-]+):\s*$/)?.[1]
      if (jobName) {
        currentJobLines = []
        linesByJobName.set(jobName, currentJobLines)
      } else {
        currentJobLines?.push(line)
      }
    }
  }
  return linesByJobName
}

function workflowJobsNotReadingNvmrc(workflowText: string): string[] {
  const linesByJobName = linesOfEachJob(workflowText)
  if (linesByJobName.size === 0) return ['(no jobs found)']
  return [...linesByJobName]
    .filter(([, jobLines]) => {
      const setupNodeSteps = jobLines.filter((line) => /uses: actions\/setup-node@/.test(line))
      const nvmrcReads = jobLines.filter((line) => /^\s+node-version-file: \.nvmrc\s*$/.test(line))
      const hasLiteralNodeVersion = jobLines.some((line) => /\bnode-version:/.test(line))
      return setupNodeSteps.length !== 1 || nvmrcReads.length !== 1 || hasLiteralNodeVersion
    })
    .map(([jobName]) => jobName)
}

const agreeingDeclarations: NodeDeclarations = {
  nvmrc: '24\n',
  enginesNode: '24.x',
  typesNodeRange: '^24.19.2',
}

const readingJob = [
  '  lint:',
  '    steps:',
  '      - uses: actions/setup-node@v6',
  '        with:',
  '          node-version-file: .nvmrc',
].join('\n')

function workflowWith(...jobs: string[]): string {
  return ['name: CI', 'jobs:', ...jobs].join('\n')
}

it.each([
  ['an engines range that allows more than one major', { enginesNode: '>=24' }],
  ['an engines range naming two majors', { enginesNode: '22 || 24' }],
  ['an engines major other than .nvmrc', { enginesNode: '22.x' }],
  ['an @types/node major other than .nvmrc', { typesNodeRange: '^26.6.3' }],
  ['an @types/node range that only mentions the major', { typesNodeRange: '>=24' }],
  ['an .nvmrc alias instead of a major', { nvmrc: 'lts/*' }],
  ['an .nvmrc with a full version', { nvmrc: 'v24.15.0' }],
])('rejects %s', (_, changedDeclaration) => {
  expect(nodeMajorDisagreements({ ...agreeingDeclarations, ...changedDeclaration })).not.toEqual([])
})

it('accepts declarations that name one major, whatever the .nvmrc line ending', () => {
  expect(nodeMajorDisagreements(agreeingDeclarations)).toEqual([])
  expect(nodeMajorDisagreements({ ...agreeingDeclarations, nvmrc: '24\r\n' })).toEqual([])
})

it.each([
  ['a workflow with no jobs', 'name: CI\non: push'],
  [
    'a job with no setup-node step',
    workflowWith(readingJob, '  deploy:', '    steps:', '      - run: npm ci'),
  ],
  [
    'a job whose .nvmrc read is commented out',
    workflowWith(readingJob.replace('node-version-file', '# node-version-file')),
  ],
  [
    'a job that pins a literal node-version',
    workflowWith(readingJob.replace('node-version-file: .nvmrc', 'node-version: 22')),
  ],
  [
    'a job that pins a literal node-version next to the .nvmrc read',
    workflowWith(`${readingJob}\n          node-version: 22`),
  ],
])('names the job in %s', (_, workflowText) => {
  expect(workflowJobsNotReadingNvmrc(workflowText)).not.toEqual([])
})

it('accepts a workflow whose every job reads .nvmrc and ignores comments', () => {
  const secondJob = readingJob.replace('lint:', 'test:')
  expect(workflowJobsNotReadingNvmrc(workflowWith(readingJob, secondJob))).toEqual([])
  expect(
    workflowJobsNotReadingNvmrc(workflowWith(`${readingJob}\n          # node-version: 22`)),
  ).toEqual([])
})

it('declares one Node major in .nvmrc, engines and @types/node', () => {
  const packageManifest: PackageManifest = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(
    nodeMajorDisagreements({
      nvmrc: readFileSync('.nvmrc', 'utf8'),
      enginesNode: packageManifest.engines.node,
      typesNodeRange: packageManifest.devDependencies['@types/node'],
    }),
  ).toEqual([])
})

it('has every job in every CI workflow read its Node version from .nvmrc', () => {
  const workflowFileNames = readdirSync('.github/workflows').filter((fileName) =>
    /\.ya?ml$/.test(fileName),
  )
  expect(workflowFileNames.length).toBeGreaterThan(0)
  for (const fileName of workflowFileNames) {
    const workflowText = readFileSync(join('.github/workflows', fileName), 'utf8')
    expect(workflowJobsNotReadingNvmrc(workflowText), fileName).toEqual([])
  }
})
