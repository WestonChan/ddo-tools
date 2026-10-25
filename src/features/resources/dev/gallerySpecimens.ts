import type { Slug } from '../../../lib/api'
import { gallerySlug } from './galleryItems'
import type { ComponentGallerySectionId } from './componentGallerySections'

export type GalleryItemState = 'loading' | 'unavailable' | 'item-error' | 'set-error'

export interface GallerySpecimen {
  section: ComponentGallerySectionId
  title: string
  branch: string
  itemSlug: Slug | null
  matchingBonuses?: readonly string[]
  state?: GalleryItemState
}

export const GALLERY_SECTION_SUBTITLES: Record<ComponentGallerySectionId, string> = {
  header: 'kicker, name, wiki link, chips, facts, description',
  weapons: 'dice, crit, modifiers, damage reduction bypasses',
  armor: 'armor, shield and other items',
  enchantments: 'every kind of enchantment row, and the filter highlight',
  sets: 'set bands, tiers, two sets on one item',
  augments: 'every socket family and its candidate list',
  sources: 'every way an item is obtained',
  clickies: 'display under review',
  status: 'loading, missing and failed',
}

export const GALLERY_SPECIMENS: readonly GallerySpecimen[] = [
  {
    section: 'header',
    title: 'Legacy, craftable, raid and rare',
    branch:
      'Legacy and Craftable chips, Raid and Rare facts, a long description with Show more in the tooltip, two augment sockets',
    itemSlug: gallerySlug('legacy-craftable-ring'),
  },
  {
    section: 'header',
    title: 'Bare item',
    branch: 'No description, wiki page, minimum level or sources: every fact shows its empty dash',
    itemSlug: gallerySlug('plain-trinket'),
  },
  {
    section: 'weapons',
    title: 'One-handed, numeric critical',
    branch:
      'Damage with enhancement, threat range and multiplier from numbers, ability modifiers, material, damage reduction bypasses',
    itemSlug: gallerySlug('longsword'),
  },
  {
    section: 'weapons',
    title: 'Two-handed, critical from text',
    branch:
      'Multiplied dice, threat range and multiplier parsed from the critical text, one ability modifier',
    itemSlug: gallerySlug('greataxe'),
  },
  {
    section: 'weapons',
    title: 'Unparseable critical',
    branch: 'No dice, critical shown as plain text, missing proficiency and handedness',
    itemSlug: gallerySlug('odd-weapon'),
  },
  {
    section: 'armor',
    title: 'Shield',
    branch: 'Shield bonus and max Dex as primary stats, spell failure and check penalty as extras',
    itemSlug: gallerySlug('tower-shield'),
  },
  {
    section: 'armor',
    title: 'Body armor',
    branch: 'Armor bonus, damage reduction, material and required race',
    itemSlug: gallerySlug('plate'),
  },
  {
    section: 'armor',
    title: 'Neither armor nor weapon',
    branch: 'Only material and race as stats',
    itemSlug: gallerySlug('cloak'),
  },
  {
    section: 'enchantments',
    title: 'Every enchantment shape',
    branch:
      'Enhancement row, plain, tiered, damage, two values, calculated, grouped, untyped and described rows; more than five rows in the tooltip',
    itemSlug: gallerySlug('enchanted-ring'),
  },
  {
    section: 'enchantments',
    title: 'Bonuses filter active',
    branch: 'Rows matching the Bonuses filter are highlighted and the legend appears',
    itemSlug: gallerySlug('enchanted-ring'),
    matchingBonuses: ['Constitution', 'Spell Power'],
  },
  {
    section: 'sets',
    title: 'Two sets',
    branch: 'Two set bands, each opening to its tiers; set hover card lists its pieces',
    itemSlug: gallerySlug('stormforged-helm'),
  },
  {
    section: 'sets',
    title: 'One set',
    branch: 'A single set band with two tiers',
    itemSlug: gallerySlug('stormforged-gauntlets'),
  },
  {
    section: 'sets',
    title: 'Set failed to load',
    branch: 'The item shows, its set bands are missing, and a set error notice replaces them',
    itemSlug: gallerySlug('stormforged-gauntlets'),
    state: 'set-error',
  },
  {
    section: 'augments',
    title: 'Every socket family',
    branch:
      'Standard colours, Sun and Moon, Isle of Dread, Lamordia, crafting upgrade; each opens its candidate ledger',
    itemSlug: gallerySlug('socketed-bracers'),
  },
  {
    section: 'sources',
    title: 'Quests',
    branch:
      'Patron and pack, raid with heroic and epic levels, rare, free to play, end reward and chests',
    itemSlug: gallerySlug('quest-drops'),
  },
  {
    section: 'sources',
    title: 'Chains, sagas and adventure packs',
    branch: 'Chain end reward, saga tier, adventure pack with chest and Rare',
    itemSlug: gallerySlug('chains-and-sagas'),
  },
  {
    section: 'sources',
    title: 'Vendor, crafting, challenge, event and starter',
    branch:
      'Vendor with location and priced ingredients, crafting system, challenge pack and starter hints, event',
    itemSlug: gallerySlug('vendor-and-crafted'),
  },
  {
    section: 'sources',
    title: 'Drop location text only',
    branch: 'No structured source: the free-text drop location stands in',
    itemSlug: gallerySlug('drop-location-only'),
  },
  {
    section: 'clickies',
    title: 'Clickies',
    branch: 'Multi-line description, a one-line description, no description',
    itemSlug: gallerySlug('clickies'),
  },
  {
    section: 'status',
    title: 'Loading',
    branch: 'The item has not arrived yet',
    itemSlug: null,
    state: 'loading',
  },
  {
    section: 'status',
    title: 'Unavailable',
    branch: 'The item query settled with nothing',
    itemSlug: null,
    state: 'unavailable',
  },
  {
    section: 'status',
    title: 'Request failed',
    branch: 'The item request failed, with a retry control',
    itemSlug: null,
    state: 'item-error',
  },
]
