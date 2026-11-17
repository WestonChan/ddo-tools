import { API_HTTP_ERROR, isApiError } from './client'

interface RejectedFilterValue {
  parameter: string
  value: string
}

export function rejectedFilterValue(error: unknown): RejectedFilterValue | null {
  if (
    !isApiError(error) ||
    error.kind !== API_HTTP_ERROR ||
    error.httpStatus !== 400 ||
    error.apiErrorText === null
  )
    return null
  const matched =
    /^unknown ([a-z_]+) "((?:[^"\\\p{Cc}]|\\(?:["\\nrt0]|u\{[0-9a-fA-F]{1,6}\}))*)"(?:; accepted values: [\s\S]*)?$/u.exec(
      error.apiErrorText,
    )
  if (!matched) return null
  const escapes: Record<string, string> = {
    '"': '"',
    '\\': '\\',
    n: '\n',
    r: '\r',
    t: '\t',
    '0': '\0',
  }
  let hasInvalidUnicode = false
  const value = matched[2].replace(
    /\\(u\{([0-9a-fA-F]{1,6})\}|["\\nrt0])/g,
    (_escaped, escape: string, unicode: string | undefined) => {
      if (unicode === undefined) return escapes[escape]
      const codePoint = Number.parseInt(unicode, 16)
      if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        hasInvalidUnicode = true
        return ''
      }
      return String.fromCodePoint(codePoint)
    },
  )
  return hasInvalidUnicode ? null : { parameter: matched[1], value }
}
