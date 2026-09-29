import { RuleTester, type Rule } from 'eslint'
import tseslint from 'typescript-eslint'
import { noComments } from './no-comments.js'

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

tester.run('no-comments', noComments as Rule.RuleModule, {
  valid: [
    'const a = 1\n',
    '/// <reference types="vite/client" />\n',
    '/* eslint-disable no-console */\nexport const a = 1\n',
    'console.log(1) // eslint-disable-line no-console\n',
    '// eslint-disable-next-line no-console\nconsole.log(1)\n',
    '// @ts-expect-error missing types\nconst a = b\n',
    '/* global window */\n',
  ],
  invalid: [
    {
      code: '// whole-line comment\nconst a = 1\n',
      output: 'const a = 1\n',
      errors: [{ messageId: 'noComments' }],
    },
    {
      code: 'const a = 1 // trailing comment\n',
      output: 'const a = 1\n',
      errors: [{ messageId: 'noComments' }],
    },
    {
      code: '  // indented comment\n  const a = 1\n',
      output: '  const a = 1\n',
      errors: [{ messageId: 'noComments' }],
    },
    {
      code: '/**\n * Doc block.\n * @param a thing\n */\nfunction f(a: number): number {\n  return a\n}\n',
      output: 'function f(a: number): number {\n  return a\n}\n',
      errors: [{ messageId: 'noComments' }],
    },
    {
      code: 'const a = /* inline */ 1\n',
      output: 'const a = 1\n',
      errors: [{ messageId: 'noComments' }],
    },
    {
      code: 'const x = (\n  <div>\n    {/* jsx comment */}\n    <span />\n  </div>\n)\n',
      output: 'const x = (\n  <div>\n    <span />\n  </div>\n)\n',
      errors: [{ messageId: 'noComments' }],
    },
    {
      code: 'const x = <div>{/* jsx comment */}</div>\n',
      output: 'const x = <div></div>\n',
      errors: [{ messageId: 'noComments' }],
    },
    {
      code: '// one\n// two\nconst a = 1\n',
      output: '// two\nconst a = 1\n',
      errors: [{ messageId: 'noComments' }, { messageId: 'noComments' }],
    },
    {
      code: 'interface P {\n  /** the name */\n  name: string\n}\n',
      output: 'interface P {\n  name: string\n}\n',
      errors: [{ messageId: 'noComments' }],
    },
  ],
})
