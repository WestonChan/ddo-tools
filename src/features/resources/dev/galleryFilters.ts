import type { QueryClient } from '@tanstack/react-query'
import {
  adventurePackNamesQueryOptions,
  craftingSystemVocabularyQueryOptions,
  effectVocabularyQueryOptions,
  equipmentSlotNamesQueryOptions,
  itemMaterialsQueryOptions,
  raidQuestsQueryOptions,
  setVocabularyQueryOptions,
  socketTypesQueryOptions,
  weaponAbilitiesQueryOptions,
} from '../queries/itemFilterVocabularies'
import { GALLERY_SETS, gallerySlug } from './galleryItems'

export function seedGalleryFilterVocabularies(queryClient: QueryClient): void {
  queryClient.setQueryData(equipmentSlotNamesQueryOptions().queryKey, ['Weapon', 'Ring', 'Trinket'])
  queryClient.setQueryData(adventurePackNamesQueryOptions().queryKey, ['Ravenloft', 'Sharn'])
  queryClient.setQueryData(raidQuestsQueryOptions().queryKey, [
    { slug: gallerySlug('raid'), name: 'A gallery raid', pack: 'Ravenloft' },
  ])
  queryClient.setQueryData(setVocabularyQueryOptions('').queryKey, {
    rows: GALLERY_SETS.map((set) => set.name),
    total: GALLERY_SETS.length,
  })
  queryClient.setQueryData(effectVocabularyQueryOptions('').queryKey, {
    rows: [
      {
        slug: gallerySlug('strength'),
        name: 'Strength',
        kind: 'stat',
        matchedAlias: null,
        item_count: 12,
        augment_count: 1,
        set_count: 1,
        bonus_types: [{ name: 'Insightful', item_count: 3 }],
      },
      {
        slug: gallerySlug('dexterity'),
        name: 'Dexterity',
        kind: 'stat',
        matchedAlias: null,
        item_count: 8,
        augment_count: 1,
        set_count: 0,
        bonus_types: [],
      },
    ],
    total: 2,
  })
  queryClient.setQueryData(weaponAbilitiesQueryOptions().queryKey, [
    {
      slug: gallerySlug('strength'),
      name: 'Strength',
      sort_order: 0,
      attack_item_count: 12,
      damage_item_count: 14,
    },
    {
      slug: gallerySlug('dexterity'),
      name: 'Dexterity',
      sort_order: 1,
      attack_item_count: 8,
      damage_item_count: 3,
    },
  ])
  queryClient.setQueryData(itemMaterialsQueryOptions().queryKey, [
    { name: 'Steel', sort_order: 0, item_count: 12 },
    { name: 'Silver', sort_order: 1, item_count: 5 },
    { name: 'Crystal', sort_order: 2, item_count: 0 },
  ])
  queryClient.setQueryData(socketTypesQueryOptions().queryKey, [
    { slug: gallerySlug('red'), label: 'red', family: 'standard', item_count: 15 },
    { slug: gallerySlug('blue'), label: 'blue', family: 'standard', item_count: 9 },
    {
      slug: gallerySlug('dino'),
      label: 'isle of dread: fang (weapon)',
      family: 'dino',
      item_count: 8,
    },
    {
      slug: gallerySlug('lamordia'),
      label: 'lamordia: dolorous (weapon)',
      family: 'lamordia',
      item_count: 6,
    },
    { slug: gallerySlug('upgrade'), label: 'upgrade', family: 'upgrade', item_count: 2 },
    {
      slug: gallerySlug('upgrade-tier-2-toee'),
      label: 'upgrade: tier 2 (toee)',
      family: 'upgrade',
      item_count: 0,
    },
  ])
  queryClient.setQueryData(craftingSystemVocabularyQueryOptions().queryKey, [
    { slug: gallerySlug('thunder-forged'), name: 'Thunder-Forged', item_count: 12 },
    { slug: gallerySlug('dinosaur-bone'), name: 'Dinosaur Bone', item_count: 8 },
  ])
}
