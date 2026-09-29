import { readdirSync } from 'node:fs'
import { basename, dirname } from 'node:path'

const MODULE_EXTENSION_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/

function moduleStem(fileName) {
  return fileName.replace(MODULE_EXTENSION_PATTERN, '')
}

export const noCaseCollidingModules = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Two modules whose names differ only in case or extension resolve to the wrong file on a case-insensitive filesystem',
    },
    messages: {
      caseCollidingModule:
        '{{ siblingFileName }} has the same module name ignoring case and extension; an extensionless import can resolve to either. Name each file after what it exports.',
    },
    schema: [],
  },
  create(context) {
    const fileName = basename(context.filename)
    if (!MODULE_EXTENSION_PATTERN.test(fileName)) return {}
    const lowercaseStem = moduleStem(fileName).toLowerCase()
    const siblingFileNames = readdirSync(dirname(context.filename)).filter(
      (siblingFileName) =>
        siblingFileName !== fileName &&
        MODULE_EXTENSION_PATTERN.test(siblingFileName) &&
        moduleStem(siblingFileName).toLowerCase() === lowercaseStem,
    )
    return {
      Program(program) {
        for (const siblingFileName of siblingFileNames) {
          context.report({ node: program, messageId: 'caseCollidingModule', data: { siblingFileName } })
        }
      },
    }
  },
}
