import type { JSX, ReactNode } from 'react'
import type { DetailCardDefinition, DetailCardVariant } from './DetailCardSections'
import { DetailMore } from './DetailMore'
import './DetailCard.css'

function DetailCard({
  header,
  afterHeader,
  children,
  variant = 'pane',
}: {
  header: ReactNode
  afterHeader?: ReactNode
  children: ReactNode
  variant?: 'pane' | 'hover'
}): JSX.Element {
  return (
    <article className={`detail-card detail-card--${variant}`}>
      {header}
      {afterHeader}
      <div className="detail-card__body">{children}</div>
    </article>
  )
}

export function StructuredDetailCard({
  variant,
  kicker,
  name,
  titleId,
  badges,
  facts,
  sections,
  paneActions,
  paneFooter,
  cardFooter,
  afterHeader,
}: DetailCardDefinition & { variant: DetailCardVariant }): JSX.Element {
  const actions = { pane: paneActions, hover: null }[variant]
  const footer = { pane: paneFooter, hover: null }[variant]
  return (
    <DetailCard
      variant={variant}
      header={
        <DetailCardHeader
          kicker={kicker}
          name={name}
          titleId={{ pane: titleId, hover: undefined }[variant]}
          badges={badges}
          actions={actions}
          facts={facts.map((fact) => (
            <DetailFact key={fact.label} label={fact.label}>
              {fact.value}
            </DetailFact>
          ))}
        />
      }
      afterHeader={afterHeader}
    >
      {sections
        .filter((section) => section.entries.length > 0)
        .map((section) => {
          const View = { pane: section.FullView, hover: section.BriefView ?? section.FullView }[
            variant
          ]
          const entryLimit = { pane: undefined, hover: section.briefEntryLimit }[variant]
          return (
            <DetailCardSection key={section.key} sectionKey={section.key} heading={section.heading}>
              {entryLimit === undefined ? (
                <View entries={section.entries} />
              ) : (
                <DetailMore entries={section.entries} visibleCount={entryLimit} View={View} />
              )}
            </DetailCardSection>
          )
        })}
      {cardFooter}
      {footer}
    </DetailCard>
  )
}

function DetailCardHeader({
  kicker,
  name,
  titleId,
  badges,
  actions,
  facts,
}: {
  kicker: string
  name: ReactNode
  titleId?: string
  badges?: ReactNode
  actions?: ReactNode
  facts?: ReactNode
}): JSX.Element {
  return (
    <header className="detail-card__header">
      <div className="detail-card__header-top">
        <div className="detail-card__title-block">
          <div className="detail-card__kicker-row">
            <span className="section-label">{kicker}</span>
          </div>
          <div className="detail-card__name-row">
            <h2 id={titleId} tabIndex={titleId ? -1 : undefined} className="detail-card__name">
              {name}
            </h2>
            {badges}
          </div>
        </div>
        {actions && <div className="detail-card__actions">{actions}</div>}
      </div>
      {facts && <div className="detail-card__facts">{facts}</div>}
    </header>
  )
}

function DetailFact({ label, children }: { label: string; children?: ReactNode }): JSX.Element {
  const value = typeof children === 'string' && children.trim() === '' ? null : children
  return (
    <div className="detail-card__fact">
      <span className="section-label">{label}</span>
      <div>{value ?? <span className="detail-card__fact-empty">—</span>}</div>
    </div>
  )
}

function DetailCardSection({
  heading,
  sectionKey,
  children,
}: {
  heading?: string
  sectionKey: string
  children: ReactNode
}): JSX.Element {
  const Container = heading ? 'section' : 'div'
  return (
    <Container className="detail-card__section" data-section-key={sectionKey}>
      {heading && <h3 className="section-label">{heading}</h3>}
      <div>{children}</div>
    </Container>
  )
}
