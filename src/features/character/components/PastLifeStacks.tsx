import { useCallback, useState, type JSX } from 'react'
import type { Character, Life, PastLifeCounts } from '../types'
import { PAST_LIFE_DEFINITIONS, type PastLifeDefinition } from '../data/pastLifeDefinitions'
import { stackCountsEarnedBy, EPIC_SPHERES, summedBonusText } from '../utils'
import { HoverTooltip } from '../../../components'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAddRemoveGestures } from '../../../hooks'

function OwnedStackBar({
  stackCount,
  maximumStackCount,
  historyStackCount,
  historyStackCountAtCurrentLife,
  stackCountAtCurrentLife,
}: {
  stackCount: number
  maximumStackCount: number
  historyStackCount: number
  historyStackCountAtCurrentLife: number
  stackCountAtCurrentLife: number
}): JSX.Element {
  return (
    <span className="stack-bar">
      {Array.from({ length: maximumStackCount }, (_, i) => {
        const isFilled = i < stackCount
        const isLocked = i < historyStackCount
        const isLockedAtCurrentLife = i < historyStackCountAtCurrentLife
        const isFilledAtCurrentLife = !isLockedAtCurrentLife && i < stackCountAtCurrentLife
        const pip = (
          <span
            key={i}
            className={`stack-pip ${isFilled ? 'filled' : ''} ${isLocked ? 'locked' : ''} ${isLockedAtCurrentLife ? 'current-has' : ''} ${isFilledAtCurrentLife ? 'current-has-filled' : ''}`}
          />
        )
        return isLocked ? (
          <HoverTooltip
            key={i}
            text="Earned from a completed reincarnation — cannot be removed manually"
          >
            {pip}
          </HoverTooltip>
        ) : (
          pip
        )
      })}
    </span>
  )
}

function DesiredStackBar({
  desiredStackCount,
  ownedStackCount,
  ownedHistoryStackCount,
  maximumStackCount,
}: {
  desiredStackCount: number
  ownedStackCount: number
  ownedHistoryStackCount: number
  maximumStackCount: number
}): JSX.Element {
  return (
    <span className="stack-bar">
      {Array.from({ length: maximumStackCount }, (_, i) => {
        const isDesired = i < desiredStackCount
        const isOwned = i < ownedStackCount
        const isFromHistory = i < ownedHistoryStackCount

        let pipClassName = 'stack-pip'
        let tooltipText = ''

        if (isDesired) {
          pipClassName += isOwned && isFromHistory ? ' locked' : ' filled'
          if (!isOwned) pipClassName += ' pip-missing'
        } else if (isOwned) {
          pipClassName += isFromHistory ? ' pip-has-locked' : ' pip-has-filled'
        }

        if (isDesired && isOwned) {
          tooltipText = 'Character has this — build needs it'
        } else if (!isDesired && isOwned) {
          tooltipText = "Character has this — build doesn't need it"
        } else if (isDesired && !isOwned) {
          tooltipText = "Build needs this — character doesn't have it yet"
        }

        const pip = <span key={i} className={pipClassName} />

        return tooltipText ? (
          <HoverTooltip key={i} text={tooltipText}>
            {pip}
          </HoverTooltip>
        ) : (
          pip
        )
      })}
    </span>
  )
}

function PastLifeStackRow({
  pastLife,
  stackCount,
  historyStackCount,
  historyStackCountAtCurrentLife,
  stackCountAtCurrentLife,
  onSetStackCount,
  ownedStacks,
}: {
  pastLife: PastLifeDefinition
  stackCount: number
  historyStackCount: number
  historyStackCountAtCurrentLife: number
  stackCountAtCurrentLife: number
  onSetStackCount: (stackCount: number) => void
  ownedStacks?: { stackCount: number; historyStackCount: number }
}): JSX.Element {
  const hasStacks = stackCount > 0

  const addStack = useCallback(() => {
    if (stackCount < pastLife.maximumStackCount) onSetStackCount(stackCount + 1)
  }, [stackCount, pastLife.maximumStackCount, onSetStackCount])

  const minimumStackCount = ownedStacks ? 0 : historyStackCount
  const removeStack = useCallback(() => {
    if (stackCount > minimumStackCount) onSetStackCount(stackCount - 1)
  }, [stackCount, minimumStackCount, onSetStackCount])

  const { ref, onClick, onContextMenu } = useAddRemoveGestures(addStack, removeStack)

  const earnedBonusText = summedBonusText(pastLife.stackBonuses.slice(0, stackCount))
  const unearnedBonusText = summedBonusText(pastLife.stackBonuses.slice(stackCount))
  const unearnedBonusTextToShow = unearnedBonusText !== earnedBonusText ? unearnedBonusText : ''

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`stack-row hoverable ${hasStacks || (ownedStacks && ownedStacks.stackCount > 0) ? '' : 'empty'}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <span className="stack-name">{pastLife.name}</span>
      {ownedStacks ? (
        <DesiredStackBar
          desiredStackCount={stackCount}
          ownedStackCount={ownedStacks.stackCount}
          ownedHistoryStackCount={ownedStacks.historyStackCount}
          maximumStackCount={pastLife.maximumStackCount}
        />
      ) : (
        <OwnedStackBar
          stackCount={stackCount}
          maximumStackCount={pastLife.maximumStackCount}
          historyStackCount={historyStackCount}
          historyStackCountAtCurrentLife={historyStackCountAtCurrentLife}
          stackCountAtCurrentLife={stackCountAtCurrentLife}
        />
      )}
      <span className="stack-count">
        {stackCount}/{pastLife.maximumStackCount}
      </span>
      <span className="stack-bonus">
        {earnedBonusText && <span className="bonus-earned">{earnedBonusText}</span>}
        {unearnedBonusTextToShow && (
          <span className="bonus-remaining">{unearnedBonusTextToShow}</span>
        )}
      </span>
    </div>
  )
}

function PastLifeStackSection({
  label,
  pastLives,
  untrackedStackCounts,
  historyStackCounts,
  historyStackCountsAtCurrentLife,
  onSetStackCount,
  desiredStackCounts,
  ownedUntrackedStackCounts,
}: {
  label: string
  pastLives: PastLifeDefinition[]
  untrackedStackCounts: Record<string, number>
  historyStackCounts: Record<string, number>
  historyStackCountsAtCurrentLife: Record<string, number>
  onSetStackCount: (pastLifeId: string, stackCount: number) => void
  desiredStackCounts?: Record<string, number>
  ownedUntrackedStackCounts?: Record<string, number>
}): JSX.Element {
  const isViewingPlannedBuild = !!desiredStackCounts
  return (
    <>
      <div className="section-label">{label}</div>
      {pastLives.map((pastLife) => {
        if (isViewingPlannedBuild) {
          const stackCount = Math.min(
            desiredStackCounts[pastLife.id] ?? 0,
            pastLife.maximumStackCount,
          )
          const historyStackCount = Math.min(
            historyStackCounts[pastLife.id] ?? 0,
            pastLife.maximumStackCount,
          )
          const untrackedStackCount = (ownedUntrackedStackCounts ?? {})[pastLife.id] ?? 0
          const ownedStackCount = Math.min(
            historyStackCount + untrackedStackCount,
            pastLife.maximumStackCount,
          )
          return (
            <PastLifeStackRow
              key={pastLife.id}
              pastLife={pastLife}
              stackCount={stackCount}
              historyStackCount={0}
              historyStackCountAtCurrentLife={0}
              stackCountAtCurrentLife={0}
              onSetStackCount={(value) => onSetStackCount(pastLife.id, value)}
              ownedStacks={{ stackCount: ownedStackCount, historyStackCount }}
            />
          )
        }
        const historyStackCount = Math.min(
          historyStackCounts[pastLife.id] ?? 0,
          pastLife.maximumStackCount,
        )
        const historyStackCountAtCurrentLife = Math.min(
          historyStackCountsAtCurrentLife[pastLife.id] ?? 0,
          pastLife.maximumStackCount,
        )
        const untrackedStackCount = untrackedStackCounts[pastLife.id] ?? 0
        const stackCount = Math.min(
          historyStackCount + untrackedStackCount,
          pastLife.maximumStackCount,
        )
        const stackCountAtCurrentLife = Math.min(
          historyStackCountAtCurrentLife + untrackedStackCount,
          pastLife.maximumStackCount,
        )
        return (
          <PastLifeStackRow
            key={pastLife.id}
            pastLife={pastLife}
            stackCount={stackCount}
            historyStackCount={historyStackCount}
            historyStackCountAtCurrentLife={historyStackCountAtCurrentLife}
            stackCountAtCurrentLife={stackCountAtCurrentLife}
            onSetStackCount={(value) =>
              onSetStackCount(pastLife.id, Math.max(0, value - historyStackCount))
            }
          />
        )
      })}
    </>
  )
}

interface ActivePastLifeBonus {
  pastLifeName: string
  bonusText: string
}

function ActiveBonusSummary({ bonuses }: { bonuses: ActivePastLifeBonus[] }): JSX.Element {
  const isWideViewport = typeof window !== 'undefined' && window.innerWidth > 768
  const [isExpanded, setIsExpanded] = useState(isWideViewport)

  return (
    <div className="bonus-summary">
      <div className="bonus-summary-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="bonus-toggle">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="section-label">Active Bonuses ({bonuses.length})</span>
      </div>
      <div className={`bonus-rows ${isExpanded ? 'expanded' : ''}`}>
        <div className="bonus-rows-inner">
          {bonuses.map((b) => (
            <div key={b.pastLifeName} className="bonus-row">
              <span className="bonus-value">
                {b.pastLifeName}: {b.bonusText}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PAST_LIFE_SECTIONS: {
  category: keyof PastLifeCounts
  label: string
  includesPastLife?: (d: PastLifeDefinition) => boolean
}[] = [
  { category: 'heroic', label: 'Class' },
  { category: 'racial', label: 'Racial' },
  { category: 'iconic', label: 'Iconic' },
  ...EPIC_SPHERES.map(({ id: sphere, label }) => ({
    category: 'epic' as const,
    label: `Epic — ${label}`,
    includesPastLife: (d: PastLifeDefinition) => d.sphere === sphere,
  })),
]

export function PastLifeStacks({
  character,
  viewedLifeId,
  viewedPlannedBuild,
  onSetUntrackedStackCount,
  onSetDesiredStackCount,
}: {
  character: Character
  viewedLifeId: string
  viewedPlannedBuild?: Life
  onSetUntrackedStackCount: (
    category: keyof PastLifeCounts,
    pastLifeId: string,
    stackCount: number,
  ) => void
  onSetDesiredStackCount?: (
    category: keyof PastLifeCounts,
    pastLifeId: string,
    stackCount: number,
  ) => void
}): JSX.Element {
  const isViewingPlannedBuild = !!viewedPlannedBuild

  const viewedLifeIndex = character.lives.findIndex((l) => l.id === viewedLifeId)
  const livesBeforeViewedLife =
    viewedLifeIndex >= 0 ? character.lives.slice(0, viewedLifeIndex) : character.lives
  const historyStackCounts = stackCountsEarnedBy(livesBeforeViewedLife)
  const livesBeforeCurrentLife = character.lives.slice(0, character.currentLifeIndex)
  const historyStackCountsAtCurrentLife = stackCountsEarnedBy(livesBeforeCurrentLife)
  const untrackedLives = character.untrackedLives

  const desiredPastLives: PastLifeCounts | undefined = viewedPlannedBuild?.desiredPastLives

  const completedLifeCount = livesBeforeViewedLife.filter((l) => l.status === 'completed').length

  const setStackCount =
    isViewingPlannedBuild && onSetDesiredStackCount
      ? onSetDesiredStackCount
      : onSetUntrackedStackCount

  const activeBonuses: ActivePastLifeBonus[] = []
  if (!isViewingPlannedBuild) {
    for (const pastLife of PAST_LIFE_DEFINITIONS) {
      const untrackedStackCounts =
        untrackedLives[pastLife.category as keyof typeof untrackedLives] ?? {}
      const historyStackCount = Math.min(
        historyStackCounts[pastLife.id] ?? 0,
        pastLife.maximumStackCount,
      )
      const untrackedStackCount = untrackedStackCounts[pastLife.id] ?? 0
      const stackCount = Math.min(
        historyStackCount + untrackedStackCount,
        pastLife.maximumStackCount,
      )
      if (stackCount > 0) {
        activeBonuses.push({
          pastLifeName: pastLife.name,
          bonusText: summedBonusText(pastLife.stackBonuses.slice(0, stackCount)),
        })
      }
    }
  }

  return (
    <div className="past-life-stacks">
      {PAST_LIFE_SECTIONS.map(({ category, label, includesPastLife }) => {
        const sectionPastLives = PAST_LIFE_DEFINITIONS.filter(
          (d) => d.category === category && (!includesPastLife || includesPastLife(d)),
        )
        return (
          <PastLifeStackSection
            key={label}
            label={label}
            pastLives={sectionPastLives}
            untrackedStackCounts={untrackedLives[category]}
            historyStackCounts={historyStackCounts}
            historyStackCountsAtCurrentLife={historyStackCountsAtCurrentLife}
            onSetStackCount={(id, v) => setStackCount(category, id, v)}
            desiredStackCounts={
              isViewingPlannedBuild ? (desiredPastLives?.[category] ?? {}) : undefined
            }
            ownedUntrackedStackCounts={isViewingPlannedBuild ? untrackedLives[category] : undefined}
          />
        )
      })}
      <div className="stacks-hint">
        {isViewingPlannedBuild
          ? 'Tap to add desired · long-press to remove'
          : 'Tap to add · long-press to remove'}
      </div>
      {!isViewingPlannedBuild && (
        <div className="total-past-lives">Total Past Lives: {completedLifeCount}</div>
      )}
      {activeBonuses.length > 0 && <ActiveBonusSummary bonuses={activeBonuses} />}
    </div>
  )
}
