import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'
import { noComments } from './eslint-rules/no-comments.js'
import { noCaseCollidingModules } from './eslint-rules/no-case-colliding-modules.js'

const FEATURE_NAMES = ['build', 'character', 'gear', 'landing', 'resources', 'settings']

function restrictedImportRegexes(restrictions) {
  return ['error', { patterns: restrictions.map(({ regex, message }) => ({ regex, message })) }]
}

const sharedCodeImportRestriction = {
  files: ['src/components/**', 'src/hooks/**', 'src/lib/**', 'src/stores/**', 'src/test/**'],
  rules: {
    'no-restricted-imports': restrictedImportRegexes([
      {
        regex: '^(\\.\\./)+(features|app)(/|$)',
        message: 'Shared code never imports from features/ or app/.',
      },
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
        message:
          'Features never import from each other; move shared code to src/components, src/hooks or src/lib.',
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
        selector:
          'ExportNamedDeclaration[source.value=/^\\.\\.\\//], ExportAllDeclaration[source.value=/^\\.\\.\\//]',
        message: "A barrel re-exports its own directory's modules, never a sibling directory's.",
      },
    ],
  },
}

const exactRoleNameRestriction = {
  files: ['e2e/**'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.property.name='getByRole'] > ObjectExpression:has(> Property[key.name='name'][value.value=type(string)]):not(:has(> Property[key.name='exact']))",
        message:
          'getByRole with a string name needs exact: true — a second link or button containing the same text breaks the lookup.',
      },
    ],
  },
}

const popupRoleClaimRestriction = {
  files: ['src/**/*.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "JSXAttribute[name.name='aria-haspopup'][value.value=/^(true|menu)$/]",
        message:
          'aria-haspopup="true" claims a role="menu" popup. AnchoredMenu is a group; keep aria-expanded + aria-controls instead.',
      },
    ],
  },
}

const EMPTY_TYPE_NAME_SUFFIXES = [
  'Manager',
  'Helper',
  'Helpers',
  'Util',
  'Utils',
  'Info',
  'Data',
  'Wrapper',
  'Handler',
  'Processor',
  'Impl',
]

const typeNamingConvention = {
  selector: 'typeLike',
  format: ['PascalCase'],
  custom: {
    regex: `(${EMPTY_TYPE_NAME_SUFFIXES.join('|')})$`,
    match: false,
  },
}

const interfacePrefixConvention = {
  selector: 'interface',
  format: ['PascalCase'],
  custom: { regex: '^I[A-Z]', match: false },
}

const typeNamingRules = {
  files: ['**/*.{ts,tsx}'],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      typeNamingConvention,
      interfacePrefixConvention,
    ],
  },
}

const booleanNamingRules = {
  files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', 'eslint-rules/**/*.ts'],
  ignores: ['src/lib/api/types.ts'],
  languageOptions: {
    parserOptions: { project: './tsconfig.test.json', tsconfigRootDir: import.meta.dirname },
  },
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      typeNamingConvention,
      interfacePrefixConvention,
      {
        selector: ['variable', 'parameter', 'typeProperty', 'classProperty', 'accessor'],
        types: ['boolean'],
        format: ['PascalCase'],
        prefix: ['is', 'has', 'can', 'should', 'was', 'will', 'does', 'did', 'are', 'includes'],
        filter: { regex: '^(aria-|data-|inert$|matches$)', match: false },
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
      local: {
        rules: { 'no-comments': noComments, 'no-case-colliding-modules': noCaseCollidingModules },
      },
    },
    rules: {
      'local/no-comments': 'error',
      'local/no-case-colliding-modules': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      'object-shorthand': ['error', 'always'],
      'no-useless-rename': 'error',
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    },
  },
  sharedCodeImportRestriction,
  ...featureImportRestrictions,
  barrelReExportRestriction,
  exactRoleNameRestriction,
  popupRoleClaimRestriction,
  typeNamingRules,
  booleanNamingRules,
  eslintConfigPrettier,
])
