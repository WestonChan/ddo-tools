import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { noComments } from './eslint-rules/no-comments.js'

const FEATURE_NAMES = ['character', 'gear', 'landing', 'resources', 'settings']

function restrictedImportRegexes(restrictions) {
  return ['error', { patterns: restrictions.map(({ regex, message }) => ({ regex, message })) }]
}

const sharedCodeImportRestriction = {
  files: ['src/components/**', 'src/hooks/**', 'src/lib/**', 'src/stores/**', 'src/test/**'],
  rules: {
    'no-restricted-imports': restrictedImportRegexes([
      { regex: '^(\\.\\./)+(features|app)(/|$)', message: 'Shared code never imports from features/ or app/.' },
    ]),
  },
}

const featureImportRestrictions = FEATURE_NAMES.map((featureName) => ({
  files: [`src/features/${featureName}/**`],
  rules: {
    'no-restricted-imports': restrictedImportRegexes([
      { regex: '^(\\.\\./)+app(/|$)', message: 'Features never import from app/.' },
      {
        regex: `^(\\.\\./)+(features/)?(${FEATURE_NAMES.filter((other) => other !== featureName).join('|')})(/|$)`,
        message: 'Features never import from each other; move shared code to src/components, src/hooks or src/lib.',
      },
    ]),
  },
}))

const barrelReExportRestriction = {
  files: ['src/**/index.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ExportNamedDeclaration[source.value=/^\\.\\.\\//], ExportAllDeclaration[source.value=/^\\.\\.\\//]',
        message: "A barrel re-exports its own directory's modules, never a sibling directory's.",
      },
    ],
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      local: { rules: { 'no-comments': noComments } },
    },
    rules: {
      'local/no-comments': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      }],
      'object-shorthand': ['error', 'always'],
      'no-useless-rename': 'error',
    },
  },
  sharedCodeImportRestriction,
  ...featureImportRestrictions,
  barrelReExportRestriction,
])
