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
  if (!new RegExp(`^\\^${major}\\.\\d+\\.\\d+$`).test(typesNodeRange)) {
    disagreements.push(`@types/node must be "^${major}.x.y", found "${typesNodeRange}"`)
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
      if (/^ {2}\S/.test(line)) {
        const jobName = line.match(/^ {2}(["']?)([\w-]+)\1:\s*(#.*)?$/)?.[2] ?? line.trim()
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
    .filter(([jobName, jobLines]) => {
      const isUnreadableJobLine = !/^[\w-]+$/.test(jobName)
      const setupNodeSteps = jobLines.filter((line) => /uses: actions\/setup-node@/.test(line))
      const nvmrcReads = jobLines.filter((line) => /^\s+node-version-file: \.nvmrc\s*$/.test(line))
      const hasLiteralNodeVersion = jobLines.some((line) => /\bnode-version:/.test(line))
      return (
        isUnreadableJobLine ||
        setupNodeSteps.length !== 1 ||
        nvmrcReads.length !== 1 ||
        hasLiteralNodeVersion
      )
    })
    .map(([jobName]) => jobName)
}

const agreeingDeclarations: NodeDeclarations = {
  nvmrc: '24\n',
  enginesNode: '24.x',
  typesNodeRange: '^24.19.2',
}

const jobReadingNvmrc = [
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
  ['an @types/node range that also allows another major', { typesNodeRange: '^24.0.0 || ^26.0.0' }],
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
    'a job whose key has a trailing comment and no setup-node step',
    workflowWith(
      jobReadingNvmrc,
      '  deploy: # ships the site',
      '    steps:',
      '      - run: npm ci',
    ),
  ],
  [
    'a first job whose key has a trailing comment and no setup-node step',
    workflowWith(
      '  deploy: # ships the site',
      '    steps:',
      '      - run: npm ci',
      jobReadingNvmrc,
    ),
  ],
  [
    'a first job with a quoted key and no setup-node step',
    workflowWith('  "preflight":', '    steps:', '      - run: npm ci', jobReadingNvmrc),
  ],
  [
    'a job with no setup-node step',
    workflowWith(jobReadingNvmrc, '  deploy:', '    steps:', '      - run: npm ci'),
  ],
  [
    'a job whose .nvmrc read is commented out',
    workflowWith(jobReadingNvmrc.replace('node-version-file', '# node-version-file')),
  ],
  [
    'a job that pins a literal node-version',
    workflowWith(jobReadingNvmrc.replace('node-version-file: .nvmrc', 'node-version: 22')),
  ],
  [
    'a job that pins a literal node-version next to the .nvmrc read',
    workflowWith(`${jobReadingNvmrc}\n          node-version: 22`),
  ],
])('names the job in %s', (_, workflowText) => {
  expect(workflowJobsNotReadingNvmrc(workflowText)).not.toEqual([])
})

it('accepts a workflow whose every job reads .nvmrc and ignores comments', () => {
  const secondJob = jobReadingNvmrc.replace('lint:', 'test:')
  expect(workflowJobsNotReadingNvmrc(workflowWith(jobReadingNvmrc, secondJob))).toEqual([])
  const quotedAndCommentedJob = jobReadingNvmrc.replace('  lint:', '  "lint": # the lint job')
  expect(workflowJobsNotReadingNvmrc(workflowWith(quotedAndCommentedJob))).toEqual([])
  expect(
    workflowJobsNotReadingNvmrc(workflowWith(`${jobReadingNvmrc}\n          # node-version: 22`)),
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
