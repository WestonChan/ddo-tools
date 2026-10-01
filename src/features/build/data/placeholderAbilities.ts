import { hotbarSlotsFilledFromStart, type Hotbar } from '../hotbars'

export type AbilityDamageType = 'fire' | 'cold' | 'electric' | 'force' | 'none'

export interface PlaceholderAbility {
  id: string
  name: string
  shortCode: string
  damageType: AbilityDamageType
  kind: string
  cooldown: string
  save: string
  damage: string
  cost: string
  isEquipped?: boolean
}

export interface AbilityPoolGroup {
  name: string
  abilityIds: readonly string[]
}

export const PLACEHOLDER_ABILITIES: readonly PlaceholderAbility[] = [
  {
    id: 'dbf',
    name: 'Delayed Blast Fireball',
    shortCode: 'DBF',
    damageType: 'fire',
    kind: 'Spell',
    cooldown: '2.5s',
    save: 'DC 58 Reflex',
    damage: '18d6+412 fire',
    cost: '40 SP',
  },
  {
    id: 'ms',
    name: 'Meteor Swarm',
    shortCode: 'MS',
    damageType: 'fire',
    kind: 'Spell',
    cooldown: '18s',
    save: 'DC 58 Reflex',
    damage: '4×(2d6+30 + 6d6 fire)',
    cost: '60 SP',
  },
  {
    id: 'cl',
    name: 'Chain Lightning',
    shortCode: 'CL',
    damageType: 'electric',
    kind: 'Spell',
    cooldown: '3s',
    save: 'DC 56 Reflex',
    damage: '15d6+380 electric',
    cost: '40 SP',
  },
  {
    id: 'pr',
    name: 'Polar Ray',
    shortCode: 'PR',
    damageType: 'cold',
    kind: 'Spell',
    cooldown: '2s',
    save: 'no save',
    damage: '22d6+366 cold',
    cost: '45 SP',
  },
  {
    id: 'dis',
    name: 'Disintegrate',
    shortCode: 'DIS',
    damageType: 'force',
    kind: 'Spell',
    cooldown: '3s',
    save: 'DC 54 Fortitude',
    damage: '44d6 untyped',
    cost: '35 SP',
  },
  {
    id: 'wl',
    name: 'Wail of the Banshee',
    shortCode: 'WL',
    damageType: 'none',
    kind: 'Spell',
    cooldown: '30s',
    save: 'DC 60 Fortitude',
    damage: 'death — no damage',
    cost: '50 SP',
  },
  {
    id: 'fb',
    name: 'Fireball SLA',
    shortCode: 'FB',
    damageType: 'fire',
    kind: 'SLA',
    cooldown: '6s',
    save: 'DC 55 Reflex',
    damage: '10d6+412 fire',
    cost: '8 SP',
  },
  {
    id: 'sr',
    name: 'Scorching Ray SLA',
    shortCode: 'SR',
    damageType: 'fire',
    kind: 'SLA',
    cooldown: '3s',
    save: 'no save',
    damage: '3×(4d6+206) fire',
    cost: '4 SP',
  },
  {
    id: 'eb',
    name: 'Energy Burst: Fire',
    shortCode: 'EB',
    damageType: 'fire',
    kind: 'Enhancement',
    cooldown: '20s',
    save: 'DC 62 Reflex',
    damage: '20d6+412 fire AoE',
    cost: 'free',
  },
  {
    id: 'db',
    name: 'Dragon Breath',
    shortCode: 'DB',
    damageType: 'fire',
    kind: 'Destiny',
    cooldown: '12s',
    save: 'DC 58 Reflex',
    damage: '15d20 fire cone',
    cost: 'free',
  },
  {
    id: 'qk',
    name: 'Quicken Spell',
    shortCode: 'QKN',
    damageType: 'none',
    kind: 'Feat (toggle)',
    cooldown: '—',
    save: '—',
    damage: '—',
    cost: '+10 SP/cast',
  },
  {
    id: 'emp',
    name: 'Empower Spell',
    shortCode: 'EMP',
    damageType: 'none',
    kind: 'Feat (toggle)',
    cooldown: '—',
    save: '—',
    damage: '+75% base',
    cost: '+15 SP/cast',
  },
  {
    id: 'lit',
    name: 'Litany of the Dead',
    shortCode: 'LIT',
    damageType: 'none',
    kind: 'Trinket · equipped',
    cooldown: '3/rest',
    save: '—',
    damage: 'Profane +1 all abilities',
    cost: 'free',
    isEquipped: true,
  },
  {
    id: 'boots',
    name: 'Boots of Propulsion',
    shortCode: 'PRO',
    damageType: 'none',
    kind: 'Boots · equipped',
    cooldown: '5/rest',
    save: '—',
    damage: 'Haste 30s',
    cost: 'free',
    isEquipped: true,
  },
  {
    id: 'staff',
    name: 'Epic Staff of Arcane Power',
    shortCode: 'STF',
    damageType: 'force',
    kind: 'Main hand · equipped',
    cooldown: '1/rest',
    save: '—',
    damage: 'Spell power +50 (60s)',
    cost: 'free',
    isEquipped: true,
  },
  {
    id: 'disp',
    name: 'Cloak of Displacement',
    shortCode: 'DSP',
    damageType: 'none',
    kind: 'Cloak · added — swap to use',
    cooldown: '3/rest',
    save: '—',
    damage: 'Displacement 60s',
    cost: 'free',
    isEquipped: false,
  },
  {
    id: 'tele',
    name: 'Voice of the Master',
    shortCode: 'VOM',
    damageType: 'none',
    kind: 'Trinket · added — swap to use',
    cooldown: '1/rest',
    save: '—',
    damage: 'Greater Teleport',
    cost: 'free',
    isEquipped: false,
  },
]

export const ABILITY_POOL_GROUPS: readonly AbilityPoolGroup[] = [
  { name: 'Spells', abilityIds: ['dbf', 'ms', 'cl', 'pr', 'dis', 'wl'] },
  { name: 'SLAs & enhancements', abilityIds: ['fb', 'sr', 'eb'] },
  { name: 'Destiny', abilityIds: ['db'] },
  { name: 'Feats', abilityIds: ['qk', 'emp'] },
]

export const ITEM_CLICKY_ABILITY_IDS: readonly string[] = ['lit', 'boots', 'staff', 'disp', 'tele']

export const DEFAULT_HOTBARS: readonly Hotbar[] = [
  {
    id: 'bar-1',
    label: 'Nukes',
    slots: hotbarSlotsFilledFromStart(['dbf', 'ms', 'cl', 'pr', 'dis', 'wl']),
  },
  { id: 'bar-2', label: 'SLAs', slots: hotbarSlotsFilledFromStart(['fb', 'sr', 'eb', 'db']) },
]
