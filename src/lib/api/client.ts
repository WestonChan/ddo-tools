
export const PUBLIC_API_URL = 'https://ddo-data.fly.dev'

export const API_BASE_URL: string = (import.meta.env.VITE_API_URL || PUBLIC_API_URL).replace(/\/$/, '')

export const API_TIMEOUT_MS = 30_000

export const API_HTTP_ERROR = 'api-http' as const
export const API_NETWORK_ERROR = 'api-network' as const
export const API_TIMEOUT_ERROR = 'api-timeout' as const

export type ApiErrorKind = typeof API_HTTP_ERROR | typeof API_NETWORK_ERROR | typeof API_TIMEOUT_ERROR

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

export function apiUrl(path: string, queryParameters?: Record<string, string | number | boolean | undefined>): string {
  const url = `${API_BASE_URL}${path}`
  if (!queryParameters) return url
  const searchParameters = new URLSearchParams()
  for (const [key, value] of Object.entries(queryParameters)) {
    if (value === undefined || value === '' || value === false) continue
    searchParameters.set(key, String(value))
  }
  const queryString = searchParameters.toString()
  return queryString ? `${url}?${queryString}` : url
}

export async function fetchApiJson<T>(path: string, queryParameters?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const abortController = new AbortController()
  const abortTimer = setTimeout(() => abortController.abort(), API_TIMEOUT_MS)
  const url = apiUrl(path, queryParameters)
  try {
    const response = await fetch(url, { signal: abortController.signal, headers: { accept: 'application/json' } })
    if (!response.ok) {
      const errorBodyText = await response.text().catch(() => '')
      throw new ApiError(API_HTTP_ERROR, response.status, `${response.status} ${response.statusText} for ${path}${errorBodyText ? `: ${errorBodyText}` : ''}`)
    }
    return (await response.json()) as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(API_TIMEOUT_ERROR, 0, `Request timed out after ${API_TIMEOUT_MS / 1000}s: ${path}`)
    }
    throw new ApiError(API_NETWORK_ERROR, 0, err instanceof Error ? err.message : 'Network error', { cause: err })
  } finally {
    clearTimeout(abortTimer)
  }
}

export function apiErrorDescription(error: unknown): { heading: string; hint: string | null } {
  if (!isApiError(error)) return { heading: 'Something went wrong loading game data', hint: null }
  switch (error.kind) {
    case API_NETWORK_ERROR:
      return { heading: 'Could not reach the game data API', hint: 'Check your connection, then retry.' }
    case API_TIMEOUT_ERROR:
      return { heading: 'The game data API is taking too long', hint: 'It may be waking up. Retry in a moment.' }
    case API_HTTP_ERROR:
      return error.httpStatus === 404
        ? { heading: 'Not found', hint: null }
        : error.httpStatus === 429
          ? { heading: 'Too many requests', hint: 'Wait a few seconds, then retry.' }
          : { heading: `The game data API returned ${error.httpStatus}`, hint: 'Retry in a moment. If it persists, report it.' }
  }
}
