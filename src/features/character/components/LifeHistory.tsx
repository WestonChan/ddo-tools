import { useState } from 'react'
import type { Character, EpicSphere, Life, ReincarnationType } from '../types'
import { PAST_LIFE_DEFS } from '../data/pastLifeDefs'
import { capitalize, formatClassSummary, formatRace } from '../utils'

// --- Reincarnate types ---

export type ReincarnateResult =
  | { mode: 'epic'; epicFeatId: string }
  | { mode: 'true'; type: ReincarnationType }

type ReincarnateMode = 'epic' | 'true'

const TRUE_REINCARNATION_TYPES: { value: ReincarnationType; label: string }[] = [
  { value: 'heroic', label: 'Class (Heroic TR)' },
  { value: 'racial', label: 'Racial' },
  { value: 'iconic', label: 'Iconic' },
]

const EPIC_SPHERES: { value: EpicSphere; label: string }[] = [
  { value: 'arcane', label: 'Arcane' },
  { value: 'divine', label: 'Divine' },
  { value: 'martial', label: 'Martial' },
  { value: 'primal', label: 'Primal' },
]

const EPIC_FEATS_BY_SPHERE = EPIC_SPHERES.map((s) => ({
  sphere: s,
  feats: PAST_LIFE_DEFS.filter((d) => d.category === 'epic' && d.sphere === s.value),
}))

// --- ReincarnatePanel ---

function ReincarnatePanel({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: (result: ReincarnateResult) => void
}) {
  const [mode, setMode] = useState<ReincarnateMode>('epic')
  const [epicFeatId, setEpicFeatId] = useState(EPIC_FEATS_BY_SPHERE[0].feats[0]?.id ?? '')
  const [trueType, setTrueType] = useState<ReincarnationType>('heroic')

  return (
    <div className="reincarnate-panel">
      <div className="reincarnate-panel-header">Reincarnate</div>
      <div className="reincarnate-panel-field">
        <label>Reincarnation type</label>
        <div className="reincarnate-type-options">
          <button
            className={`reincarnate-type-btn ${mode === 'epic' ? 'active' : ''}`}
            onClick={() => setMode('epic')}
          >
            Epic TR
          </button>
          <button
            className={`reincarnate-type-btn ${mode === 'true' ? 'active' : ''}`}
            onClick={() => setMode('true')}
          >
            True Reincarnate
          </button>
        </div>
      </div>
      {mode === 'epic' && (
        <div className="reincarnate-panel-field">
          <label>Epic Past Life Feat</label>
          <div className="epic-feat-select">
            {EPIC_FEATS_BY_SPHERE.map(({ sphere, feats }) => (
              <div key={sphere.value} className="epic-feat-group">
                <div className="epic-feat-group-label">{sphere.label}</div>
                <div className="reincarnate-type-options">
                  {feats.map((f) => (
                    <button
                      key={f.id}
                      className={`reincarnate-type-btn ${epicFeatId === f.id ? 'active' : ''}`}
                      onClick={() => setEpicFeatId(f.id)}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {mode === 'true' && (
        <div className="reincarnate-panel-field">
          <label>This ends the current life and starts a new build</label>
          <div className="reincarnate-type-options">
            {TRUE_REINCARNATION_TYPES.map((rt) => (
              <button
                key={rt.value}
                className={`reincarnate-type-btn ${trueType === rt.value ? 'active' : ''}`}
                onClick={() => setTrueType(rt.value)}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="reincarnate-panel-actions">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() =>
            onConfirm(
              mode === 'epic' ? { mode: 'epic', epicFeatId } : { mode: 'true', type: trueType },
            )
          }
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

// --- LifeHistory ---

export function LifeHistory({
  character,
  viewingLifeId,
  showReincarnate,
  onToggleReincarnate,
  onCancelReincarnate,
  onConfirmReincarnate,
  onApplyPlanned,
  onViewLife,
  onCopyToPlanned,
}: {
  character: Character
  viewingLifeId: string
  showReincarnate: boolean
  onToggleReincarnate: () => void
  onCancelReincarnate: () => void
  onConfirmReincarnate: (result: ReincarnateResult) => void
  onApplyPlanned: (lifeId: string) => void
  onViewLife: (lifeId: string) => void
  onCopyToPlanned: (lifeId: string) => void
}) {
  const completed = character.lives.filter((l) => l.status === 'completed')
  const current = character.lives.filter((l) => l.status === 'current')
  const planned = character.lives.filter((l) => l.status === 'planned')
  const buildDesc = (life: Life) => `${formatRace(life.race)} ${formatClassSummary(life)}`

  const reincLabel = (life: Life) => {
    if (!life.reincarnation) return ''
    const r = life.reincarnation
    if (r.type === 'epic') {
      const feat = PAST_LIFE_DEFS.find((d) => d.id === r.epicFeatId)
      return `Epic TR: ${feat?.name ?? r.epicFeatId ?? ''}`
    }
    return `${capitalize(r.type)} TR`
  }

  return (
    <div>
      <div className="life-history-title">Reincarnation History</div>
      {/* Completed — flat chronological list of all reincarnation events */}
      {completed.length > 0 && <div className="section-label">Completed</div>}
      {completed.map((life) => (
        <div
          key={life.id}
          className={`life-entry row-interactive ${viewingLifeId === life.id ? 'viewing' : ''}`}
          onClick={() => onViewLife(life.id)}
        >
          <span className="life-marker">{viewingLifeId === life.id ? '★' : ''}</span>
          <span className="life-label">{reincLabel(life)}</span>
          <span className="life-summary">— {buildDesc(life)}</span>
          <button
            className="btn-ghost-sm"
            onClick={(e) => {
              e.stopPropagation()
              onCopyToPlanned(life.id)
            }}
          >
            Copy to Planned
          </button>
        </div>
      ))}

      {/* Current life */}
      {current.map((life) => (
        <div key={life.id}>
          <div className="section-label">Current</div>
          <div
            className={`life-entry row-interactive current-life-entry ${viewingLifeId === life.id ? 'viewing' : ''}`}
            onClick={() => onViewLife(life.id)}
          >
            <span className="life-marker">{viewingLifeId === life.id ? '★' : ''}</span>
            <span className="life-summary">{buildDesc(life)}</span>
            {completed.length > 0 && (
              <button
                className="btn-ghost-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: undo last reincarnation
                  console.log('Undo reincarnation')
                }}
              >
                Undo
              </button>
            )}
            <button
              className="reincarnate-btn"
              onClick={(e) => {
                e.stopPropagation()
                onToggleReincarnate()
              }}
            >
              Reincarnate
            </button>
          </div>
          {showReincarnate && (
            <ReincarnatePanel onCancel={onCancelReincarnate} onConfirm={onConfirmReincarnate} />
          )}
        </div>
      ))}

      {/* Planned lives */}
      {planned.length > 0 && <div className="section-label">Planned</div>}
      {planned.map((life) => (
        <div
          key={life.id}
          className={`life-entry row-interactive ${viewingLifeId === life.id ? 'viewing' : ''}`}
          onClick={() => onViewLife(life.id)}
        >
          <span className="life-marker">{viewingLifeId === life.id ? '★' : ''}</span>
          <button
            className="btn-ghost-sm"
            onClick={(e) => {
              e.stopPropagation()
              onApplyPlanned(life.id)
            }}
          >
            Apply
          </button>
          <span className="life-summary">{buildDesc(life)}</span>
        </div>
      ))}

      <button className="add-planned-life-btn">+ Add Planned Life</button>
    </div>
  )
}
