import stylelint from 'stylelint'

const RAW_COLOR_PATTERNS = [
  '/#[0-9a-fA-F]{3,8}\\b/',
  '/\\b(rgb|rgba|hsl|hsla)\\((?!\\s*from\\s+var\\()/',
  '/\\b(white|black)\\b/',
]

const SHADOW_WITH_OFFSET_OR_BLUR_PATTERN =
  '/(?:^|,)\\s*(?:inset\\s+)?(?!0(?:px)?\\s+0(?:px)?\\s+0(?:px)?\\s)-?[\\d.]/'

const SHADOW_WITH_UNRECOGNIZED_TOKEN_PATTERN =
  '/(?:^|,)\\s*var\\(--(?!(?:shadow|inset|ring|glow)-|detail-card-header-shadow\\))[a-z0-9-]+\\)\\s*(?:,|$)/'

const FONT_FAMILY_OTHER_THAN_FONT_TOKEN_PATTERN = '/^(?!var\\(--font-[a-z0-9-]+\\)$)/'

const FONT_SHORTHAND_WITH_LITERAL_FAMILY_PATTERN =
  '/[\'"]|\\b(?:serif|sans-serif|monospace|system-ui|cursive|fantasy)\\b/'

const PILL_RADIUS_PATTERN = '/\\b(?:999|9999)px\\b|\\b100vmax\\b|\\b50%/'

const HIDDEN_OUTLINE_PATTERN = '/^(?:none|0(?:px)?)(?:\\s|$)/'

const SPACE_TOKEN = 'var\\(--space-[a-z0-9-]+\\)'
const DETAIL_CARD_SPACING_TOKEN =
  'var\\(--detail-card-(?:header-padding|body-padding|header-body-gap|pin-reserve)\\)'
const DETAIL_CARD_FONT_TOKEN = 'var\\(--detail-card-(?:title-size|fact-size)\\)'
const SPACE_CALCULATION_TERMS = `(?:[\\s*+()/\\-]|\\d+(?:\\.\\d+)?|${SPACE_TOKEN})+`
const CALC_OF_SPACE_TOKENS = `calc\\(${SPACE_CALCULATION_TERMS}\\)`
const SPACING_VALUE_PATTERN = `/^(?:(?:${SPACE_TOKEN}|${DETAIL_CARD_SPACING_TOKEN}|0|auto|${CALC_OF_SPACE_TOKENS})(?:\\s+|$))+$/`
const FOCUS_RING_CALC_OF_SPACE_TOKENS = `calc\\((?=[\\s\\S]*${SPACE_TOKEN})${SPACE_CALCULATION_TERMS}\\)`
const FOCUS_RING_SPACING_VALUE_PATTERN = `/^(?:${SPACE_TOKEN}|0|${FOCUS_RING_CALC_OF_SPACE_TOKENS})$/`
const FOCUS_RING_SELECTOR_RULE = 'ddo/focus-ring-selector'
const focusRingSelectorRule = stylelint.createPlugin(
  FOCUS_RING_SELECTOR_RULE,
  () => (root, result) => {
    root.walkRules((rule) => {
      const selectorPath = [rule.selector]
      for (let parent = rule.parent; parent?.type === 'rule'; parent = parent.parent) {
        selectorPath.push(parent.selector)
      }
      const selector = selectorPath.join(' ')
      const isProxyPseudo =
        /::(?:before|after)/.test(selector) && /\.focus-ring-(?:proxy|row)/.test(selector)
      const hasFocusRingProperty = rule.nodes.some(
        (node) =>
          node.type === 'decl' &&
          (/^(?:outline(?:-.+)?|--focus-ring-.+)$/.test(node.prop) ||
            (selector.includes(':focus-visible') && node.prop === 'border-radius') ||
            (isProxyPseudo && node.value.includes('var(--focus-ring-'))),
      )
      if (!hasFocusRingProperty && !isProxyPseudo) return
      const componentClass = selector
        .match(/[.#][a-z][a-z0-9-]*/g)
        ?.find((className) => !/^\.focus-ring-(?:proxy|row)(?:--[a-z0-9-]+)?$/.test(className))
      if (!componentClass) return
      stylelint.utils.report({
        result,
        ruleName: FOCUS_RING_SELECTOR_RULE,
        node: rule,
        word: componentClass,
        message: `"${componentClass}" selects focus ring geometry in src/index.css. Move it to component CSS.`,
      })
    })
  },
)

const RADIUS_VALUE_PATTERN = '/^(?:(?:var\\(--radius-[a-z0-9-]+\\)|0)(?:\\s+|$))+$/'

function disallowedValueMessage(property, value) {
  if (property === 'box-shadow' && !/#|rgb|hsl|white|black/.test(value)) {
    return `Shadow "box-shadow: ${value}" is not an elevation token. Use var(--shadow-*), var(--inset-*), var(--ring-*) or var(--glow-*) from src/index.css, or a 0 0 0 <spread> ring; only floating surfaces cast shadows (docs/styling.md).`
  }
  if (property === 'font-family' || property === 'font') {
    return `Hard-coded font in "${property}: ${value}". Reference a font token (var(--font-ui), var(--font-mono), var(--font-wordmark), var(--font-display)) or a --type-* role from src/index.css.`
  }
  if (property.startsWith('outline')) {
    return `"${property}: ${value}" hides the focus ring. Keep the global :focus-visible outline, or move it to a wrapper with :focus-within (docs/styling.md).`
  }
  if (property.endsWith('radius')) {
    return `Pill or circle radius in "${property}: ${value}". The design has no pill shapes; use var(--radius-xs|sm|md|lg).`
  }
  return `Raw color or drop shadow in "${property}: ${value}". Colors are tokens in src/index.css or a component-scoped custom property, referenced with var(); box-shadow allows only elevation tokens and 0 0 0 <spread> rings.`
}

function disallowedOffScaleValueMessage(property, value) {
  if (property.startsWith('--focus-ring-')) {
    return `Invalid focus ring placement "${property}: ${value}". Use a spacing token or calc() of spacing tokens.`
  }
  if (property.endsWith('radius')) {
    return `Off-scale "${property}: ${value}". Use var(--radius-xs|sm|md|lg), 0 or inherit (docs/styling.md).`
  }
  if (property === 'opacity') {
    return `Off-scale "opacity: ${value}". Use 0, 0.42 (the disabled and drag-source dim), 1, inherit or a var() (docs/styling.md).`
  }
  if (property === 'letter-spacing') {
    return `Off-scale "letter-spacing: ${value}". Use var(--ls-*) from src/index.css, 0 or normal.`
  }
  if (property === 'font-size') {
    return `Off-scale "font-size: ${value}". Use var(--fs-*) from src/index.css, inherit, or an em size.`
  }
  return `Off-scale "${property}: ${value}". Spacing is var(--space-*), 0, auto, or calc() of space tokens (docs/styling.md).`
}

const STYLELINT_DIRECTIVE_PATTERN = '^stylelint-(?:disable|enable)(?:-line|-next-line)?(?:\\s|$)'

const DISALLOWED_PROPERTY_VALUES = {
  '/^(?!--)/': RAW_COLOR_PATTERNS,
  'box-shadow': [SHADOW_WITH_OFFSET_OR_BLUR_PATTERN, SHADOW_WITH_UNRECOGNIZED_TOKEN_PATTERN],
  'font-family': [FONT_FAMILY_OTHER_THAN_FONT_TOKEN_PATTERN],
  font: [FONT_SHORTHAND_WITH_LITERAL_FAMILY_PATTERN],
  '/radius$/': [PILL_RADIUS_PATTERN],
  '/^outline(?:-style)?$/': [HIDDEN_OUTLINE_PATTERN],
  'outline-width': ['/^0(?:px)?$/'],
}

const ALLOWED_PROPERTY_VALUES = {
  '/^(?:padding|margin|gap)/': [SPACING_VALUE_PATTERN],
  'letter-spacing': ['/^var\\(--ls-[a-z0-9-]+\\)$/', '0', 'normal'],
  'font-size': [
    '/^var\\(--fs-[a-z0-9-]+\\)$/',
    `/^${DETAIL_CARD_FONT_TOKEN}$/`,
    'inherit',
    '/^\\d*\\.?\\d+em$/',
  ],
  '/radius$/': [RADIUS_VALUE_PATTERN, 'var(--focus-ring-corner-radius)', 'inherit'],
  '--focus-ring-corner-radius': ['var(--radius-sm)'],
  opacity: ['0', '0.42', '1', 'inherit', '/^var\\(/'],
}

export default {
  plugins: [focusRingSelectorRule],
  rules: {
    'comment-pattern': [
      STYLELINT_DIRECTIVE_PATTERN,
      { message: 'No comments in CSS: names and tokens carry the meaning (CLAUDE.md)' },
    ],
    'declaration-property-value-disallowed-list': [
      DISALLOWED_PROPERTY_VALUES,
      { message: disallowedValueMessage },
    ],
    'declaration-property-value-allowed-list': [
      ALLOWED_PROPERTY_VALUES,
      { message: disallowedOffScaleValueMessage },
    ],
    'declaration-no-important': true,
  },
  overrides: [
    {
      files: ['src/**/*.css'],
      rules: {
        'property-disallowed-list': [
          [
            'outline-offset',
            'outline-style',
            'outline-width',
            '/^--focus-ring-(?!proxy-(?:top|right|bottom|left|backdrop)$|native-offset$|row-fill$)/',
            '/^--pinned-anchor-/',
          ],
          {
            message: (property) =>
              `"${property}" redefines focus ring geometry. Set a supported focus ring custom property instead.`,
          },
        ],
        'declaration-property-value-disallowed-list': [
          {
            ...DISALLOWED_PROPERTY_VALUES,
            outline: ['/^(?!2px solid transparent$)/'],
            'outline-color': ['/^(?!transparent$)/'],
          },
          {
            message: (property, value) =>
              `"${property}: ${value}" redefines focus ring geometry. Set a supported focus ring custom property instead.`,
          },
        ],
        'declaration-property-value-allowed-list': [
          {
            ...ALLOWED_PROPERTY_VALUES,
            '--focus-ring-row-fill': ['var(--surface-selected)'],
            '/^--focus-ring-proxy-(?:top|right|bottom|left)$/': [FOCUS_RING_SPACING_VALUE_PATTERN],
            '--focus-ring-native-offset': [FOCUS_RING_SPACING_VALUE_PATTERN],
            '--focus-ring-proxy-backdrop': ['none', 'var(--focus-ring-scrollport-backdrop)'],
          },
          { message: disallowedOffScaleValueMessage },
        ],
        'rule-selector-property-disallowed-list': [
          {
            '/data-hover-card-pinned/': [
              '/^background(?:-.*)?$/',
              '/^border(?:-.*)?$/',
              '/^outline(?:-(?:offset|style|width))?$/',
              '/^--focus-ring-/',
              'box-shadow',
              'fill',
              'stroke',
            ],
            '/:focus-visible/': ['border-radius', 'box-shadow'],
          },
          {
            message: (selector, property) =>
              `"${selector}" redefines the focus ring or fill with "${property}". Use the shared focus recipe from src/index.css.`,
          },
        ],
      },
    },
    {
      files: ['src/index.css'],
      rules: {
        [FOCUS_RING_SELECTOR_RULE]: true,
        'property-disallowed-list': null,
        'rule-selector-property-disallowed-list': null,
        'declaration-property-value-disallowed-list': [
          DISALLOWED_PROPERTY_VALUES,
          { message: disallowedValueMessage },
        ],
      },
    },
  ],
  ignoreFiles: ['dist/**', 'node_modules/**'],
}
