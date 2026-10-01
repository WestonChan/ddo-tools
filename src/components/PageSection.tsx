import type { JSX, ReactNode } from 'react'
import './PageSection.css'

interface PageSectionProps {
  id?: string
  title: string
  subtitle?: ReactNode
  children: ReactNode
}

export function PageSection({ id, title, subtitle, children }: PageSectionProps): JSX.Element {
  return (
    <section className="page-section">
      <header id={id} className="page-section-header">
        <h2 className="page-section-title">{title}</h2>
        {subtitle && <span className="page-section-subtitle">{subtitle}</span>}
      </header>
      {children}
    </section>
  )
}
