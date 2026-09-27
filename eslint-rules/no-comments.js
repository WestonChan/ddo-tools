const DIRECTIVE = /^\s*(\/\s*<reference|eslint|global\b|exported\b|@ts-|@jsx|@vitest-environment)/

function isDirective(comment) {
  return DIRECTIVE.test(comment.value)
}

function lineBoundsAround(text, [start, end]) {
  let from = start
  while (from > 0 && (text[from - 1] === ' ' || text[from - 1] === '\t')) from--
  const ownsLineStart = from === 0 || text[from - 1] === '\n'

  let to = end
  while (to < text.length && (text[to] === ' ' || text[to] === '\t')) to++
  const ownsLineEnd = to === text.length || text[to] === '\n'

  if (ownsLineStart && ownsLineEnd) {
    return [from, to < text.length ? to + 1 : to]
  }
  if (ownsLineEnd) {
    return [from, end]
  }
  return [start, to]
}

function removalRange(sourceCode, comment) {
  const text = sourceCode.text
  const node = sourceCode.getNodeByRangeIndex(comment.range[0])
  const container = node?.type === 'JSXEmptyExpression' ? node.parent : node
  const isJsxOnlyComment =
    container?.type === 'JSXExpressionContainer' && container.expression?.type === 'JSXEmptyExpression'
  const range = isJsxOnlyComment ? container.range : comment.range
  return lineBoundsAround(text, range)
}

export const noComments = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Code carries its meaning in names, types, and tests; comments and docblocks are removed',
    },
    messages: {
      noComments: 'Comments are not allowed; express this in a name, a type, a test, or docs/.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (isDirective(comment)) continue
          context.report({
            loc: comment.loc,
            messageId: 'noComments',
            fix: (fixer) => fixer.removeRange(removalRange(sourceCode, comment)),
          })
        }
      },
    }
  },
}

export default noComments
