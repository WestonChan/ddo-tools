
export const PUBLIC_API_URL = 'https://ddo-data.fly.dev'

export const API_BASE: string = (import.meta.env.VITE_API_URL || PUBLIC_API_URL).replace(/\/$/, '')

export const API_TIMEOUT_MS = 30_000

export const API_ERROR_HTTP = 'api-http' as const
export const API_ERROR_NETWORK = 'api-network' as const
export const API_ERROR_TIMEOUT = 'api-timeout' as const

export type ApiErrorKind = typeof API_ERROR_HTTP | typeof API_ERROR_NETWORK | typeof API_ERROR_TIMEOUT

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  constructor(kind: ApiErrorKind, status: number, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

export function apiUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === false) continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function apiGet<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  const url = apiUrl(path, query)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new ApiError(API_ERROR_HTTP, response.status, `${response.status} ${response.statusText} for ${path}${detail ? `: ${detail}` : ''}`)
    }
    return (await response.json()) as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(API_ERROR_TIMEOUT, 0, `Request timed out after ${API_TIMEOUT_MS / 1000}s: ${path}`)
    }
    throw new ApiError(API_ERROR_NETWORK, 0, err instanceof Error ? err.message : 'Network error', { cause: err })
  } finally {
    clearTimeout(timeout)
  }
}

export function describeApiError(err: unknown): { heading: string; hint: string | null } {
  if (!isApiError(err)) return { heading: 'Something went wrong loading game data', hint: null }
  switch (err.kind) {
    case API_ERROR_NETWORK:
      return { heading: 'Could not reach the game data API', hint: 'Check your connection, then retry.' }
    case API_ERROR_TIMEOUT:
      return { heading: 'The game data API is taking too long', hint: 'It may be waking up. Retry in a moment.' }
    case API_ERROR_HTTP:
      return err.status === 404
        ? { heading: 'Not found', hint: null }
        : err.status === 429
          ? { heading: 'Too many requests', hint: 'Wait a few seconds, then retry.' }
          : { heading: `The game data API returned ${err.status}`, hint: 'Retry in a moment. If it persists, report it.' }
  }
}
