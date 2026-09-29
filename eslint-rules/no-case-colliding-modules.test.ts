import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { noCaseCollidingModules } from './no-case-colliding-modules.js'

function directoryWith(fileNames: string[]): string {
  const directory = mkdtempSync(join(tmpdir(), 'case-colliding-'))
  for (const fileName of fileNames) writeFileSync(join(directory, fileName), 'export {}\n')
  return directory
}

const distinctModules = directoryWith(['characterContext.ts', 'CharacterProvider.tsx', 'CharacterProvider.test.tsx', 'Modal.css'])
const caseColliding = directoryWith(['characterContext.ts', 'CharacterContext.tsx'])
const extensionColliding = directoryWith(['itemSearch.ts', 'itemSearch.tsx'])

const tester = new RuleTester({
  languageOptions: { parser: tseslint.parser },
})

tester.run('no-case-colliding-modules', noCaseCollidingModules, {
  valid: [
    { code: 'export {}\n', filename: join(distinctModules, 'characterContext.ts') },
    { code: 'export {}\n', filename: join(distinctModules, 'CharacterProvider.tsx') },
  ],
  invalid: [
    {
      code: 'export {}\n',
      filename: join(caseColliding, 'characterContext.ts'),
      errors: [{ messageId: 'caseCollidingModule', data: { siblingFileName: 'CharacterContext.tsx' } }],
    },
    {
      code: 'export {}\n',
      filename: join(extensionColliding, 'itemSearch.tsx'),
      errors: [{ messageId: 'caseCollidingModule', data: { siblingFileName: 'itemSearch.ts' } }],
    },
  ],
})
