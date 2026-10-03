import { API_RESPONSE_ERROR, isApiError } from './client'

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 2 && !(isApiError(error) && error.kind === API_RESPONSE_ERROR)
}
