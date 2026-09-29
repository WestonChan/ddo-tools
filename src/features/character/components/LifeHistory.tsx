import { useState, type JSX } from 'react'
import type { Character, Life, ReincarnationType } from '../types'
import { PAST_LIFE_DEFINITIONS } from '../data/pastLifeDefinitions'
import {
  capitalized,
  EPIC_SPHERES,
  classSplitLabel,
  raceLabelOf,
  desiredPastLifeCountOf,
} from '../utils'
import { EditableText } from '../../../components'
import { Star, Trash2, Plus } from 'lucide-react'


export type ReincarnationChoice =
  | { mode: 'epic'; epicFeatId: string }
  | { mode: 'true'; reincarnationType: ReincarnationType }

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
        <label>Reincarnation type</label>
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
            True Reincarnate
          </button>
        </div>
      </div>
      {reincarnationMode === 'epic' && (
        <div className="reincarnate-panel-field">
          <label>Epic Past Life Feat</label>
          <div className="epic-feat-select">
            {EPIC_PAST_LIVES_BY_SPHERE.map(({ sphere, pastLives }) => (
              <div key={sphere.id} className="epic-feat-group">
                <div className="epic-feat-group-label">{sphere.label}</div>
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
          <label>This ends the current life and starts a new build</label>
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
              reincarnationMode === 'epic' ? { mode: 'epic', epicFeatId } : { mode: 'true', reincarnationType: trueReincarnationType },
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
  className,
  children,
}: {
  isViewed: boolean
  lifeNumberLabel?: number | string
  name: string
  buildSummary: string
  onView: () => void
  onRename: (newName: string) => void
  className?: string
  children?: React.ReactNode
}): JSX.Element {
  return (
    <div
      className={`life-entry hoverable ${className ?? ''} ${isViewed ? 'viewing' : ''}`}
      onClick={onView}
    >
      <span className="life-marker">{isViewed ? <Star size={14} /> : ''}</span>
      {lifeNumberLabel != null && <span className="life-number">{lifeNumberLabel}</span>}
      {isViewed ? (
        <EditableText
          text={name}
          placeholder="Name..."
          className="life-name"
          onCommit={onRename}
        />
      ) : (
        <span className="life-name">
          {name || <span className="editable-text-placeholder">Name...</span>}
        </span>
      )}
      <span className="life-summary">{buildSummary}</span>
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
  plannedBuilds,
  viewedPlannedBuildId,
  onViewPlannedBuild,
  onRenamePlannedBuild,
  onApplyPlannedBuild,
  onDeletePlannedBuild,
  onAddPlannedBuild,
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
  plannedBuilds: Life[]
  viewedPlannedBuildId: string | null
  onViewPlannedBuild: (buildId: string) => void
  onRenamePlannedBuild: (buildId: string, newName: string) => void
  onApplyPlannedBuild: (buildId: string) => void
  onDeletePlannedBuild: (buildId: string) => void
  onAddPlannedBuild: () => void
}): JSX.Element {
  const completedLives = character.lives.filter((l) => l.status === 'completed')
  const currentLives = character.lives.filter((l) => l.status === 'current')
  const raceAndClassLabel = (life: Life): string => `${raceLabelOf(life.race)} ${classSplitLabel(life)}`

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
    <div>
      <div className="life-history-title">Reincarnation History</div>
      <div className="section-label">Planned</div>
      <button className="add-planned-life-btn" onClick={onAddPlannedBuild}>
        <Plus size={14} /> Add Planned Build
      </button>
      {[...plannedBuilds].reverse().map((build) => {
        const desiredPastLifeCount = desiredPastLifeCountOf(build)
        return (
          <LifeRow
            key={build.id}
            isViewed={viewedPlannedBuildId === build.id}
            lifeNumberLabel={`Needs ${desiredPastLifeCount} PLs`}
            name={build.name}
            buildSummary={raceAndClassLabel(build)}
            onView={() => onViewPlannedBuild(build.id)}
            onRename={(name) => onRenamePlannedBuild(build.id, name)}
          >
            <button
              className="row-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onApplyPlannedBuild(build.id)
              }}
            >
              Apply
            </button>
            <button
              className="row-action-btn delete"
              onClick={(e) => {
                e.stopPropagation()
                onDeletePlannedBuild(build.id)
              }}
              aria-label="Delete planned build"
            >
              <Trash2 size={14} />
            </button>
          </LifeRow>
        )
      })}

      {currentLives.map((life) => (
        <div key={life.id}>
          <div className="section-label">Current</div>
          <LifeRow
            isViewed={viewedLifeId === life.id}
            lifeNumberLabel={`Life ${lifeNumbersByLifeId.get(life.id) ?? '?'}`}
            name={life.name}
            buildSummary={raceAndClassLabel(life)}
            className="current-life-entry"
            onView={() => onViewLife(life.id)}
            onRename={(name) => onRenameLife(life.id, name)}
          >
            {completedLives.length > 0 && (
              <button
                className="row-action-btn"
                onClick={(e) => e.stopPropagation()}
              >
                Undo
              </button>
            )}
            <button
              className="row-action-btn btn-primary-sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleReincarnationPanel()
              }}
            >
              Reincarnate
            </button>
          </LifeRow>
          {isReincarnationPanelOpen && (
            <ReincarnationPanel onCancel={onCancelReincarnation} onConfirm={onConfirmReincarnation} />
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
            lifeNumberLabel={lifeNumber != null ? `Life ${lifeNumber}` : undefined}
            name={life.name}
            buildSummary={`${reincarnationLabel(life)} — ${raceAndClassLabel(life)}`}
            onView={() => onViewLife(life.id)}
            onRename={(name) => onRenameLife(life.id, name)}
          >
            <button
              className="row-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onCopyLifeToPlannedBuilds(life.id)
              }}
            >
              Copy to Planned
            </button>
          </LifeRow>
        )
      })}
    </div>
  )
}
