import type { JSX } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailValueRow,
  LedgerTable,
  useHoverCard,
  type LedgerColumn,
} from '../../../../components'
import type { EffectRow } from './effectRows'
import { effectDamageText, isCalculatedEffectBonus } from './structuredRows'
import { SetHoverCard } from './ResourceHoverCards'
import { BonusHoverCard } from './BonusDetailCard'

function EmptyBonusCell(): JSX.Element {
  return <span className="resources-bonus-empty">—</span>
}

function CalculatedMarker(): JSX.Element {
  return (
    <span
      className="resources-effect-calculated"
      aria-label="Calculated"
      data-tip="Calculated stat bonus; hover the line for details"
    >
      ≈
    </span>
  )
}

const COLUMNS: LedgerColumn<EffectRow>[] = [
  {
    key: 'name',
    label: 'Enchantment',
    isFlexible: true,
    isPrimary: true,
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
          {row.effect?.bonuses.some(isCalculatedEffectBonus) && <CalculatedMarker />}
        </span>
      ),
  },
]

export function EffectListFullView({ entries }: { entries: readonly EffectRow[] }): JSX.Element {
  return (
    <>
      {entries.some((row) => row.hasBonusFilter) && (
        <div className="resources-effect-legend">
          <span />
          Matches your Bonuses filter
        </div>
      )}
      <div className="resources-effect-ledger">
        <LedgerTable
          columns={COLUMNS}
          rowCount={entries.length}
          rowAt={(index) => entries[index]}
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
                  render: () => <SetHoverCard setId={row.setId!} onOpenItem={row.onOpenItem} />,
                }
              : row.enhancement
                ? {
                    kind: 'enchantment',
                    delayMs: 120,
                    render: () => (
                      <BonusHoverCard enhancement={row.enhancement!} originName={row.itemName} />
                    ),
                  }
                : row.effect
                  ? {
                      kind: 'enchantment',
                      delayMs: 120,
                      render: () => (
                        <BonusHoverCard
                          effect={row.effect!}
                          originName={row.itemName}
                          modifiers={row.modifiers}
                        />
                      ),
                    }
                  : null
          }
        />
      </div>
    </>
  )
}

export function EffectListBriefView({ entries }: { entries: readonly EffectRow[] }): JSX.Element {
  return (
    <div className="resources-hover-rows">
      {entries.map((row) =>
        row.headingKind === 'set' ? (
          <div key={row.key} className="resources-set-tier hover-card-row">
            {row.name}
          </div>
        ) : row.headingKind === 'tier' ? (
          <div key={row.key} className="resources-set-tier hover-card-row">
            {row.name}
          </div>
        ) : (
          <EffectHoverRow key={row.key} row={row} />
        ),
      )}
    </div>
  )
}

function EffectHoverRow({ row }: { row: EffectRow }): JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    isRow: true,
    render: () =>
      row.enhancement ? (
        <BonusHoverCard enhancement={row.enhancement} originName={row.itemName} />
      ) : (
        <BonusHoverCard effect={row.effect!} originName={row.itemName} modifiers={row.modifiers} />
      ),
  })
  return (
    <div
      className="resources-hover-effect-row focus-ring-row focus-ring-proxy"
      tabIndex={0}
      {...anchor}
    >
      <DetailValueRow
        label={row.name}
        value={row.value || '—'}
        valueMarker={
          row.effect?.bonuses.some(isCalculatedEffectBonus) ? <CalculatedMarker /> : null
        }
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
