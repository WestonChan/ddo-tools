import { useState, type JSX } from 'react'
import './BuildSidePanel.css'

type SidePanelTab = 'stats' | 'feats'

const PLACEHOLDER_ABILITY_SCORES = [
  { ability: 'STR', score: 18 },
  { label: 'DEX', value: 12 },
  { label: 'CON', value: 16 },
  { label: 'INT', value: 10 },
  { label: 'WIS', value: 14 },
  { label: 'CHA', value: 8 },
]

const PLACEHOLDER_CORE_STATS = [
  { label: 'HP', value: '420' },
  { label: 'SP', value: '300' },
  { label: 'AC', value: '85' },
  { label: 'PRR', value: '42' },
  { label: 'MRR', value: '30' },
  { label: 'Dodge', value: '18%' },
  { label: 'Fortification', value: '108%' },
]

const PLACEHOLDER_SAVES = [
  { label: 'Fortitude', value: '32' },
  { label: 'Reflex', value: '28' },
  { label: 'Will', value: '24' },
]

const PLACEHOLDER_OFFENSE_STATS = [
  { label: 'BAB', value: '20' },
  { label: 'Melee Power', value: '78' },
  { label: 'Ranged Power', value: '42' },
  { label: 'Spell Power', value: '108' },
]

const PLACEHOLDER_ACTIVE_FEATS = ['Cleave', 'Great Cleave', 'Smite Evil', 'Lay on Hands', 'Turn Undead']

const PLACEHOLDER_PASSIVE_FEATS = [
  'Power Attack',
  'Two Handed Fighting',
  'Improved Critical: Slashing',
  'Toughness',
  'Evasion',
]

function StatsTab(): JSX.Element {
  return (
    <>
      <div className="section-label">Ability Scores</div>
      <div className="ability-scores-grid">
        {PLACEHOLDER_ABILITY_SCORES.map((score) => (
          <div key={score.ability} className="ability-score-row hoverable">
            <span className="label">{score.ability}</span>
            <span className="value">{score.score}</span>
          </div>
        ))}
      </div>
      <hr className="stats-separator" />
      {PLACEHOLDER_CORE_STATS.map((stat) => (
        <div key={stat.label} className="stat-row hoverable">
          <span className="label">{stat.label}</span>
          <span className="value">{stat.value}</span>
        </div>
      ))}
      <hr className="stats-separator" />
      {PLACEHOLDER_SAVES.map((save) => (
        <div key={save.label} className="stat-row hoverable">
          <span className="label">{save.label}</span>
          <span className="value">{save.value}</span>
        </div>
      ))}
      <hr className="stats-separator" />
      {PLACEHOLDER_OFFENSE_STATS.map((stat) => (
        <div key={stat.label} className="stat-row hoverable">
          <span className="label">{stat.label}</span>
          <span className="value">{stat.value}</span>
        </div>
      ))}
    </>
  )
}

function FeatsTab(): JSX.Element {
  return (
    <>
      <div className="section-label">Active</div>
      {PLACEHOLDER_ACTIVE_FEATS.map((feat) => (
        <div key={feat} className="feat-entry hoverable">
          {feat}
        </div>
      ))}
      <div className="section-label">Passive</div>
      {PLACEHOLDER_PASSIVE_FEATS.map((feat) => (
        <div key={feat} className="feat-entry hoverable">
          {feat}
        </div>
      ))}
    </>
  )
}

interface BuildSidePanelProps {
  inert?: boolean
}

function BuildSidePanel({ inert }: BuildSidePanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('stats')

  return (
    <aside className="side-panel" inert={inert}>
      <div className="side-panel-tabs">
        <button
          className={`side-panel-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          className={`side-panel-tab ${activeTab === 'feats' ? 'active' : ''}`}
          onClick={() => setActiveTab('feats')}
        >
          Feats
        </button>
      </div>
      <div className="side-panel-content">
        {activeTab === 'stats' ? <StatsTab /> : <FeatsTab />}
      </div>
    </aside>
  )
}

export default BuildSidePanel
