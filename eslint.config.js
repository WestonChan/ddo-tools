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

const lazyViewImportRestriction = {
  files: ['src/*.{ts,tsx}', 'src/app/**'],
  ignores: ['**/*.test.{ts,tsx}'],
  rules: {
    'no-restricted-imports': restrictedImportRegexes([
      {
        regex: '^(\\.\\.?/)+features/[^/]+/.+',
        message:
          'Import a feature through its barrel; load its lazyViews only with import(), so its views stay out of the startup bundle.',
      },
    ]),
  },
}

const sentryReplayStartupRestriction = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/lib/sentryReplay.ts', '**/*.test.{ts,tsx}'],
  rules: {
    'no-restricted-properties': [
      'error',
      ...['getReplay', 'replayIntegration'].map((property) => ({
        object: 'Sentry',
        property,
        message:
          "Session Replay loads from src/lib/sentryReplay.ts after init; read it through getClient().getIntegrationByName('Replay') so it stays out of the startup bundle.",
      })),
    ],
  },
}

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
      {
        selector: 'ImportDeclaration[source.value=/\\.json$/][attributes.length=0]',
        message: 'JSON imports in e2e specs need with { type: "json" }.',
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

const detailVariantComparisonRestriction = {
  files: [
    'src/features/resources/components/detail/**/*.{ts,tsx}',
    'src/components/DetailCard/**/*.{ts,tsx}',
  ],
  ignores: ['**/*.test.{ts,tsx}', 'src/components/DetailCard/DetailCard.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "BinaryExpression[left.name='variant'], BinaryExpression[right.name='variant'], BinaryExpression[left.property.name='variant'], BinaryExpression[right.property.name='variant']",
        message: 'Select section views through the shared detail card renderer.',
      },
      {
        selector:
          "MemberExpression[computed=true][property.name='variant'], MemberExpression[computed=true][property.value='variant'], SwitchStatement[discriminant.name='variant'], SwitchStatement[discriminant.property.name='variant']",
        message: 'Only the shared detail card renderer reads variant.',
      },
      {
        selector: "Identifier[name='variant']",
        message: 'Resource card definitions cannot receive or read variant.',
      },
    ],
  },
}

const apiListResponseRestriction = {
  files: ['src/lib/api/**/*.ts', 'src/features/*/queries/**/*.{ts,tsx}'],
  ignores: ['**/index.ts'],
  rules: {
    'no-restricted-syntax': [
      ...popupRoleClaimRestriction.rules['no-restricted-syntax'],
      {
        selector:
          "CallExpression[callee.name='fetchApiJson'] > TSTypeParameterInstantiation > TSArrayType, CallExpression[callee.name='fetchApiJson'] > TSTypeParameterInstantiation > TSTypeOperator > TSArrayType, CallExpression[callee.name='fetchApiJson'] > TSTypeParameterInstantiation > TSTypeReference[typeName.name=/^(Array|ReadonlyArray)$/]",
        message: 'List routes return envelopes. Use fetchApiPage to read their rows and total.',
      },
    ],
  },
}

const apiPathRestrictions = [
  { ...popupRoleClaimRestriction, files: ['src/**/*.{ts,tsx}'] },
  barrelReExportRestriction,
  detailVariantComparisonRestriction,
  apiListResponseRestriction,
].map(({ files, ignores = [], rules }) => ({
  files,
  ignores: [...ignores, 'src/lib/api/**', '**/*.test.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      ...rules['no-restricted-syntax'],
      {
        selector: 'TemplateElement[value.raw=/^\\u002fv1\\u002f/]',
        message: 'Build API detail paths with apiDetailPath.',
      },
      {
        selector: 'Literal[value=/^\\u002fv1\\u002f/]:not([value=/^\\u002fv1\\u002f[a-z-]+$/])',
        message:
          'Build API detail paths with apiDetailPath; bare collection paths may stay literal.',
      },
    ],
  },
}))

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
  lazyViewImportRestriction,
  sentryReplayStartupRestriction,
  barrelReExportRestriction,
  exactRoleNameRestriction,
  popupRoleClaimRestriction,
  detailVariantComparisonRestriction,
  apiListResponseRestriction,
  {
    files: ['src/lib/api/types.ts'],
    rules: {
      'no-restricted-syntax': [
        ...apiListResponseRestriction.rules['no-restricted-syntax'],
        {
          selector: 'TSPropertySignature[key.name=/^(id|.*_id|detail_path)$/]',
          message: 'API identity uses slug fields and shared path builders.',
        },
        {
          selector: 'TSPropertySignature[key.value=/^(id|.*_id|detail_path)$/]',
          message: 'API identity uses slug fields and shared path builders.',
        },
      ],
    },
  },
  typeNamingRules,
  booleanNamingRules,
  ...apiPathRestrictions,
  eslintConfigPrettier,
])
