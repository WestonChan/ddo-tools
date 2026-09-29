import { useState, type JSX } from 'react'
import type { Life } from './types'
import {
  missingPastLifeWarnings,
  classSplitLabel,
  raceLabelOf,
  currentLifeNumberOf,
} from './utils'
import { useCharacters } from './hooks/useCharacters'
import { ConfirmModal } from '../../components'
import { Star, Plus } from 'lucide-react'
import { PastLifeStacks } from './components/PastLifeStacks'
import { LifeHistory } from './components/LifeHistory'
import './CharacterView.css'

function CharacterView(): JSX.Element {
  const {
    characters,
    setCharacters,
    selectedCharacter,
    currentLife,
    lifeNumbersByLifeId,
    buildSelection,
    setBuildSelection,
    plannedBuilds,
    setPlannedBuilds,
    viewedPlannedBuild,
    selectCharacter,
    selectBuild,
    setUntrackedStackCount,
    setDesiredStackCount,
  } = useCharacters()

  const [isReincarnationPanelOpen, setIsReincarnationPanelOpen] = useState(false)
  const [buildToApply, setBuildToApply] = useState<{
    buildId: string
    buildLabel: string
    missingPastLifeWarnings: string[]
  } | null>(null)

  const viewedLifeId = viewedPlannedBuild ? '' : buildSelection.buildId
  const viewedPlannedBuildId = viewedPlannedBuild ? buildSelection.buildId : null

  return (
    <div className="character-view">
      <div className="section-label">Your Characters</div>
      <div className="character-list">
        {characters.map((character) => {
          const characterCurrentLife = character.lives[character.currentLifeIndex]
          const isSelected = character.id === buildSelection.characterId
          return (
            <div
              key={character.id}
              className={`character-row hoverable ${isSelected ? 'active' : ''}`}
              onClick={() => selectCharacter(character.id)}
            >
              <span className="character-marker">{isSelected ? <Star size={14} /> : ''}</span>
              <span className="character-name">{character.name}</span>
              <span className="character-server">{character.server}</span>
              <span className="character-class-summary">
                {characterCurrentLife ? classSplitLabel(characterCurrentLife) : '—'}
              </span>
              <span className="character-life-count">Life {currentLifeNumberOf(character)}</span>
              <span className="character-row-actions">
                <button className="row-action-btn">Export</button>
                <button className="row-action-btn delete">Delete</button>
              </span>
            </div>
          )
        })}
      </div>
      <div className="character-list-actions">
        <button className="btn-ghost">
          <Plus size={14} /> New Character
        </button>
        <button className="btn-ghost">Import JSON</button>
        <button
          className="btn-ghost import-ddo-btn"
          onClick={() => window.alert('DDO Builder V2 (.xml) import coming soon.')}
        >
          Import DDO Builder
        </button>
      </div>

      <hr className="past-lives-divider" />
      <div className="past-lives-header">
        <h2>
          {viewedPlannedBuild
            ? `Past Lives — ${viewedPlannedBuild.name || 'Planned Build'} × ${selectedCharacter.name}`
            : `Past Lives (${selectedCharacter.name})`}
        </h2>
      </div>
      <div className="past-lives-content">
        <PastLifeStacks
          character={selectedCharacter}
          viewedLifeId={viewedPlannedBuildId ? '' : viewedLifeId}
          viewedPlannedBuild={viewedPlannedBuild}
          onSetUntrackedStackCount={setUntrackedStackCount}
          onSetDesiredStackCount={viewedPlannedBuildId ? setDesiredStackCount : undefined}
        />
        <LifeHistory
          character={selectedCharacter}
          lifeNumbersByLifeId={lifeNumbersByLifeId}
          viewedLifeId={viewedLifeId}
          isReincarnationPanelOpen={isReincarnationPanelOpen}
          onToggleReincarnationPanel={() => setIsReincarnationPanelOpen(!isReincarnationPanelOpen)}
          onCancelReincarnation={() => setIsReincarnationPanelOpen(false)}
          onConfirmReincarnation={() => setIsReincarnationPanelOpen(false)}
          onViewLife={selectBuild}
          onCopyLifeToPlannedBuilds={(lifeId) => {
            const life = selectedCharacter.lives.find((l) => l.id === lifeId)
            if (!life) return
            const copiedPlannedBuild: Life = {
              ...life,
              id: crypto.randomUUID(),
              status: 'planned',
              reincarnation: undefined,
              notes: undefined,
            }
            setPlannedBuilds((prev) => [...prev, copiedPlannedBuild])
          }}
          onRenameLife={(lifeId, newName) => {
            setCharacters((prev) =>
              prev.map((c) => {
                if (c.id !== buildSelection.characterId) return c
                return {
                  ...c,
                  lives: c.lives.map((l) => (l.id === lifeId ? { ...l, name: newName } : l)),
                }
              }),
            )
          }}
          plannedBuilds={plannedBuilds}
          viewedPlannedBuildId={viewedPlannedBuildId}
          onViewPlannedBuild={selectBuild}
          onRenamePlannedBuild={(buildId: string, newName: string) => {
            setPlannedBuilds((prev) =>
              prev.map((b) => (b.id === buildId ? { ...b, name: newName } : b)),
            )
          }}
          onApplyPlannedBuild={(buildId: string) => {
            const plannedBuild = plannedBuilds.find((b) => b.id === buildId)
            if (!plannedBuild) return
            const buildLabel = `${raceLabelOf(plannedBuild.race)} ${classSplitLabel(plannedBuild)}`
            const warnings = missingPastLifeWarnings(plannedBuild.desiredPastLives, selectedCharacter)
            setBuildToApply({ buildId, buildLabel, missingPastLifeWarnings: warnings })
          }}
          onDeletePlannedBuild={(buildId: string) => {
            setPlannedBuilds((prev) => prev.filter((b) => b.id !== buildId))
            if (viewedPlannedBuildId === buildId) {
              setBuildSelection((prev) => ({
                ...prev,
                buildId: currentLife?.id ?? '',
              }))
            }
          }}
          onAddPlannedBuild={() => {
            const blankPlannedBuild: Life = {
              id: crypto.randomUUID(),
              name: '',
              race: 'human',
              classes: [{ classId: 'fighter', levels: 20 }],
              feats: [],
              enhancements: [],
              status: 'planned',
            }
            setPlannedBuilds((prev) => [...prev, blankPlannedBuild])
          }}
        />
      </div>

      {buildToApply && (
        <ConfirmModal
          title="Apply Planned Build"
          message={
            buildToApply.missingPastLifeWarnings.length > 0
              ? `This will overwrite your current life's build data with "${buildToApply.buildLabel}". This cannot be undone.\n\nWarning: ${selectedCharacter.name} is missing past lives this build expects:\n${buildToApply.missingPastLifeWarnings.join('\n')}`
              : `This will overwrite your current life's build data with "${buildToApply.buildLabel}". This cannot be undone.`
          }
          confirmLabel="Apply"
          confirmationPhrase="Apply"
          onCancel={() => setBuildToApply(null)}
          onConfirm={() => {
            const plannedBuild = plannedBuilds.find((b) => b.id === buildToApply.buildId)
            if (plannedBuild) {
              setCharacters((prev) =>
                prev.map((c) => {
                  if (c.id !== buildSelection.characterId) return c
                  const lives = c.lives.map((l, i) => {
                    if (i !== c.currentLifeIndex) return l
                    return {
                      ...l,
                      name: plannedBuild.name || l.name,
                      race: plannedBuild.race,
                      classes: [...plannedBuild.classes],
                    }
                  })
                  return { ...c, lives }
                }),
              )
            }
            setBuildToApply(null)
          }}
        />
      )}
    </div>
  )
}

export default CharacterView
