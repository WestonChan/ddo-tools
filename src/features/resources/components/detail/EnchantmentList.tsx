import type { JSX } from 'react'
import {
  DetailCardSection,
  DetailMore,
  LedgerTable,
  useHoverCard,
  type LedgerColumn,
} from '../../../../components'
import type { SetDetail } from '../../queries/sets'
import type { ItemBonus, ItemEffect } from '../../queries/items'
import { numberWithPlusSign } from './numberWithPlusSign'
import { SetHoverContent } from './ResourceHoverCards'

interface EnchantmentRow {
  key: string
  name: string
  type: string | null
  value: string
  description: string | null
  headingKind: 'set' | 'tier' | null
  isMatch: boolean
}

function toBonusRow(bonus: ItemBonus, matchingNames: ReadonlySet<string>): EnchantmentRow {
  return {
    key: `b-${bonus.id}-${bonus.sortOrder}`,
    name: bonus.statName,
    type: bonus.bonusType,
    value: bonus.value === null ? '' : numberWithPlusSign(bonus.value),
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
    type: effect.target,
    value: '',
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
      type: null,
      value: '',
      description: null,
      headingKind: 'set',
      isMatch: false,
    },
  ]
  for (const tier of setDetail.tiers) {
    rows.push({
      key: `tier-${tier.equippedCount}`,
      name: `${tier.equippedCount} pieces`,
      type: null,
      value: '',
      description: tier.description,
      headingKind: 'tier',
      isMatch: false,
    })
    tier.bonuses.forEach((bonus) =>
      rows.push({
        key: `tier-${tier.equippedCount}-${bonus.key}`,
        name: bonus.name,
        type: bonus.type,
        value: bonus.value === null ? '' : numberWithPlusSign(bonus.value),
        description: bonus.description,
        headingKind: null,
        isMatch: matchingNames.has(bonus.name.toLowerCase()),
      }),
    )
  }
  return rows
}

const COLUMNS: LedgerColumn<EnchantmentRow>[] = [
  {
    key: 'name',
    label: 'Enchantment',
    isFlexible: true,
    minWidth: 120,
    sortValue: (row) => row.name,
    render: (row) =>
      row.headingKind === 'set' ? (
        <span className="resources-set-heading">
          {row.name}
          <span>Set</span>
        </span>
      ) : row.headingKind === 'tier' ? (
        <span className="resources-set-tier-heading">
          {row.name}
          {row.description && <span>{row.description}</span>}
        </span>
      ) : (
        <div>
          <span className="resources-bonus-name">{row.name}</span>
          {row.description && (
            <span className="resources-bonus-description">{row.description}</span>
          )}
        </div>
      ),
  },
  {
    key: 'type',
    label: 'Type',
    width: 120,
    minWidth: 120,
    sortValue: (row) => row.type ?? '',
    render: (row) =>
      row.type ? (
        <span className="resources-bonus-type" data-type={row.type?.toLowerCase()}>
          {row.type}
        </span>
      ) : null,
  },
  {
    key: 'value',
    label: 'Value',
    width: 64,
    minWidth: 64,
    align: 'right',
    isMonospaced: true,
    sortValue: (row) => Number.parseFloat(row.value) || 0,
    render: (row) => <span className="resources-bonus-value num">{row.value}</span>,
  },
]

export function EnchantmentList({
  bonuses,
  effects,
  setDetail,
  matchingEnchantments = [],
  variant = 'drawer',
  onOpenItem,
}: {
  bonuses: ItemBonus[]
  effects: ItemEffect[]
  setDetail?: SetDetail | null
  matchingEnchantments?: string[]
  variant?: 'drawer' | 'hover'
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element | null {
  if (!bonuses.length && !effects.length && !setDetail) return null
  const matchingNames = new Set(matchingEnchantments.map((name) => name.toLowerCase()))
  const itemRows = [
    ...bonuses.map((bonus) => toBonusRow(bonus, matchingNames)),
    ...effects.map((effect) => toEffectRow(effect, matchingNames)),
  ]
  const rows = [...itemRows, ...(setDetail ? setRows(setDetail, matchingNames) : [])]
  if (variant === 'hover') {
    return (
      <DetailCardSection heading="Enchantments">
        <div className="resources-hover-rows">
          {itemRows.slice(0, 5).map((row) => (
            <EnchantmentHoverRow key={row.key} row={row} />
          ))}
        </div>
        <DetailMore count={itemRows.length - 5} />
      </DetailCardSection>
    )
  }
  return (
    <DetailCardSection heading="Enchantments">
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
          rowKind={(row) => (row.headingKind ? 'heading' : 'row')}
          onRowActivate={() => {}}
          isVirtualized={false}
          isDense
          initialSort={{ key: 'value', direction: 'desc' }}
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
                    render: () => <EnchantmentHoverContent row={row} />,
                  }
          }
        />
      </div>
    </DetailCardSection>
  )
}

function EnchantmentHoverContent({ row }: { row: EnchantmentRow }): JSX.Element {
  return (
    <>
      <strong className="resources-hover-title">{row.name}</strong>
      {row.type && <span className="resources-hover-fact">Type · {row.type}</span>}
      <p className="resources-hover-definition">
        {row.description ?? `Grants ${row.type ?? 'a'} bonus to ${row.name}.`}
      </p>
    </>
  )
}

function EnchantmentHoverRow({ row }: { row: EnchantmentRow }): JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    render: () => <EnchantmentHoverContent row={row} />,
  })
  return (
    <div className="resources-hover-row" tabIndex={0} {...anchor}>
      <span>{row.name}</span>
      <span>{row.value || row.type}</span>
    </div>
  )
}
