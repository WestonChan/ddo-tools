import { pinnedGroupsWithStatPinned, type PinnedStatGroup } from '../pinnedStatGroups'

export interface PlaceholderBonus {
  bonusType: string
  source: string
  value: string
  isOverridden?: boolean
  isUnfilled?: boolean
}

export interface PlaceholderStat {
  name: string
  value: string
  bonuses?: readonly PlaceholderBonus[]
}

export interface PlaceholderStatGroup {
  name: string
  stats: readonly PlaceholderStat[]
}

export interface CompetingBonus {
  source: string
  value: string
}

export interface PlaceholderBuffEffect {
  bonusType: string
  stat: string
  value: string
  overriddenBy?: CompetingBonus
  overrides?: CompetingBonus
}

export interface PlaceholderBuff {
  name: string
  duration: string
  effects: readonly PlaceholderBuffEffect[]
}

export interface PlaceholderBuffGroup {
  name: string
  buffs: readonly PlaceholderBuff[]
}

const SPELL_POWER_FIRE_BONUSES: readonly PlaceholderBonus[] = [
  { bonusType: 'Equipment', source: 'Epic Staff of Arcane Power', value: '+150' },
  { bonusType: 'Enhancement', source: 'Crown of Fire', value: '+142' },
  { bonusType: 'Enhancement', source: 'Draconic Insight', value: '+120', isOverridden: true },
  { bonusType: 'Enhancement', source: 'Yugoloth potion', value: '+10', isOverridden: true },
  { bonusType: 'Ship', source: 'Ship buffs', value: '+15' },
  { bonusType: 'Insightful', source: 'Bracers of Wind', value: '+72' },
  { bonusType: 'Quality', source: 'Litany of the Dead', value: '+18' },
  { bonusType: 'Psionic — empty', source: 'no source', value: '—', isUnfilled: true },
]

const EVOCATION_DC_BONUSES: readonly PlaceholderBonus[] = [
  { bonusType: 'Ability (CHA)', source: '42 CHA', value: '+16' },
  { bonusType: 'Enhancement', source: 'Fire Savant core 4', value: '+2' },
  { bonusType: 'Feat', source: 'Spell Focus: Evocation', value: '+1' },
  { bonusType: 'Equipment', source: 'Crown of Fire', value: '+7' },
  { bonusType: 'Insightful', source: 'Ring of Spell Storing', value: '+3' },
  { bonusType: 'Quality', source: 'Ring of Spell Storing', value: '+1' },
  { bonusType: 'Quality', source: 'Epic Staff of Arcane Power', value: '+1', isOverridden: true },
]

export const PLACEHOLDER_STAT_GROUPS: readonly PlaceholderStatGroup[] = [
  {
    name: 'Offense',
    stats: [
      { name: 'Evocation DC', value: '58', bonuses: EVOCATION_DC_BONUSES },
      { name: 'Conjuration DC', value: '54' },
      { name: 'Necromancy DC', value: '52' },
      { name: 'Spell power (fire)', value: '412', bonuses: SPELL_POWER_FIRE_BONUSES },
      { name: 'Spell power (elec)', value: '380' },
      { name: 'Spell crit', value: '38%' },
      { name: 'Spell pen', value: '46' },
    ],
  },
  {
    name: 'Defense',
    stats: [
      { name: 'HP', value: '1,204' },
      { name: 'AC', value: '84' },
      { name: 'PRR', value: '96' },
      { name: 'MRR', value: '72' },
      { name: 'Fort save', value: '48' },
      { name: 'Reflex save', value: '52' },
      { name: 'Will save', value: '44' },
      { name: 'Dodge', value: '12%' },
    ],
  },
  {
    name: 'Resources',
    stats: [
      { name: 'Spell points', value: '2,610' },
      { name: 'Ki', value: '—' },
      { name: 'Turn undead', value: '—' },
    ],
  },
]

const ALL_STATS_GROUP_NAME_BY_STAT_NAME = new Map(
  PLACEHOLDER_STAT_GROUPS.flatMap((group) => group.stats.map((stat) => [stat.name, group.name])),
)

export function allStatsGroupNameOf(statName: string): string {
  return ALL_STATS_GROUP_NAME_BY_STAT_NAME.get(statName) ?? 'Pinned'
}

const DEFAULT_PINNED_STAT_NAMES: readonly string[] = [
  'Evocation DC',
  'Spell power (fire)',
  'Spell crit',
  'Spell points',
]

export const DEFAULT_PINNED_STAT_GROUPS: readonly PinnedStatGroup[] =
  DEFAULT_PINNED_STAT_NAMES.reduce<PinnedStatGroup[]>(
    (groups, statName) =>
      pinnedGroupsWithStatPinned(groups, statName, allStatsGroupNameOf(statName)),
    [],
  )

export const PLACEHOLDER_BUFF_GROUPS: readonly PlaceholderBuffGroup[] = [
  {
    name: 'Stances',
    buffs: [
      {
        name: 'Fire Savant stance',
        duration: 'Toggle · no duration',
        effects: [
          { bonusType: 'Stance', stat: 'Fire spell power', value: '+10%' },
          { bonusType: 'Stance', stat: 'Cold spell power', value: '-10%' },
          { bonusType: 'Stance', stat: 'Fire spell crit', value: '+2%' },
        ],
      },
      {
        name: 'Draconic Incarnation mantle',
        duration: 'Toggle · destiny',
        effects: [
          { bonusType: 'Mantle', stat: 'Fire spell crit', value: '+10%' },
          { bonusType: 'Mantle', stat: 'Fire spell power', value: '+25' },
        ],
      },
    ],
  },
  {
    name: 'Self buffs',
    buffs: [
      {
        name: 'Displacement',
        duration: '1 min / caster level',
        effects: [
          {
            bonusType: 'Enhancement',
            stat: 'Dodge',
            value: '50%',
            overrides: { source: 'Epic Bracers of Wind', value: '+12%' },
          },
        ],
      },
      {
        name: 'Haste',
        duration: '1 min / caster level',
        effects: [
          { bonusType: 'Enhancement', stat: 'Movement speed', value: '+30%' },
          { bonusType: 'Enhancement', stat: 'Attack speed', value: '+15%' },
          { bonusType: 'Enhancement', stat: 'Reflex save', value: '+1' },
        ],
      },
      {
        name: 'Ship buffs',
        duration: '3 hours',
        effects: [
          { bonusType: 'Ship', stat: 'Spell power', value: '+15' },
          { bonusType: 'Ship', stat: 'All abilities', value: '+2' },
          { bonusType: 'Ship', stat: 'Saves', value: '+2' },
          { bonusType: 'Ship', stat: 'Spell points', value: '+120' },
        ],
      },
    ],
  },
  {
    name: 'Party & external',
    buffs: [
      {
        name: 'Bard Inspire Excellence',
        duration: '5 min',
        effects: [{ bonusType: 'Inspiration', stat: 'All abilities', value: '+2' }],
      },
      {
        name: 'Yugoloth potion',
        duration: '1 hour',
        effects: [
          { bonusType: 'Yugoloth', stat: 'CHA', value: '+2' },
          {
            bonusType: 'Enhancement',
            stat: 'Spell power',
            value: '+10',
            overriddenBy: { source: 'Crown of Fire', value: '+142' },
          },
        ],
      },
      {
        name: 'Reaper debuff',
        duration: 'While in reaper',
        effects: [
          { bonusType: 'Reaper', stat: 'Saves', value: '-4' },
          { bonusType: 'Reaper', stat: 'Healing amp', value: '-40%' },
        ],
      },
    ],
  },
]

export const DEFAULT_ACTIVE_BUFF_NAMES: readonly string[] = ['Fire Savant stance', 'Ship buffs']
