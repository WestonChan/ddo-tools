import type { JSX } from 'react'
import './LoadingSkeleton.css'

interface LoadingSkeletonProps {
  label: string
}

export function LoadingSkeleton({ label }: LoadingSkeletonProps): JSX.Element {
  return (
    <div className="loading-skeleton" role="status" aria-live="polite" aria-label={label}>
      <div className="loading-skeleton-bar" />
      <div className="loading-skeleton-bar loading-skeleton-bar--short" />
      <div className="loading-skeleton-bar" />
    </div>
  )
}
