import type { JSX, ReactNode } from 'react'

interface DetailSectionProps {
  heading: string
  children: ReactNode
  className?: string
}

export function DetailSection({ heading, children, className }: DetailSectionProps): JSX.Element {
  const sectionClassName = ['resources-section', className].filter(Boolean).join(' ')
  return (
    <section className={sectionClassName}>
      <h3 className="section-label">{heading}</h3>
      <div className="resources-section-body">{children}</div>
    </section>
  )
}
