export const importsFirst = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { importsFirst: 'Put imports before every other statement.' },
  },
  create(context) {
    return {
      Program(program) {
        let hasOtherStatement = false
        for (const statement of program.body) {
          if (statement.type === 'ImportDeclaration') {
            if (hasOtherStatement) context.report({ node: statement, messageId: 'importsFirst' })
          } else {
            hasOtherStatement = true
          }
        }
      },
    }
  },
}
