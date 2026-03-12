import { useCallback, useState } from 'react'
import type { Character, EpicSphere } from '../types'
import { PAST_LIFE_DEFS, type PastLifeDef } from '../data/pastLifeDefs'
import { computeHistoryStacks } from '../utils'
import { TooltipWrapper } from '../../shared/Tooltip'
import { useAddRemoveInput } from '../../shared/useAddRemoveInput'

/** Sum per-stack bonuses: ['+10 HP', '+10 HP'] → '+20 HP'. Groups by suffix and adds numbers. */
function formatBonusList(parts: string[]): string {
  if (parts.length === 0) return ''
  const sums = new Map<string, number>()
  const unsummable: string[] = []
  for (const part of parts) {
    for (const seg of part.split(', ')) {
      const m = seg.match(/^([+-]\d+)(.+)$/)
      if (m) sums.set(m[2], (sums.get(m[2]) ?? 0) + parseInt(m[1]))
      else unsummable.push(seg)
    }
  }
  const summed = [...sums.entries()].map(
    ([suffix, total]) => `${total >= 0 ? '+' : ''}${total}${suffix}`,
  )
  return [...summed, ...unsummable].join(', ')
}

function StackBar({
  stacks,
  max,
  fromHistory,
}: {
  stacks: number
  max: number
  fromHistory: number
}) {
  return (
    <span className="stack-bar">
      {Array.from({ length: max }, (_, i) => {
        const pip = (
          <span
            key={i}
            className={`stack-pip ${i < stacks ? 'filled' : ''} ${i < fromHistory ? 'locked' : ''}`}
          />
        )
        return i < fromHistory ? (
          <TooltipWrapper
            key={i}
            text="Earned from a completed reincarnation — cannot be removed manually"
          >
            {pip}
          </TooltipWrapper>
        ) : (
          pip
        )
      })}
    </span>
  )
}

function StackRow({
  def,
  stacks,
  fromHistory,
  onSetStacks,
}: {
  def: PastLifeDef
  stacks: number
  fromHistory: number
  onSetStacks: (value: number) => void
}) {
  const hasStacks = stacks > 0

  const increment = useCallback(() => {
    if (stacks < def.max) onSetStacks(stacks + 1)
  }, [stacks, def.max, onSetStacks])

  const decrement = useCallback(() => {
    if (stacks > fromHistory) onSetStacks(stacks - 1)
  }, [stacks, fromHistory, onSetStacks])

  const { ref, onClick, onContextMenu } = useAddRemoveInput(increment, decrement)

  // Each bonus entry is what that individual stack contributes.
  // Earned = first N entries joined, unearned = remaining entries joined.
  // Dedup identical entries (e.g. heroic "+10 HP" x3 shows once, not repeated).
  // Hide unearned when it matches earned (uniform bonuses — pips already show progress).
  const earnedText = formatBonusList(def.bonuses.slice(0, stacks))
  const rawUnearned = formatBonusList(def.bonuses.slice(stacks))
  const unearnedText = rawUnearned !== earnedText ? rawUnearned : ''

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`stack-row row-interactive ${hasStacks ? '' : 'empty'}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <span className="stack-name">{def.name}</span>
      <StackBar stacks={stacks} max={def.max} fromHistory={fromHistory} />
      <span className="stack-count">
        {stacks}/{def.max}
      </span>
      <span className="stack-bonus">
        {earnedText && <span className="bonus-earned">{earnedText}</span>}
        {unearnedText && <span className="bonus-remaining">{unearnedText}</span>}
      </span>
    </div>
  )
}

function StackSection({
  label,
  defs,
  overrides,
  historyStacks,
  onSetOverride,
}: {
  label: string
  defs: PastLifeDef[]
  overrides: Record<string, number>
  historyStacks: Record<string, number>
  onSetOverride: (id: string, value: number) => void
}) {
  return (
    <>
      <div className="section-label">{label}</div>
      {defs.map((def) => {
        const fromHistory = Math.min(historyStacks[def.id] ?? 0, def.max)
        const fromOverride = overrides[def.id] ?? 0
        const stacks = Math.min(Math.max(fromHistory, fromOverride), def.max)
        return (
          <StackRow
            key={def.id}
            def={def}
            stacks={stacks}
            fromHistory={fromHistory}
            onSetStacks={(value) => onSetOverride(def.id, value)}
          />
        )
      })}
    </>
  )
}

interface ActiveBonus {
  label: string
  value: string
}

function BonusSummary({ bonuses }: { bonuses: ActiveBonus[] }) {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768
  const [expanded, setExpanded] = useState(isDesktop)

  return (
    <div className="bonus-summary">
      <div className="bonus-summary-header" onClick={() => setExpanded(!expanded)}>
        <span className="section-label">Active Bonuses ({bonuses.length})</span>
        <span className="bonus-toggle">{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded &&
        bonuses.map((b) => (
          <div key={b.label} className="bonus-row">
            <span className="bonus-value">
              {b.label}: {b.value}
            </span>
          </div>
        ))}
    </div>
  )
}

export function PastLifeStacks({
  character,
  viewingLifeId,
  onSetOverride,
}: {
  character: Character
  viewingLifeId: string
  onSetOverride: (category: string, id: string, value: number) => void
}) {
  // Only count lives completed before the one being viewed
  const viewingIndex = character.lives.findIndex((l) => l.id === viewingLifeId)
  const livesBeforeViewed =
    viewingIndex >= 0 ? character.lives.slice(0, viewingIndex) : character.lives
  const historyStacks = computeHistoryStacks(livesBeforeViewed)
  const o = character.pastLifeOverrides

  const heroicDefs = PAST_LIFE_DEFS.filter((d) => d.category === 'heroic')
  const racialDefs = PAST_LIFE_DEFS.filter((d) => d.category === 'racial')
  const iconicDefs = PAST_LIFE_DEFS.filter((d) => d.category === 'iconic')
  const epicSpheres: { sphere: EpicSphere; label: string }[] = [
    { sphere: 'arcane', label: 'Epic — Arcane' },
    { sphere: 'divine', label: 'Epic — Divine' },
    { sphere: 'martial', label: 'Epic — Martial' },
    { sphere: 'primal', label: 'Epic — Primal' },
  ]

  const totalCompleted = livesBeforeViewed.filter((l) => l.status === 'completed').length

  // Collect active bonuses — show current stack description for each feat with stacks
  const activeBonuses: ActiveBonus[] = []
  for (const def of PAST_LIFE_DEFS) {
    const catOverrides = o[def.category as keyof typeof o] ?? {}
    const fromHistory = Math.min(historyStacks[def.id] ?? 0, def.max)
    const fromOverride = catOverrides[def.id] ?? 0
    const stacks = Math.min(Math.max(fromHistory, fromOverride), def.max)
    if (stacks > 0) {
      activeBonuses.push({ label: def.name, value: formatBonusList(def.bonuses.slice(0, stacks)) })
    }
  }

  return (
    <div className="past-life-stacks">
      <StackSection
        label="Class"
        defs={heroicDefs}
        overrides={o.heroic}
        historyStacks={historyStacks}
        onSetOverride={(id, v) => onSetOverride('heroic', id, v)}
      />
      <StackSection
        label="Racial"
        defs={racialDefs}
        overrides={o.racial}
        historyStacks={historyStacks}
        onSetOverride={(id, v) => onSetOverride('racial', id, v)}
      />
      <StackSection
        label="Iconic"
        defs={iconicDefs}
        overrides={o.iconic}
        historyStacks={historyStacks}
        onSetOverride={(id, v) => onSetOverride('iconic', id, v)}
      />
      {epicSpheres.map(({ sphere, label }) => (
        <StackSection
          key={sphere}
          label={label}
          defs={PAST_LIFE_DEFS.filter((d) => d.category === 'epic' && d.sphere === sphere)}
          overrides={o.epic}
          historyStacks={historyStacks}
          onSetOverride={(id, v) => onSetOverride('epic', id, v)}
        />
      ))}
      <div className="stacks-hint">Tap to add · long-press to remove</div>
      <div className="total-past-lives">Total Past Lives: {totalCompleted}</div>
      {activeBonuses.length > 0 && <BonusSummary bonuses={activeBonuses} />}
    </div>
  )
}
