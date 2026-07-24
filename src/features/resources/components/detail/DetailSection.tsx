import type { JSX, ReactNode } from 'react'

interface DetailSectionProps {
  label: string
  children: ReactNode
  /** Optional extra className applied to the outer <section>. Lets callers
   *  layer in modifiers (e.g., sticky positioning) without reaching into
   *  the primitive's internals. */
  className?: string
}

// Wraps a content block with the global `.section-label` accent header used
// across the app (BuildSidePanel, etc.). Lifted out of `ItemDetail` so future
// per-category detail components share the same visual rhythm.
export function DetailSection({ label, children, className }: DetailSectionProps): JSX.Element {
  const classes = ['resources-section', className].filter(Boolean).join(' ')
  return (
    <section className={classes}>
      <h3 className="section-label">{label}</h3>
      <div className="resources-section-body">{children}</div>
    </section>
  )
}
