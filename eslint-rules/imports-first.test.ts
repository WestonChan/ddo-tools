import { RuleTester, type Rule } from 'eslint'
import tseslint from 'typescript-eslint'
import { importsFirst } from './imports-first.js'

const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } })

tester.run('imports-first', importsFirst as Rule.RuleModule, {
  valid: [
    '',
    'export const value = 1',
    "import { value } from './value'; import type { Kind } from './kind'; export { value }",
    "import './setup'; import * as values from './values'; values.read()",
    "// Leading comment\nimport value from './value'; export default value",
    "const module = import('./value')",
  ],
  invalid: [
    {
      code: "const value = 1; import { other } from './other'",
      errors: [{ messageId: 'importsFirst' }],
    },
    {
      code: "export const value = 1; import type { Kind } from './kind'",
      errors: [{ messageId: 'importsFirst' }],
    },
    {
      code: "'use client'; import './setup'",
      errors: [{ messageId: 'importsFirst' }],
    },
    {
      code: "import './setup'; function read() {} import a from './a'; import b from './b'",
      errors: [{ messageId: 'importsFirst' }, { messageId: 'importsFirst' }],
    },
    {
      code: "; import './setup'",
      errors: [{ messageId: 'importsFirst' }],
    },
  ],
})
