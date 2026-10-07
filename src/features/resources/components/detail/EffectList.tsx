import type { JSX } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailCardSection,
  DetailMore,
  DetailValueRow,
  LedgerTable,
  WikiLinkIcon,
  useHoverCard,
  useHoverCardLabel,
  type LedgerColumn,
} from '../../../../components'
import type { SetDetail } from '../../queries/sets'
import type { Effect, EffectBonus, Item, ResourceModifier } from '../../queries/items'
import { useEffectDetail } from '../../queries/useItems'
import { numberWithPlusSign } from './numberWithPlusSign'
import {
  damageExpression,
  effectBonusCalculation,
  effectDamageText,
  effectHoverCopy,
  effectValue,
  isCalculatedEffectBonus,
  itemEnhancementRow,
  type ItemEnhancementRow,
} from './structuredRows'
import { SetHoverContent } from './ResourceHoverCards'
import { effectKindLabel } from '../effectKindLabel'

interface EffectRow {
  key: string
  name: string
  type: string | null
  value: string
  effect: Effect | null
  enhancement: ItemEnhancementRow | null
  headingKind: 'set' | 'tier' | null
  bonusCount?: number
  isMatch: boolean
}

function matchesBonusFilter(effect: Effect, selectedBonuses: ReadonlySet<string>): boolean {
  if (selectedBonuses.has(effect.name.toLowerCase())) return true
  return effect.bonuses.some(
    (bonus) =>
      (bonus.group?.name !== undefined && selectedBonuses.has(bonus.group.name.toLowerCase())) ||
      selectedBonuses.has(bonus.statName.toLowerCase()) ||
      selectedBonuses.has(`${bonus.statName}:${bonus.bonusType}`.toLowerCase()),
  )
}

function toEffectRow(effect: Effect, selectedBonuses: ReadonlySet<string>, prefix = ''): EffectRow {
  return {
    key: `${prefix}effect-${effect.id}-${effect.sortOrder}`,
    name: effect.name,
    type:
      effect.bonusType ??
      ([...new Set(effect.bonuses.map((bonus) => bonus.bonusType))].join(', ') || null),
    value: effectValue(effect) ?? '',
    effect,
    enhancement: null,
    headingKind: null,
    isMatch: matchesBonusFilter(effect, selectedBonuses),
  }
}

function setRows(setDetail: SetDetail, selectedBonuses: ReadonlySet<string>): EffectRow[] {
  const rows: EffectRow[] = [
    {
      key: `set-${setDetail.id}`,
      name: setDetail.name,
      type: null,
      value: '',
      effect: null,
      enhancement: null,
      headingKind: 'set',
      bonusCount: setDetail.tiers.reduce((count, tier) => count + tier.effects.length, 0),
      isMatch: false,
    },
  ]
  for (const tier of setDetail.tiers) {
    rows.push({
      key: `tier-${tier.equippedCount}`,
      name: `${tier.equippedCount} pieces`,
      type: null,
      value: '',
      effect: null,
      enhancement: null,
      headingKind: 'tier',
      isMatch: false,
    })
    rows.push(
      ...tier.effects.map((effect) =>
        toEffectRow(effect, selectedBonuses, `tier-${tier.equippedCount}-`),
      ),
    )
  }
  return rows
}

function EmptyBonusCell(): JSX.Element {
  return <span className="resources-bonus-empty">—</span>
}

const COLUMNS: LedgerColumn<EffectRow>[] = [
  {
    key: 'name',
    label: 'Enchantment',
    isFlexible: true,
    minWidth: 120,
    sortValue: (row) => row.name,
    render: (row, heading) =>
      row.headingKind === 'set' ? (
        <span className="resources-set-heading">
          <span className="resources-set-name">{row.name}</span>
          <span className="resources-set-eyebrow">Set</span>
          <span className="resources-set-spacer" />
          <span className="resources-set-toggle">
            {heading?.isExpanded
              ? 'Hide'
              : `${row.bonusCount} ${row.bonusCount === 1 ? 'bonus' : 'bonuses'}`}
            {heading?.isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        </span>
      ) : row.headingKind === 'tier' ? (
        <span className="resources-set-tier-heading">{row.name}</span>
      ) : (
        <span className="resources-effect-name">
          {row.name}
          {row.effect?.damage.map((damage, index) => (
            <span key={index} className="resources-effect-damage">
              {effectDamageText(damage)}
            </span>
          ))}
        </span>
      ),
  },
  {
    key: 'type',
    label: 'Type',
    width: 120,
    minWidth: 120,
    sortValue: (row) => row.type ?? '',
    render: (row) =>
      row.headingKind ? null : row.type ? (
        <span className="resources-effect-type">{row.type}</span>
      ) : (
        <EmptyBonusCell />
      ),
  },
  {
    key: 'value',
    label: 'Value',
    defaultSortDirection: 'desc',
    width: 96,
    minWidth: 96,
    align: 'right',
    isMonospaced: true,
    sortValue: (row) => row.enhancement?.amount ?? row.effect?.value ?? Number.NEGATIVE_INFINITY,
    render: (row) =>
      row.headingKind ? null : !row.value ? (
        <EmptyBonusCell />
      ) : (
        <span className="resources-effect-value num">
          {row.value}
          {row.effect?.bonuses.some(isCalculatedEffectBonus) && (
            <span
              className="resources-effect-calculated"
              aria-label="Calculated"
              data-tip="Calculated stat bonus; hover the line for details"
            >
              ≈
            </span>
          )}
        </span>
      ),
  },
]

export function EffectList({
  item,
  itemName = '',
  effects,
  modifiers = [],
  setDetail,
  matchingBonuses = [],
  variant = 'pane',
  onOpenItem,
}: {
  item?: Item
  itemName?: string
  effects: Effect[]
  modifiers?: ResourceModifier[]
  setDetail?: SetDetail | null
  matchingBonuses?: string[]
  variant?: 'pane' | 'hover'
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element | null {
  const enhancement = item ? itemEnhancementRow(item) : null
  if (!effects.length && !setDetail && !enhancement) return null
  const selectedBonuses = new Set(matchingBonuses.map((name) => name.toLowerCase()))
  const itemRows: EffectRow[] = [
    ...(enhancement && item
      ? [
          {
            key: `item-enhancement-${item.id}`,
            name: enhancement.name,
            type: enhancement.type,
            value: enhancement.value,
            effect: null,
            enhancement,
            headingKind: null,
            isMatch: false,
          } satisfies EffectRow,
        ]
      : []),
    ...effects.map((effect) => toEffectRow(effect, selectedBonuses)),
  ]
  const rows = [...itemRows, ...(setDetail ? setRows(setDetail, selectedBonuses) : [])]
  if (variant === 'hover') {
    return (
      <DetailCardSection>
        <div className="resources-hover-rows">
          {itemRows.slice(0, 5).map((row) => (
            <EffectHoverRow key={row.key} row={row} itemName={itemName} modifiers={modifiers} />
          ))}
        </div>
        <DetailMore count={itemRows.length - 5} />
      </DetailCardSection>
    )
  }
  return (
    <DetailCardSection>
      {matchingBonuses.length > 0 && (
        <div className="resources-effect-legend">
          <span />
          Matches your Bonuses filter
        </div>
      )}
      <div className="resources-effect-ledger">
        <LedgerTable
          columns={COLUMNS}
          rowCount={rows.length}
          rowAt={(index) => rows[index]}
          rowKey={(row) => row.key}
          rowKind={(row) =>
            row.headingKind === 'set'
              ? 'collapsibleHeading'
              : row.headingKind === 'tier'
                ? 'subheading'
                : 'row'
          }
          onRowActivate={() => {}}
          isVirtualized={false}
          isDense
          label="Enchantments"
          isHighlighted={(row) => row.isMatch}
          hoverCard={(row) =>
            row.headingKind === 'set'
              ? {
                  kind: 'set',
                  delayMs: 120,
                  render: () => <SetHoverContent setId={setDetail!.id} onOpenItem={onOpenItem} />,
                }
              : row.enhancement
                ? {
                    kind: 'enchantment',
                    delayMs: 120,
                    render: () => (
                      <EnhancementHoverContent enhancement={row.enhancement!} itemName={itemName} />
                    ),
                  }
                : row.effect
                  ? {
                      kind: 'enchantment',
                      delayMs: 120,
                      render: () => (
                        <EffectHoverContent
                          effect={row.effect!}
                          itemName={
                            row.key.startsWith('tier-') ? (setDetail?.name ?? itemName) : itemName
                          }
                          modifiers={modifiers}
                        />
                      ),
                    }
                  : null
          }
        />
      </div>
    </DetailCardSection>
  )
}

function EnhancementHoverContent({
  enhancement,
  itemName,
}: {
  enhancement: ItemEnhancementRow
  itemName: string
}): JSX.Element {
  const hoverCopy = effectHoverCopy(enhancement)
  return (
    <>
      <strong className="resources-hover-title">{enhancement.name}</strong>
      {hoverCopy.verboseName && (
        <span className="resources-hover-fact">{hoverCopy.verboseName}</span>
      )}
      {itemName && (
        <DetailValueRow
          label={`From ${itemName}`}
          value={enhancement.value}
          type={enhancement.type}
          className="hover-card-row"
        />
      )}
      {hoverCopy.description && (
        <p className="resources-hover-definition">{hoverCopy.description}</p>
      )}
    </>
  )
}

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

function EffectHoverContent({
  effect,
  itemName,
  modifiers,
}: {
  effect: Effect
  itemName: string
  modifiers: ResourceModifier[]
}): JSX.Element {
  const effectQuery = useEffectDetail(`/v1/effects/${effect.id}`)
  useHoverCardLabel(effectQuery.data ? effectKindLabel(effectQuery.data.kind) : null)
  const wikiUrl = effectQuery.data?.wiki_url
  const hoverCopy = effectHoverCopy(effect)
  const groupedBonuses = new Map<string, EffectBonus[]>()
  for (const bonus of effect.bonuses) {
    if (!bonus.group) continue
    const key = `${bonus.group.id}:${bonus.bonusType}:${bonus.value}`
    groupedBonuses.set(key, [...(groupedBonuses.get(key) ?? []), bonus])
  }
  const ungroupedBonuses = effect.bonuses.filter((bonus) => !bonus.group)
  return (
    <>
      <strong className="resources-hover-title">
        {wikiUrl ? (
          <WikiLinkIcon
            href={wikiUrl}
            pageName={effect.name}
            label={effect.name}
            className="resources-effect-wiki-name"
          />
        ) : (
          effect.name
        )}
      </strong>
      {hoverCopy.verboseName && (
        <span className="resources-hover-fact">{hoverCopy.verboseName}</span>
      )}
      {effect.tier && (
        <span className="resources-hover-fact">
          {effect.tier.group} · Step {effect.tier.rank}
        </span>
      )}
      {itemName && effect.value !== null && (
        <DetailValueRow
          label={`From ${itemName}`}
          value={effectValue(effect) ?? ''}
          type={effect.bonusType}
          className="hover-card-row"
        />
      )}
      {[...groupedBonuses].map(([key, members]) => (
        <div key={key} className="resources-effect-bonus-group">
          <DetailValueRow
            label={members[0].group!.name}
            value={numberWithPlusSign(members[0].value)}
            type={members[0].bonusType}
            className="hover-card-row"
          />
          {members.map((bonus, index) => {
            const calculation = effectBonusCalculation(effect, bonus, effectQuery.data)
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
        const calculation = effectBonusCalculation(effect, bonus, effectQuery.data)
        return (
          <div
            key={`${bonus.statName}-${bonus.bonusType}-${index}`}
            className="resources-effect-ungrouped-bonus"
          >
            <DetailValueRow
              label={bonus.statName}
              value={numberWithPlusSign(bonus.value)}
              type={bonus.bonusType}
              className="hover-card-row"
            />
            {calculation && (
              <span className="resources-effect-calculation">
                <span>Calculated</span> · {calculation}
              </span>
            )}
          </div>
        )
      })}
      {effect.damage.map((damage, index) => (
        <DetailValueRow
          key={`damage-${index}`}
          label="Damage"
          value={effectDamageText(damage)}
          tone="damage"
          className="hover-card-row"
        />
      ))}
      {matchingDamageExpressions(effect, modifiers).map((damage, index) => (
        <DetailValueRow
          key={`${damage}-${index}`}
          label="Damage"
          value={damage}
          tone="damage"
          className="hover-card-row"
        />
      ))}
      {hoverCopy.description && (
        <p className="resources-hover-definition">{hoverCopy.description}</p>
      )}
    </>
  )
}

function EffectHoverRow({
  row,
  itemName,
  modifiers,
}: {
  row: EffectRow
  itemName: string
  modifiers: ResourceModifier[]
}): JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    isRow: true,
    render: () =>
      row.enhancement ? (
        <EnhancementHoverContent enhancement={row.enhancement} itemName={itemName} />
      ) : (
        <EffectHoverContent effect={row.effect!} itemName={itemName} modifiers={modifiers} />
      ),
  })
  return (
    <div className="resources-hover-effect-row" tabIndex={0} {...anchor}>
      <DetailValueRow
        label={row.name}
        value={row.value || '—'}
        type={row.type ?? '—'}
        className="hover-card-row"
      />
      {row.effect?.damage.map((damage, index) => (
        <span key={index} className="resources-effect-damage">
          {effectDamageText(damage)}
        </span>
      ))}
    </div>
  )
}
