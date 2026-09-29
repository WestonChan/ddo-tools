const RAW_COLOR_PATTERNS = [
  '/#[0-9a-fA-F]{3,8}\\b/',
  '/\\b(rgb|rgba|hsl|hsla)\\((?!\\s*from\\s+var\\()/',
  '/\\b(white|black)\\b/',
]

const SHADOW_WITH_OFFSET_OR_BLUR_PATTERN =
  '/(?:^|,)\\s*(?:inset\\s+)?(?!0(?:px)?\\s+0(?:px)?\\s+0(?:px)?\\s)-?[\\d.]/'

export default {
  rules: {
    'declaration-property-value-disallowed-list': [
      {
        '/^(?!--)/': RAW_COLOR_PATTERNS,
        'box-shadow': [SHADOW_WITH_OFFSET_OR_BLUR_PATTERN],
      },
      {
        message: (property, value) =>
          property === 'box-shadow' && !/#|rgb|hsl|white|black/.test(value)
            ? `Drop shadow in "box-shadow: ${value}". The UI is a single plane (docs/styling.md); only zero-offset, zero-blur rings (0 0 0 <spread>) are allowed.`
            : `Raw color or drop shadow in "${property}: ${value}". Colors are tokens in src/index.css or a component-scoped custom property, referenced with var(); box-shadow allows only 0 0 0 <spread> rings.`,
      },
    ],
  },
  ignoreFiles: ['dist/**', 'node_modules/**'],
}
