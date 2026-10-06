import type { JSX } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailCardSection,
  DetailMore,
  DetailValueRow,
  LedgerTable,
  useHoverCard,
  type LedgerColumn,
} from '../../../../components'
import type { SetDetail } from '../../queries/sets'
import type { ItemBonus, ItemEffect, ResourceModifier } from '../../queries/items'
import { numberWithPlusSign } from './numberWithPlusSign'
import { bonusValue, damageExpression } from './structuredRows'
import { SetHoverContent } from './ResourceHoverCards'

interface EnchantmentRow {
  key: string
  name: string
  sourceName: string
  type: string | null
  value: string
  hoverValue: string
  description: string | null
  headingKind: 'set' | 'tier' | null
  bonusCount?: number
  isMatch: boolean
}

function toBonusRow(bonus: ItemBonus, matchingNames: ReadonlySet<string>): EnchantmentRow {
  return {
    key: `b-${bonus.id}-${bonus.sortOrder}`,
    name: bonus.statName,
    sourceName: bonus.name,
    type: bonus.bonusType,
    value: bonus.value === null ? '' : numberWithPlusSign(bonus.value),
    hoverValue: bonusValue(bonus) ?? '',
    description: bonus.description && bonus.description !== bonus.name ? bonus.description : null,
    headingKind: null,
    isMatch:
      matchingNames.has(bonus.statName.toLowerCase()) ||
      matchingNames.has(bonus.name.toLowerCase()),
  }
}

function toEffectRow(effect: ItemEffect, matchingNames: ReadonlySet<string>): EnchantmentRow {
  return {
    key: `e-${effect.id}-${effect.sortOrder}`,
    name:
      effect.value === null ? effect.name : `${effect.name} ${numberWithPlusSign(effect.value)}`,
    sourceName: effect.name,
    type: effect.target,
    value: '',
    hoverValue: effect.value === null ? '' : numberWithPlusSign(effect.value),
    description:
      effect.description && effect.description !== effect.name ? effect.description : null,
    headingKind: null,
    isMatch: matchingNames.has(effect.name.toLowerCase()),
  }
}

function setRows(setDetail: SetDetail, matchingNames: ReadonlySet<string>): EnchantmentRow[] {
  const rows: EnchantmentRow[] = [
    {
      key: `set-${setDetail.id}`,
      name: setDetail.name,
      sourceName: setDetail.name,
      type: null,
      value: '',
      hoverValue: '',
      description: null,
      headingKind: 'set',
      bonusCount: setDetail.tiers.reduce((count, tier) => count + tier.bonuses.length, 0),
      isMatch: false,
    },
  ]
  for (const tier of setDetail.tiers) {
    rows.push({
      key: `tier-${tier.equippedCount}`,
      name: `${tier.equippedCount} pieces`,
      sourceName: `${tier.equippedCount} pieces`,
      type: null,
      value: '',
      hoverValue: '',
      description: null,
      headingKind: 'tier',
      isMatch: false,
    })
    tier.bonuses.forEach((bonus) =>
      rows.push({
        key: `tier-${tier.equippedCount}-${bonus.key}`,
        name: bonus.name,
        sourceName: bonus.name,
        type: bonus.type,
        value: bonus.value === null ? '' : numberWithPlusSign(bonus.value),
        hoverValue: bonus.value === null ? '' : numberWithPlusSign(bonus.value),
        description: bonus.description,
        headingKind: null,
        isMatch: matchingNames.has(bonus.name.toLowerCase()),
      }),
    )
  }
  return rows
}

function EmptyBonusCell(): JSX.Element {
  return <span className="resources-bonus-empty">—</span>
}

const COLUMNS: LedgerColumn<EnchantmentRow>[] = [
  {
    key: 'type',
    label: 'Type',
    width: 96,
    minWidth: 96,
    sortValue: (row) => row.type ?? '',
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
      ) : row.type ? (
        <span className="resources-bonus-type">{row.type}</span>
      ) : (
        <EmptyBonusCell />
      ),
  },
  {
    key: 'name',
    label: 'Enchantment',
    isFlexible: true,
    minWidth: 120,
    sortValue: (row) => row.name,
    render: (row) =>
      row.headingKind ? null : <span className="resources-bonus-name">{row.name}</span>,
  },
  {
    key: 'value',
    label: 'Value',
    defaultSortDirection: 'desc',
    width: 64,
    minWidth: 64,
    align: 'right',
    isMonospaced: true,
    sortValue: (row) => Number.parseFloat(row.value) || 0,
    render: (row) =>
      row.headingKind ? null : row.value ? (
        <span className="resources-bonus-value num">{row.value}</span>
      ) : (
        <EmptyBonusCell />
      ),
  },
]

export function EnchantmentList({
  itemName = '',
  bonuses,
  modifiers = [],
  effects,
  enhancementBonus = null,
  setDetail,
  matchingEnchantments = [],
  variant = 'pane',
  onOpenItem,
}: {
  itemName?: string
  bonuses: ItemBonus[]
  modifiers?: ResourceModifier[]
  effects: ItemEffect[]
  enhancementBonus?: number | null
  setDetail?: SetDetail | null
  matchingEnchantments?: string[]
  variant?: 'pane' | 'hover'
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element | null {
  if (enhancementBonus === null && !bonuses.length && !effects.length && !setDetail) return null
  const matchingNames = new Set(matchingEnchantments.map((name) => name.toLowerCase()))
  const itemRows = [
    ...(enhancementBonus === null
      ? []
      : [
          {
            key: 'enhancement-bonus',
            name: 'Enhancement Bonus',
            sourceName: 'Enhancement Bonus',
            type: 'Enhancement',
            value: numberWithPlusSign(enhancementBonus),
            hoverValue: numberWithPlusSign(enhancementBonus),
            description: null,
            headingKind: null,
            isMatch: false,
          } satisfies EnchantmentRow,
        ]),
    ...bonuses.map((bonus) => toBonusRow(bonus, matchingNames)),
    ...effects.map((effect) => toEffectRow(effect, matchingNames)),
  ]
  const rows = [...itemRows, ...(setDetail ? setRows(setDetail, matchingNames) : [])]
  if (variant === 'hover') {
    return (
      <DetailCardSection>
        <div className="resources-hover-enchantment-table" role="table" aria-label="Enchantments">
          <div className="resources-hover-enchantment-heading" role="row">
            <span role="columnheader">Type</span>
            <span role="columnheader">Enchantment</span>
            <span role="columnheader">Value</span>
          </div>
          {itemRows.slice(0, 5).map((row) => (
            <EnchantmentHoverRow
              key={row.key}
              row={row}
              itemName={itemName}
              modifiers={modifiers}
            />
          ))}
        </div>
        <DetailMore count={itemRows.length - 5} />
      </DetailCardSection>
    )
  }
  return (
    <DetailCardSection>
      {matchingEnchantments.length > 0 && (
        <div className="resources-enchantment-legend">
          <span />
          Matches your Enchantments filter
        </div>
      )}
      <div className="resources-enchantment-ledger">
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
              : row.headingKind === 'tier'
                ? null
                : {
                    kind: 'enchantment',
                    delayMs: 120,
                    render: () => (
                      <EnchantmentHoverContent
                        row={row}
                        itemName={
                          row.key.startsWith('tier-') ? (setDetail?.name ?? itemName) : itemName
                        }
                        modifiers={modifiers}
                      />
                    ),
                  }
          }
        />
      </div>
    </DetailCardSection>
  )
}

function matchingDamageExpressions(row: EnchantmentRow, modifiers: ResourceModifier[]): string[] {
  const normalizedNames = [row.name, row.sourceName].map((name) =>
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

function EnchantmentHoverContent({
  row,
  itemName,
  modifiers,
}: {
  row: EnchantmentRow
  itemName: string
  modifiers: ResourceModifier[]
}): JSX.Element {
  return (
    <>
      <strong className="resources-hover-title">{row.name}</strong>
      {row.hoverValue && itemName && (
        <DetailValueRow
          label={`From ${itemName}`}
          value={row.hoverValue}
          type={row.type}
          className="hover-card-row"
        />
      )}
      {!row.hoverValue && row.type && (
        <span className="resources-hover-fact">Type · {row.type}</span>
      )}
      {matchingDamageExpressions(row, modifiers).map((damage, index) => (
        <DetailValueRow
          key={`${damage}-${index}`}
          label="Damage"
          value={damage}
          tone="damage"
          className="hover-card-row"
        />
      ))}
      {row.description && <p className="resources-hover-definition">{row.description}</p>}
    </>
  )
}

function EnchantmentHoverRow({
  row,
  itemName,
  modifiers,
}: {
  row: EnchantmentRow
  itemName: string
  modifiers: ResourceModifier[]
}): JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    render: () => <EnchantmentHoverContent row={row} itemName={itemName} modifiers={modifiers} />,
  })
  return (
    <div
      className="resources-hover-enchantment-row hover-card-row"
      role="row"
      tabIndex={0}
      {...anchor}
    >
      <span role="cell" className="resources-bonus-type">
        {row.type || <EmptyBonusCell />}
      </span>
      <span role="cell" className="resources-bonus-name">
        {row.name}
      </span>
      <span role="cell" className="resources-bonus-value num">
        {row.value || row.hoverValue || <EmptyBonusCell />}
      </span>
    </div>
  )
}
