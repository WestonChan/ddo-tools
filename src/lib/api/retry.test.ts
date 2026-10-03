import { describe, expect, it } from 'vitest'
import {
  API_HTTP_ERROR,
  API_NETWORK_ERROR,
  API_RESPONSE_ERROR,
  API_TIMEOUT_ERROR,
  ApiError,
} from './client'
import { shouldRetryQuery } from './retry'

describe('default query retry', () => {
  it('never retries a response contract mismatch', () => {
    const error = new ApiError(API_RESPONSE_ERROR, 0, 'Invalid envelope')
    expect([0, 1, 2, 3].map((failureCount) => shouldRetryQuery(failureCount, error))).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  it.each([
    new ApiError(API_NETWORK_ERROR, 0, 'Offline'),
    new ApiError(API_TIMEOUT_ERROR, 0, 'Timed out'),
    new ApiError(API_HTTP_ERROR, 400, 'Bad Request'),
    new ApiError(API_HTTP_ERROR, 429, 'Rate limited'),
    new ApiError(API_HTTP_ERROR, 500, 'Server error'),
    new Error('Other failure'),
    { kind: API_RESPONSE_ERROR },
  ])('retains two retries for other errors: %s', (error) => {
    expect([0, 1, 2, 3].map((failureCount) => shouldRetryQuery(failureCount, error))).toEqual([
      true,
      true,
      false,
      false,
    ])
  })
})
