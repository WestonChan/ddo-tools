import type { JSX, ReactNode } from 'react'
import { LoadingSkeleton } from './LoadingSkeleton'

interface ApiGateProps {
  isPending: boolean
  children: ReactNode
}

export function ApiGate({ isPending, children }: ApiGateProps): JSX.Element {
  if (isPending) return <LoadingSkeleton label="Loading game data" />
  return <>{children}</>
}
