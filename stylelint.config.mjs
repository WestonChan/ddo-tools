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
const CALC_OF_SPACE_TOKENS = `calc\\((?:[\\s*+/-]|\\d+(?:\\.\\d+)?|${SPACE_TOKEN})+\\)`
const SPACING_VALUE_PATTERN = `/^(?:(?:${SPACE_TOKEN}|${DETAIL_CARD_SPACING_TOKEN}|0|auto|${CALC_OF_SPACE_TOKENS})(?:\\s+|$))+$/`

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

export default {
  rules: {
    'comment-pattern': [
      STYLELINT_DIRECTIVE_PATTERN,
      { message: 'No comments in CSS: names and tokens carry the meaning (CLAUDE.md)' },
    ],
    'declaration-property-value-disallowed-list': [
      {
        '/^(?!--)/': RAW_COLOR_PATTERNS,
        'box-shadow': [SHADOW_WITH_OFFSET_OR_BLUR_PATTERN, SHADOW_WITH_UNRECOGNIZED_TOKEN_PATTERN],
        'font-family': [FONT_FAMILY_OTHER_THAN_FONT_TOKEN_PATTERN],
        font: [FONT_SHORTHAND_WITH_LITERAL_FAMILY_PATTERN],
        '/radius$/': [PILL_RADIUS_PATTERN],
        '/^outline(?:-style)?$/': [HIDDEN_OUTLINE_PATTERN],
        'outline-width': ['/^0(?:px)?$/'],
      },
      { message: disallowedValueMessage },
    ],
    'declaration-property-value-allowed-list': [
      {
        '/^(?:padding|margin|gap)/': [SPACING_VALUE_PATTERN],
        'letter-spacing': ['/^var\\(--ls-[a-z0-9-]+\\)$/', '0', 'normal'],
        'font-size': [
          '/^var\\(--fs-[a-z0-9-]+\\)$/',
          `/^${DETAIL_CARD_FONT_TOKEN}$/`,
          'inherit',
          '/^\\d*\\.?\\d+em$/',
        ],
        '/radius$/': [RADIUS_VALUE_PATTERN, 'inherit'],
        opacity: ['0', '0.42', '1', 'inherit', '/^var\\(/'],
      },
      { message: disallowedOffScaleValueMessage },
    ],
    'declaration-no-important': true,
  },
  ignoreFiles: ['dist/**', 'node_modules/**'],
}
