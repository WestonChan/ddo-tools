import type { JSX, ReactNode } from 'react'
import './DetailCard.css'

export function DetailCard({
  header,
  facts,
  afterFacts,
  children,
  variant = 'pane',
}: {
  header: ReactNode
  facts?: ReactNode
  afterFacts?: ReactNode
  children: ReactNode
  variant?: 'pane' | 'hover'
}): JSX.Element {
  return (
    <article className={`detail-card detail-card--${variant}`}>
      {header}
      {facts && <div className="detail-card__facts">{facts}</div>}
      {afterFacts}
      <div className="detail-card__body">{children}</div>
    </article>
  )
}

export function DetailCardHeader({
  kicker,
  name,
  titleId,
  badges,
  actions,
}: {
  kicker: string
  name: string
  titleId?: string
  badges?: ReactNode
  actions?: ReactNode
}): JSX.Element {
  return (
    <header className="detail-card__header">
      <div className="detail-card__title-block">
        <span className="section-label">{kicker}</span>
        <div className="detail-card__name-row">
          <h2 id={titleId} tabIndex={titleId ? -1 : undefined} className="detail-card__name">
            {name}
          </h2>
          {badges}
        </div>
      </div>
      {actions && <div className="detail-card__actions">{actions}</div>}
    </header>
  )
}

export function DetailFact({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="detail-card__fact">
      <span className="section-label">{label}</span>
      <span>{children}</span>
    </div>
  )
}

export function DetailCardSection({
  heading,
  children,
}: {
  heading?: string
  children: ReactNode
}): JSX.Element {
  const Container = heading ? 'section' : 'div'
  return (
    <Container className="detail-card__section">
      {heading && <h3 className="section-label">{heading}</h3>}
      <div>{children}</div>
    </Container>
  )
}

export function DetailMore({ count }: { count: number }): JSX.Element | null {
  return count > 0 ? <span className="detail-card__more">+{count} more</span> : null
}

export function DetailCardFooter({ children }: { children: ReactNode }): JSX.Element {
  return <footer className="detail-card__footer">{children}</footer>
}
