import { useRef, useState, type JSX, type ReactNode } from 'react'
import type { Character, Life } from './types'
import {
  missingPastLifeWarnings,
  classSplitLabel,
  currentLifeNumberOf,
  desiredPastLifeCountOf,
  owningCharacterOf,
  plannedBuildLabelOf,
  raceAndClassLabelOf,
  raceLabelOf,
} from './utils'
import { pastLifeTotalsOf } from './pastLifeTotals'
import { useCharacters } from './hooks/useCharacters'
import { ConfirmModal, PageSection } from '../../components'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PastLifeStacks } from './components/PastLifeStacks'
import { LifeHistory } from './components/LifeHistory'
import { RenamableRosterRow, RosterRow } from './components/RosterRow'
import './CharacterView.css'

function pastLifeCountLabel(pastLifeCount: number): string {
  return pastLifeCount === 1 ? 'past life' : 'past lives'
}

function characterFactsOf(character: Character): ReactNode[] {
  const currentLife = character.lives[character.currentLifeIndex]
  const pastLifeTotalCount = pastLifeTotalsOf(character).totalCount
  return [
    character.server,
    currentLife && classSplitLabel(currentLife),
    currentLife && raceLabelOf(currentLife.race),
    <>
      life <span className="num">{currentLifeNumberOf(character)}</span>
    </>,
    <>
      <span className="num">{pastLifeTotalCount}</span> {pastLifeCountLabel(pastLifeTotalCount)}
    </>,
  ]
}

function plannedBuildFactsOf(plannedBuild: Life): ReactNode[] {
  const desiredPastLifeCount = desiredPastLifeCountOf(plannedBuild)
  return [
    classSplitLabel(plannedBuild),
    raceLabelOf(plannedBuild.race),
    desiredPastLifeCount > 0 && (
      <>
        needs <span className="num">{desiredPastLifeCount}</span>{' '}
        {pastLifeCountLabel(desiredPastLifeCount)}
      </>
    ),
  ]
}

function CharacterView(): JSX.Element {
  const {
    characters,
    setCharacters,
    selectedCharacter,
    lifeNumbersByLifeId,
    viewedBuild,
    buildSelection,
    plannedBuilds,
    setPlannedBuilds,
    viewedPlannedBuild,
    comparisonBuild,
    viewBuild,
    deletePlannedBuild,
    setUntrackedStackCount,
    setDesiredStackCount,
  } = useCharacters()

  const [isReincarnationPanelOpen, setIsReincarnationPanelOpen] = useState(false)
  const [renamingPlannedBuildId, setRenamingPlannedBuildId] = useState<string | null>(null)
  const renameButtonsByPlannedBuildId = useRef(new Map<string, HTMLButtonElement>())
  const [buildToApply, setBuildToApply] = useState<{
    buildId: string
    buildLabel: string
    missingPastLifeWarnings: string[]
  } | null>(null)

  const viewedLifeId = viewedPlannedBuild ? '' : buildSelection.buildId
  const viewedPlannedBuildId = viewedPlannedBuild ? buildSelection.buildId : null
  const activeCharacterId = viewedPlannedBuild
    ? undefined
    : owningCharacterOf(characters, viewedBuild.id)?.id
  const comparingCharacterId = comparisonBuild
    ? owningCharacterOf(characters, comparisonBuild.id)?.id
    : undefined

  function addPlannedBuild(): void {
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
  }

  function renamePlannedBuild(buildId: string, newName: string): void {
    setPlannedBuilds((prev) => prev.map((b) => (b.id === buildId ? { ...b, name: newName } : b)))
  }

  function askToApplyPlannedBuild(plannedBuild: Life): void {
    setBuildToApply({
      buildId: plannedBuild.id,
      buildLabel: raceAndClassLabelOf(plannedBuild),
      missingPastLifeWarnings: missingPastLifeWarnings(
        plannedBuild.desiredPastLives,
        selectedCharacter,
      ),
    })
  }

  return (
    <div className="page character-view">
      <div className="character-view-actions">
        <button type="button" className="btn-primary">
          <Plus size={16} /> New character
        </button>
        <button type="button" className="btn-ghost">
          Import JSON
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => window.alert('DDO Builder V2 (.xml) import coming soon.')}
        >
          Import DDO Builder
        </button>
      </div>

      <PageSection title="Characters" subtitle="click to set active">
        <div className="roster-list">
          {characters.map((character) => (
            <RosterRow
              key={character.id}
              name={character.name}
              facts={characterFactsOf(character)}
              isActive={character.id === activeCharacterId}
              isComparing={character.id === comparingCharacterId}
              onSelect={() =>
                viewBuild(character.id, character.lives[character.currentLifeIndex]?.id ?? '')
              }
              actions={
                <>
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    aria-label={`Export ${character.name}`}
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    className="btn-ghost-sm roster-delete-btn"
                    aria-label={`Delete ${character.name}`}
                  >
                    Delete
                  </button>
                </>
              }
            />
          ))}
        </div>
      </PageSection>

      <PageSection title="Planned lives" subtitle="not tied to a character until used">
        <div className="roster-list">
          {plannedBuilds.map((plannedBuild) => {
            const plannedBuildLabel = plannedBuildLabelOf(plannedBuild)
            return (
              <RenamableRosterRow
                key={plannedBuild.id}
                name={plannedBuildLabel}
                storedName={plannedBuild.name}
                nameInputLabel="Planned build name"
                facts={plannedBuildFactsOf(plannedBuild)}
                isActive={plannedBuild.id === viewedPlannedBuildId}
                isComparing={plannedBuild.id === comparisonBuild?.id}
                onSelect={() => viewBuild(null, plannedBuild.id)}
                isRenaming={plannedBuild.id === renamingPlannedBuildId}
                onRename={(newName) => renamePlannedBuild(plannedBuild.id, newName)}
                onStopRenaming={() => setRenamingPlannedBuildId(null)}
                focusRenameButton={() =>
                  renameButtonsByPlannedBuildId.current.get(plannedBuild.id)?.focus()
                }
                actions={
                  <>
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      aria-label={`Apply ${plannedBuildLabel}`}
                      onClick={() => askToApplyPlannedBuild(plannedBuild)}
                    >
                      Apply
                    </button>
                    <button
                      ref={(renameButton) => {
                        if (renameButton) {
                          renameButtonsByPlannedBuildId.current.set(plannedBuild.id, renameButton)
                        } else {
                          renameButtonsByPlannedBuildId.current.delete(plannedBuild.id)
                        }
                      }}
                      type="button"
                      className="btn-ghost-sm"
                      aria-label={`Rename ${plannedBuildLabel}`}
                      onClick={() => setRenamingPlannedBuildId(plannedBuild.id)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost-sm roster-delete-btn"
                      aria-label={`Delete ${plannedBuildLabel}`}
                      onClick={() => deletePlannedBuild(plannedBuild.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                }
              />
            )
          })}
          <button type="button" className="add-planned-build-btn" onClick={addPlannedBuild}>
            <Plus size={14} /> Add planned build
          </button>
        </div>
      </PageSection>

      <PageSection title="Past lives & tomes" subtitle="character-level — persists across builds">
        <PastLifeStacks
          character={selectedCharacter}
          viewedLifeId={viewedLifeId}
          viewedPlannedBuild={viewedPlannedBuild}
          onSetUntrackedStackCount={setUntrackedStackCount}
          onSetDesiredStackCount={viewedPlannedBuildId ? setDesiredStackCount : undefined}
        />
      </PageSection>

      <PageSection title="Reincarnation">
        <LifeHistory
          character={selectedCharacter}
          lifeNumbersByLifeId={lifeNumbersByLifeId}
          viewedLifeId={viewedLifeId}
          isReincarnationPanelOpen={isReincarnationPanelOpen}
          onToggleReincarnationPanel={() => setIsReincarnationPanelOpen(!isReincarnationPanelOpen)}
          onCancelReincarnation={() => setIsReincarnationPanelOpen(false)}
          onConfirmReincarnation={() => setIsReincarnationPanelOpen(false)}
          onViewLife={(lifeId) => viewBuild(selectedCharacter.id, lifeId)}
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
        />
      </PageSection>

      {buildToApply && (
        <ConfirmModal
          title="Apply planned build"
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
