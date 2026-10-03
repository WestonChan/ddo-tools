import { useState, type JSX, type ReactNode } from 'react'
import type { Character, Life, ReincarnationType } from '../types'
import { PAST_LIFE_DEFINITIONS } from '../data/pastLifeDefinitions'
import { capitalized, EPIC_SPHERES, raceAndClassLabelOf } from '../utils'
import { EditableText } from '../../../components'
import { Star } from 'lucide-react'

export type ReincarnationChoice =
  { mode: 'epic'; epicFeatId: string } | { mode: 'true'; reincarnationType: ReincarnationType }

type ReincarnationMode = 'epic' | 'true'

const TRUE_REINCARNATION_TYPES: { reincarnationType: ReincarnationType; label: string }[] = [
  { reincarnationType: 'heroic', label: 'Class (Heroic TR)' },
  { reincarnationType: 'racial', label: 'Racial' },
  { reincarnationType: 'iconic', label: 'Iconic' },
]

const EPIC_PAST_LIVES_BY_SPHERE = EPIC_SPHERES.map((s) => ({
  sphere: s,
  pastLives: PAST_LIFE_DEFINITIONS.filter((d) => d.category === 'epic' && d.sphere === s.id),
}))

function ReincarnationPanel({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: (reincarnationChoice: ReincarnationChoice) => void
}): JSX.Element {
  const [reincarnationMode, setReincarnationMode] = useState<ReincarnationMode>('epic')
  const [epicFeatId, setEpicFeatId] = useState(EPIC_PAST_LIVES_BY_SPHERE[0].pastLives[0]?.id ?? '')
  const [trueReincarnationType, setTrueReincarnationType] = useState<ReincarnationType>('heroic')

  return (
    <div className="reincarnate-panel">
      <div className="reincarnate-panel-header">Reincarnate</div>
      <div className="reincarnate-panel-field">
        <label className="section-label">Reincarnation type</label>
        <div className="reincarnate-type-options">
          <button
            className={`reincarnate-type-btn ${reincarnationMode === 'epic' ? 'active' : ''}`}
            onClick={() => setReincarnationMode('epic')}
          >
            Epic TR
          </button>
          <button
            className={`reincarnate-type-btn ${reincarnationMode === 'true' ? 'active' : ''}`}
            onClick={() => setReincarnationMode('true')}
          >
            True reincarnate
          </button>
        </div>
      </div>
      {reincarnationMode === 'epic' && (
        <div className="reincarnate-panel-field">
          <label className="section-label">Epic past life feat</label>
          <div className="epic-feat-select">
            {EPIC_PAST_LIVES_BY_SPHERE.map(({ sphere, pastLives }) => (
              <div key={sphere.id}>
                <div className="section-label">{sphere.label}</div>
                <div className="reincarnate-type-options">
                  {pastLives.map((f) => (
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
      {reincarnationMode === 'true' && (
        <div className="reincarnate-panel-field">
          <label className="section-label">This ends the current life and starts a new build</label>
          <div className="reincarnate-type-options">
            {TRUE_REINCARNATION_TYPES.map((rt) => (
              <button
                key={rt.reincarnationType}
                className={`reincarnate-type-btn ${trueReincarnationType === rt.reincarnationType ? 'active' : ''}`}
                onClick={() => setTrueReincarnationType(rt.reincarnationType)}
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
              reincarnationMode === 'epic'
                ? { mode: 'epic', epicFeatId }
                : { mode: 'true', reincarnationType: trueReincarnationType },
            )
          }
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

function LifeRow({
  isViewed,
  lifeNumberLabel,
  name,
  buildSummary,
  onView,
  onRename,
  children,
}: {
  isViewed: boolean
  lifeNumberLabel?: ReactNode
  name: string
  buildSummary: string
  onView: () => void
  onRename: (newName: string) => void
  children?: ReactNode
}): JSX.Element {
  const lifeLabel = (
    <>
      <span className="life-marker">{isViewed ? <Star size={14} /> : ''}</span>
      {lifeNumberLabel != null && <span className="life-number">{lifeNumberLabel}</span>}
    </>
  )
  return (
    <div className={`life-entry hoverable${isViewed ? ' selected' : ''}`}>
      {isViewed ? (
        <>
          <button type="button" className="life-entry-select" aria-current="true" onClick={onView}>
            {lifeLabel}
          </button>
          <EditableText
            text={name}
            placeholder="Name..."
            className="life-name"
            onCommit={onRename}
          />
          <span className="life-summary">{buildSummary}</span>
        </>
      ) : (
        <button
          type="button"
          className="life-entry-select life-entry-select--whole-row"
          onClick={onView}
        >
          {lifeLabel}
          <span className="life-name">
            {name || <span className="editable-text-placeholder">Name...</span>}
          </span>
          <span className="life-summary">{buildSummary}</span>
        </button>
      )}
      <div className="life-actions">{children}</div>
    </div>
  )
}

export function LifeHistory({
  character,
  lifeNumbersByLifeId,
  viewedLifeId,
  isReincarnationPanelOpen,
  onToggleReincarnationPanel,
  onCancelReincarnation,
  onConfirmReincarnation,
  onViewLife,
  onCopyLifeToPlannedBuilds,
  onRenameLife,
}: {
  character: Character
  lifeNumbersByLifeId: Map<string, number>
  viewedLifeId: string
  isReincarnationPanelOpen: boolean
  onToggleReincarnationPanel: () => void
  onCancelReincarnation: () => void
  onConfirmReincarnation: (reincarnationChoice: ReincarnationChoice) => void
  onViewLife: (lifeId: string) => void
  onCopyLifeToPlannedBuilds: (lifeId: string) => void
  onRenameLife: (lifeId: string, newName: string) => void
}): JSX.Element {
  const completedLives = character.lives.filter((l) => l.status === 'completed')
  const currentLives = character.lives.filter((l) => l.status === 'current')
  const reincarnationLabel = (life: Life): string => {
    if (!life.reincarnation) return ''
    const r = life.reincarnation
    if (r.type === 'epic') {
      const epicPastLife = PAST_LIFE_DEFINITIONS.find((d) => d.id === r.epicFeatId)
      return `Epic TR: ${epicPastLife?.name ?? r.epicFeatId ?? ''}`
    }
    return `${capitalized(r.type)} TR`
  }

  return (
    <section className="card">
      <div className="card-header section-label">Life history</div>
      <div className="character-card-body">
        {currentLives.map((life) => (
          <div key={life.id}>
            <div className="section-label">Current</div>
            <LifeRow
              isViewed={viewedLifeId === life.id}
              lifeNumberLabel={
                <>
                  Life <span className="num">{lifeNumbersByLifeId.get(life.id) ?? '?'}</span>
                </>
              }
              name={life.name}
              buildSummary={raceAndClassLabelOf(life)}
              onView={() => onViewLife(life.id)}
              onRename={(name) => onRenameLife(life.id, name)}
            >
              {completedLives.length > 0 && (
                <button type="button" className="row-action-btn">
                  Undo
                </button>
              )}
              <button
                type="button"
                className="row-action-btn btn-primary-sm"
                onClick={onToggleReincarnationPanel}
              >
                Reincarnate
              </button>
            </LifeRow>
            {isReincarnationPanelOpen && (
              <ReincarnationPanel
                onCancel={onCancelReincarnation}
                onConfirm={onConfirmReincarnation}
              />
            )}
          </div>
        ))}

        {completedLives.length > 0 && <div className="section-label">Completed</div>}
        {[...completedLives].reverse().map((life) => {
          const lifeNumber = lifeNumbersByLifeId.get(life.id)
          return (
            <LifeRow
              key={life.id}
              isViewed={viewedLifeId === life.id}
              lifeNumberLabel={
                lifeNumber != null ? (
                  <>
                    Life <span className="num">{lifeNumber}</span>
                  </>
                ) : undefined
              }
              name={life.name}
              buildSummary={`${reincarnationLabel(life)} · ${raceAndClassLabelOf(life)}`}
              onView={() => onViewLife(life.id)}
              onRename={(name) => onRenameLife(life.id, name)}
            >
              <button
                type="button"
                className="row-action-btn"
                onClick={() => onCopyLifeToPlannedBuilds(life.id)}
              >
                Copy to planned
              </button>
            </LifeRow>
          )
        })}
      </div>
    </section>
  )
}
