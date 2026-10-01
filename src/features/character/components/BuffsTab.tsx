import { useId, type JSX } from 'react'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import {
  PLACEHOLDER_BUFF_GROUPS,
  type PlaceholderBuff,
  type PlaceholderBuffEffect,
} from '../data/placeholderStats'

type BonusStanding = 'applied' | 'overriding' | 'overridden'

interface BuffEffectLedgerRow {
  bonusType: string
  detail: string
  value: string
  standing: BonusStanding
}

function ledgerRowsOf(effect: PlaceholderBuffEffect): BuffEffectLedgerRow[] {
  if (effect.overriddenBy) {
    return [
      {
        bonusType: effect.bonusType,
        detail: `${effect.stat} · ${effect.overriddenBy.source}`,
        value: effect.overriddenBy.value,
        standing: 'overriding',
      },
      {
        bonusType: effect.bonusType,
        detail: `${effect.stat} · this buff`,
        value: effect.value,
        standing: 'overridden',
      },
    ]
  }
  const appliedRow: BuffEffectLedgerRow = {
    bonusType: effect.bonusType,
    detail: effect.stat,
    value: effect.value,
    standing: 'applied',
  }
  if (!effect.overrides) return [appliedRow]
  return [
    appliedRow,
    {
      bonusType: effect.bonusType,
      detail: `${effect.stat} · ${effect.overrides.source}`,
      value: effect.overrides.value,
      standing: 'overridden',
    },
  ]
}

function affectedStatCountLabel(buff: PlaceholderBuff): string {
  const count = buff.effects.length
  return count === 1 ? '1 stat' : `${count} stats`
}

interface BuffRowProps {
  buff: PlaceholderBuff
  isActive: boolean
  isExpanded: boolean
  onToggleActive: () => void
  onToggleExpanded: () => void
}

function BuffRow({
  buff,
  isActive,
  isExpanded,
  onToggleActive,
  onToggleExpanded,
}: BuffRowProps): JSX.Element {
  const detailId = useId()
  const ledgerRows = buff.effects.flatMap(ledgerRowsOf)
  return (
    <li className="stats-panel-buff">
      <div className={`stats-panel-row${isActive ? ' stats-panel-row--active' : ''}`}>
        <button
          type="button"
          role="switch"
          className={`stats-panel-switch${isActive ? ' stats-panel-switch--on' : ''}`}
          aria-checked={isActive}
          aria-label={buff.name}
          title="Toggle buff"
          onClick={onToggleActive}
        >
          <span className="stats-panel-switch-track">
            <span className="stats-panel-switch-knob" />
          </span>
        </button>
        <button
          type="button"
          className="stats-panel-row-toggle"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? detailId : undefined}
          onClick={onToggleExpanded}
        >
          <span className="stats-panel-buff-name">{buff.name}</span>
          <span className="stats-panel-buff-count num">{affectedStatCountLabel(buff)}</span>
          <span
            className={`stats-panel-chevron${isExpanded ? ' stats-panel-chevron--expanded' : ''}`}
          >
            <ChevronRight size={14} />
          </span>
        </button>
      </div>
      {isExpanded && (
        <div id={detailId} className="stats-panel-buff-detail">
          <ul className="stats-panel-effects" aria-label={`${buff.name} effects`}>
            {ledgerRows.map((row, index) => (
              <li
                key={index}
                className={`stats-panel-ledger-row stats-panel-ledger-row--${row.standing}`}
              >
                {row.standing === 'overriding' && (
                  <span
                    className="stats-panel-effect-warning"
                    role="img"
                    aria-label="Overrides this buff"
                    title="Overrides this buff"
                  >
                    <TriangleAlert size={12} />
                  </span>
                )}
                <span className="stats-panel-ledger-type">
                  {row.standing === 'overridden' ? `↳ ${row.bonusType}` : row.bonusType}
                </span>
                <span className="stats-panel-ledger-detail">{row.detail}</span>
                <span className="stats-panel-ledger-value num">{row.value}</span>
              </li>
            ))}
          </ul>
          <p className="stats-panel-buff-duration">{buff.duration}</p>
        </div>
      )}
    </li>
  )
}

interface BuffsTabProps {
  activeBuffNames: ReadonlySet<string>
  expandedBuffNames: ReadonlySet<string>
  onToggleActive: (buffName: string) => void
  onToggleExpanded: (buffName: string) => void
}

export function BuffsTab({
  activeBuffNames,
  expandedBuffNames,
  onToggleActive,
  onToggleExpanded,
}: BuffsTabProps): JSX.Element {
  return (
    <>
      {PLACEHOLDER_BUFF_GROUPS.map((group) => (
        <section key={group.name} className="stats-panel-group">
          <h3 className="section-label stats-panel-group-label">{group.name}</h3>
          <ul className="stats-panel-rows">
            {group.buffs.map((buff) => (
              <BuffRow
                key={buff.name}
                buff={buff}
                isActive={activeBuffNames.has(buff.name)}
                isExpanded={expandedBuffNames.has(buff.name)}
                onToggleActive={() => onToggleActive(buff.name)}
                onToggleExpanded={() => onToggleExpanded(buff.name)}
              />
            ))}
          </ul>
        </section>
      ))}
      <p className="stats-panel-hint">Toggles recompute every stat above.</p>
    </>
  )
}
