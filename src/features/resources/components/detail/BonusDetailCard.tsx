import type { JSX } from 'react'
import {
  ApiErrorNotice,
  StructuredDetailCard,
  detailCardSection,
  type DetailCardDefinition,
  type DetailCardFact,
  DetailValueRow,
  WikiLinkIcon,
} from '../../../../components'
import type { Effect, EffectBonus, ResourceModifier } from '../../queries/items'
import { toEffectDamage } from '../../queries/items'
import { useEffectDetail } from '../../queries/useItems'
import { effectKindLabel } from '../effectKindLabel'
import {
  damageExpression,
  effectBonusCalculation,
  effectDamageText,
  effectHoverCopy,
  effectValue,
  type ItemEnhancementRow,
} from './structuredRows'
import { numberWithPlusSign } from './numberWithPlusSign'
import { ResourceStatusView } from './ResourceStatusView'
import { DamageView, DescriptionView } from './ResourceCardViews'

function matchingDamageExpressions(effect: Effect, modifiers: ResourceModifier[]): string[] {
  const normalizedNames = [effect.name, effect.verboseName].map((name) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, ''),
  )
  return modifiers.flatMap((modifier) => {
    const modifierNames = [modifier.effectType, modifier.displayName ?? ''].map((name) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    )
    if (!modifierNames.some((name) => name && normalizedNames.includes(name))) return []
    const damage = damageExpression(modifier)
    return damage ? [damage] : []
  })
}

function EffectBonusRows({
  effect,
  bonuses,
  detail,
}: {
  effect: Effect
  bonuses: EffectBonus[]
  detail: ReturnType<typeof useEffectDetail>['data']
}): JSX.Element {
  const groupedBonuses = new Map<string, EffectBonus[]>()
  for (const bonus of bonuses) {
    if (!bonus.group) continue
    const key = `${bonus.group.id}:${bonus.bonusType}:${bonus.value}`
    groupedBonuses.set(key, [...(groupedBonuses.get(key) ?? []), bonus])
  }
  const ungroupedBonuses = bonuses.filter((bonus) => !bonus.group)
  return (
    <>
      {[...groupedBonuses].map(([key, members]) => (
        <div key={key} className="resources-effect-bonus-group">
          {numberWithPlusSign(members[0].value) === effectValue(effect) &&
          members[0].bonusType === effect.bonusType ? (
            <div className="resources-hover-row hover-card-row">{members[0].group!.name}</div>
          ) : (
            <DetailValueRow
              label={members[0].group!.name}
              value={numberWithPlusSign(members[0].value)}
              type={members[0].bonusType}
              className="hover-card-row"
            />
          )}
          {members.map((bonus, index) => {
            const calculation = effectBonusCalculation(effect, bonus, detail)
            return (
              <div key={`${bonus.statName}-${index}`} className="resources-effect-group-member">
                <span>{bonus.statName}</span>
                {calculation && (
                  <span className="resources-effect-calculation">
                    <span>Calculated</span> · {calculation}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
      {ungroupedBonuses.map((bonus, index) => {
        const calculation = effectBonusCalculation(effect, bonus, detail)
        const isHeaderValue =
          bonuses.length === 1 && bonus.statName === effect.name && bonus.value === effect.value
        return (
          <div
            key={`${bonus.statName}-${bonus.bonusType}-${index}`}
            className="resources-effect-ungrouped-bonus"
          >
            {isHeaderValue ? (
              <div className="resources-hover-row hover-card-row">{bonus.statName}</div>
            ) : (
              <DetailValueRow
                label={bonus.statName}
                value={numberWithPlusSign(bonus.value)}
                type={bonus.bonusType}
                className="hover-card-row"
              />
            )}
            {calculation && (
              <span className="resources-effect-calculation">
                <span>Calculated</span> · {calculation}
              </span>
            )}
          </div>
        )
      })}
    </>
  )
}

interface BonusDetailCardProps {
  effect?: Effect
  enhancement?: ItemEnhancementRow
  detailPath?: string
  originName?: string
  modifiers?: ResourceModifier[]
  verboseName?: string | null
}

function useBonusDetailDefinition({
  effect,
  enhancement,
  detailPath,
  originName,
  modifiers = [],
  verboseName,
}: BonusDetailCardProps): DetailCardDefinition {
  const resolvedDetailPath = detailPath ?? (effect ? `/v1/effects/${effect.id}` : '')
  const detailQuery = useEffectDetail(resolvedDetailPath, Boolean(resolvedDetailPath))
  const detail = detailQuery.data
  const knownKind = effect?.kind ?? detail?.kind
  const bonus = effect ?? enhancement
  const hoverCopy = bonus ? effectHoverCopy(bonus) : null
  const name = effect?.name ?? enhancement?.name ?? detail?.name ?? 'Loading bonus…'
  const value = effect ? effectValue(effect) : (enhancement?.value ?? null)
  const defaultValue = detail?.default_value
  const displayedValue = value ?? (defaultValue == null ? null : numberWithPlusSign(defaultValue))
  const tier = effect?.tier
    ? `${effect.tier.group} · Step ${effect.tier.rank}${detail?.tier ? ` of ${detail.tier.steps.length}` : ''}`
    : detail?.tier
      ? `${detail.tier.group} · Step ${detail.tier.rank} of ${detail.tier.steps.length}`
      : null
  const description = hoverCopy?.description ?? null
  const damageRows = [
    ...(effect?.damage.map(effectDamageText) ?? []),
    ...(detail && !effect
      ? detail.damage.map((damage) => effectDamageText(toEffectDamage(damage)))
      : []),
    ...(effect ? matchingDamageExpressions(effect, modifiers) : []),
  ]
  const facts: DetailCardFact[] = [
    { label: 'Type', value: effect?.bonusType ?? enhancement?.type ?? detail?.category },
    { label: 'Value', value: displayedValue },
    { label: 'Tier', value: tier },
  ]
  const sections = [
    detailCardSection({
      key: 'verbose-name',
      heading: 'Verbose name',
      entries:
        verboseName || hoverCopy?.verboseName ? [verboseName ?? hoverCopy?.verboseName ?? ''] : [],
      FullView: DescriptionView,
    }),
    detailCardSection({
      key: 'origin',
      entries: originName ? [originName] : [],
      FullView: OriginView,
    }),
    detailCardSection({
      key: 'stats',
      heading: 'Stats',
      entries: effect?.bonuses.length || detail?.bonuses.length ? [{ effect, detail }] : [],
      FullView: BonusStatsView,
    }),
    detailCardSection({
      key: 'damage',
      heading: 'Damage',
      entries: damageRows,
      FullView: DamageView,
    }),
    detailCardSection({
      key: 'description',
      heading: 'Description',
      entries: description ? [description] : [],
      FullView: DescriptionView,
    }),
    detailCardSection({
      key: 'found-on',
      heading: 'Found on',
      entries: detail
        ? [
            { label: 'Items', value: detail.items.total },
            { label: 'Augments', value: detail.augments.total },
            { label: 'Set tiers', value: detail.set_tiers.total },
          ]
        : [],
      FullView: CountsView,
    }),
    detailCardSection({
      key: 'status',
      entries: detailQuery.error
        ? [
            <ApiErrorNotice
              error={detailQuery.error}
              path={resolvedDetailPath}
              missingResourceName="bonus"
              onRetry={() => void detailQuery.refetch()}
            />,
          ]
        : detailQuery.isPending && resolvedDetailPath
          ? ['Loading bonus…']
          : [],
      FullView: ResourceStatusView,
    }),
  ]
  const cardName = detail?.wiki_url ? (
    <WikiLinkIcon
      href={detail.wiki_url}
      pageName={name}
      label={name}
      className="resources-effect-wiki-name"
    />
  ) : (
    name
  )
  return {
    kicker: knownKind ? effectKindLabel(knownKind) : enhancement ? 'Enchantment' : '',
    name: cardName,
    facts,
    sections,
  }
}

export function BonusDetailCard(props: BonusDetailCardProps): JSX.Element {
  const definition = useBonusDetailDefinition(props)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function BonusHoverCard(props: BonusDetailCardProps): JSX.Element {
  const definition = useBonusDetailDefinition(props)
  return <StructuredDetailCard variant="hover" {...definition} />
}

type BonusStatEntry = { effect?: Effect; detail: ReturnType<typeof useEffectDetail>['data'] }

function BonusStatsView({ entries }: { entries: readonly BonusStatEntry[] }): JSX.Element {
  return (
    <>
      {entries.map(({ effect, detail }, index) =>
        effect?.bonuses.length ? (
          <EffectBonusRows key={index} effect={effect} bonuses={effect.bonuses} detail={detail} />
        ) : (
          detail?.bonuses.map((bonus, bonusIndex) => (
            <div
              key={`${bonus.target}-${bonusIndex}`}
              className="resources-hover-row hover-card-row"
            >
              {bonus.target}
              {bonus.bonus_type ? ` · ${bonus.bonus_type}` : ''}
            </div>
          ))
        ),
      )}
    </>
  )
}

function OriginView({ entries }: { entries: readonly string[] }): JSX.Element {
  return (
    <>
      {entries.map((name, index) => (
        <p key={index} className="resources-hover-origin">
          From {name}
        </p>
      ))}
    </>
  )
}

function CountsView({
  entries,
}: {
  entries: readonly { label: string; value: number }[]
}): JSX.Element {
  return (
    <>
      {entries.map((count) => (
        <DetailValueRow
          key={count.label}
          label={count.label}
          value={count.value}
          className="hover-card-row"
        />
      ))}
    </>
  )
}
