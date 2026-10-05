import type { ApiPage, ApiQueryParameters } from './types'

const PUBLIC_API_URL = 'https://ddo-data.fly.dev'

export const API_BASE_URL: string = (import.meta.env.VITE_API_URL || PUBLIC_API_URL).replace(
  /\/$/,
  '',
)

const API_TIMEOUT_MS = 30_000
const HTTP_ERROR_BODY_MAX_LENGTH = 300
export const WHOLE_LIST_PAGE_LIMIT = 10_000

export const API_HTTP_ERROR = 'api-http' as const
export const API_NETWORK_ERROR = 'api-network' as const
export const API_TIMEOUT_ERROR = 'api-timeout' as const
export const API_RESPONSE_ERROR = 'api-response' as const

export type ApiErrorKind =
  | typeof API_HTTP_ERROR
  | typeof API_NETWORK_ERROR
  | typeof API_TIMEOUT_ERROR
  | typeof API_RESPONSE_ERROR

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly httpStatus: number
  constructor(kind: ApiErrorKind, httpStatus: number, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.kind = kind
    this.httpStatus = httpStatus
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function apiUrl(path: string, queryParameters?: ApiQueryParameters): string {
  const url = `${API_BASE_URL}${path}`
  if (!queryParameters) return url
  const searchParameters = new URLSearchParams()
  for (const [key, value] of Object.entries(queryParameters)) {
    if (Array.isArray(value)) {
      for (const name of value) if (name) searchParameters.append(key, name)
      continue
    }
    if (value === undefined || value === '' || value === false) continue
    searchParameters.append(key, String(value))
  }
  const queryString = searchParameters.toString()
  return queryString ? `${url}?${queryString}` : url
}

export async function fetchApiJson<T>(
  path: string,
  queryParameters?: ApiQueryParameters,
): Promise<T> {
  const abortController = new AbortController()
  const abortTimer = setTimeout(() => abortController.abort(), API_TIMEOUT_MS)
  const url = apiUrl(path, queryParameters)
  try {
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: { accept: 'application/json' },
    })
    if (!response.ok) {
      const errorBodyText = await response.text().catch(() => '')
      const errorBodyCharacters = Array.from(errorBodyText)
      const errorBodyPreview =
        errorBodyCharacters.length > HTTP_ERROR_BODY_MAX_LENGTH
          ? `${errorBodyCharacters.slice(0, HTTP_ERROR_BODY_MAX_LENGTH).join('')}…`
          : errorBodyText
      const statusDescription = [response.status, response.statusText].filter(Boolean).join(' ')
      throw new ApiError(
        API_HTTP_ERROR,
        response.status,
        `${statusDescription} for ${path}${errorBodyPreview ? `: ${errorBodyPreview}` : ''}`,
      )
    }
    try {
      return (await response.json()) as T
    } catch (error) {
      throw new ApiError(API_RESPONSE_ERROR, 0, `Invalid response for ${path}: body is not JSON`, {
        cause: error,
      })
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        API_TIMEOUT_ERROR,
        0,
        `Request timed out after ${API_TIMEOUT_MS / 1000}s: ${path}`,
      )
    }
    throw new ApiError(API_NETWORK_ERROR, 0, err instanceof Error ? err.message : 'Network error', {
      cause: err,
    })
  } finally {
    clearTimeout(abortTimer)
  }
}

export async function fetchApiPage<T, K extends string>(
  path: string,
  rowsKey: K,
  queryParameters?: ApiQueryParameters,
): Promise<ApiPage<T, 'rows'>> {
  const page = await fetchApiJson<ApiPage<T, K>>(path, queryParameters)
  const invalidField =
    !page || typeof page !== 'object' || Array.isArray(page)
      ? 'body'
      : !Array.isArray(page[rowsKey])
        ? rowsKey
        : !Number.isSafeInteger(page.total) || page.total < 0
          ? 'total'
          : !Number.isSafeInteger(page.limit) || page.limit < 1
            ? 'limit'
            : !Number.isSafeInteger(page.offset) || page.offset < 0
              ? 'offset'
              : null
  if (invalidField) {
    throw new ApiError(
      API_RESPONSE_ERROR,
      0,
      `Invalid list response for ${path} (${rowsKey}): ${invalidField}`,
    )
  }
  return { rows: page[rowsKey], total: page.total, limit: page.limit, offset: page.offset }
}

export type ApiErrorDescriptionKind =
  'connection' | 'slow' | 'busy' | 'server' | 'not-found' | 'our-bug'

export interface ApiErrorDescription {
  kind: ApiErrorDescriptionKind
  heading: string
  hint: string
  canRetry: boolean
  canReport: boolean
}

const OUR_BUG_DESCRIPTION: ApiErrorDescription = {
  kind: 'our-bug',
  heading: 'Something went wrong on our side.',
  hint: "This isn't something you can fix. Please report it so we can.",
  canRetry: true,
  canReport: true,
}

export function apiErrorDescription(
  error: unknown,
  options: { missingResourceName?: string } = {},
): ApiErrorDescription {
  if (!isApiError(error)) return OUR_BUG_DESCRIPTION
  switch (error.kind) {
    case API_NETWORK_ERROR:
      return {
        kind: 'connection',
        heading: 'Could not reach the game-data service.',
        hint: 'Check your connection, then retry.',
        canRetry: true,
        canReport: false,
      }
    case API_TIMEOUT_ERROR:
      return {
        kind: 'slow',
        heading: 'The game-data service is taking too long.',
        hint: 'It may be waking up. Retry in a moment.',
        canRetry: true,
        canReport: false,
      }
    case API_HTTP_ERROR:
      if (error.httpStatus === 429) {
        return {
          kind: 'busy',
          heading: 'Too many requests.',
          hint: 'Wait a few seconds, then retry.',
          canRetry: true,
          canReport: false,
        }
      }
      if (error.httpStatus >= 500 && error.httpStatus < 600) {
        return {
          kind: 'server',
          heading: 'The game-data service had a problem.',
          hint: 'Retry in a moment. If it keeps happening, report it.',
          canRetry: true,
          canReport: true,
        }
      }
      if (error.httpStatus === 404 && options.missingResourceName) {
        return {
          kind: 'not-found',
          heading: `This ${options.missingResourceName} no longer exists.`,
          hint: 'Pick another row from the list.',
          canRetry: false,
          canReport: false,
        }
      }
      return OUR_BUG_DESCRIPTION
    case API_RESPONSE_ERROR:
      return OUR_BUG_DESCRIPTION
  }
}

type ApiResponseFieldType =
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'nullable-string'
  | 'nullable-number'
  | 'nullable-object'

export function assertApiResponseFields(
  response: unknown,
  path: string,
  fields: Record<string, ApiResponseFieldType>,
  fieldPrefix = '',
): void {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    throw new ApiError(
      API_RESPONSE_ERROR,
      0,
      `Invalid response for ${path}: ${fieldPrefix || 'body'}`,
    )
  }
  const responseFields = response as Record<string, unknown>
  for (const [field, expectedType] of Object.entries(fields)) {
    const value = responseFields[field]
    const isValid =
      expectedType === 'array'
        ? Array.isArray(value)
        : expectedType === 'nullable-string'
          ? value === null || typeof value === 'string'
          : expectedType === 'nullable-number'
            ? value === null || typeof value === 'number'
            : expectedType === 'nullable-object'
              ? value === null || (typeof value === 'object' && !Array.isArray(value))
              : typeof value === expectedType
    if (!isValid) {
      throw new ApiError(
        API_RESPONSE_ERROR,
        0,
        `Invalid response for ${path}: ${fieldPrefix}${field}`,
      )
    }
  }
}
