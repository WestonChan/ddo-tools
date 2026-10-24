import { replayIntegration } from '@sentry/react'

export function maskedReplayIntegration(): ReturnType<typeof replayIntegration> {
  return replayIntegration({
    maskAllText: true,
    maskAllInputs: true,
    blockAllMedia: false,
  })
}
