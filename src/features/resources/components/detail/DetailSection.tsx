import type { JSX, ReactNode } from 'react'

interface DetailSectionProps {
  label: string
  children: ReactNode
  className?: string
}

export function DetailSection({ label, children, className }: DetailSectionProps): JSX.Element {
  const classes = ['resources-section', className].filter(Boolean).join(' ')
  return (
    <section className={classes}>
      <h3 className="section-label">{label}</h3>
      <div className="resources-section-body">{children}</div>
    </section>
  )
}
