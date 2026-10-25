import { describe, it, expect, vi, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { cleanup, screen } from '@testing-library/react'
import { HoverCardProvider } from '../../../components'
import { render as renderWithQueryClient } from '../../../test/renderWithQueryClient'
import type { Slug } from '../../../lib/api'
import { ITEM_DETAIL_SECTION_KEYS } from '../components/detail/itemDetailSections'
import type { Item, ItemSourceKind } from '../queries/items'
import {
  augmentDetailQueryOptions,
  effectDetailQueryOptions,
  fittingAugmentsQueryKey,
  itemDetailQueryOptions,
  questDetailQueryOptions,
  setDetailQueryOptions,
  sourceDetailQueryOptions,
} from '../queries/useItems'
import { COMPONENT_GALLERY_SECTIONS } from './componentGallerySections'
import { ComponentGalleryView } from './ComponentGalleryView'
import { GALLERY_AUGMENTS, GALLERY_ITEMS, GALLERY_SETS, galleryItemBySlug } from './galleryItems'
import { seedGalleryQueries } from './gallerySeed'
import { GALLERY_SPECIMENS } from './gallerySpecimens'

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks')>()),
  useSectionScrollSpy: vi.fn(),
}))

afterEach(cleanup)

const EVERY_ITEM_SOURCE_KIND: Record<ItemSourceKind, true> = {
  adventurePack: true,
  craftingSystem: true,
  challengePack: true,
  vendor: true,
  event: true,
  starter: true,
}

describe('gallery specimens', () => {
  it('give every section at least one specimen, each naming an existing item', () => {
    for (const section of COMPONENT_GALLERY_SECTIONS)
      expect(
        GALLERY_SPECIMENS.some((specimen) => specimen.section === section.id),
        section.label,
      ).toBe(true)
    for (const { itemSlug } of GALLERY_SPECIMENS)
      if (itemSlug !== null) expect(() => galleryItemBySlug(itemSlug)).not.toThrow()
  })

  it('show every kind of item source', () => {
    const shownKinds = new Set(
      GALLERY_ITEMS.flatMap((item) =>
        [...item.adventurePackDrops, ...item.sourcesBeyondQuests].map((source) => source.kind),
      ),
    )
    expect([...shownKinds].sort()).toEqual(Object.keys(EVERY_ITEM_SOURCE_KIND).sort())
  })

  it('show every kind of item stat block', () => {
    const kinds = new Set(
      GALLERY_ITEMS.map((item) =>
        item.armorStats?.shieldBonus != null || item.category === 'Shield'
          ? 'shield'
          : item.weaponStats
            ? 'weapon'
            : item.armorStats
              ? 'armor'
              : 'other',
      ),
    )
    expect([...kinds].sort()).toEqual(['armor', 'other', 'shield', 'weapon'])
  })
})

describe('gallery queries', () => {
  it('hold everything a card or hover card can request, so nothing reaches the API', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const queryClient = new QueryClient()
    seedGalleryQueries(queryClient)
    const isSeeded = (queryKey: readonly unknown[]): boolean =>
      queryClient.getQueryData(queryKey) !== undefined
    const missing: string[] = []
    function require(label: string, queryKey: readonly unknown[]): void {
      if (!isSeeded(queryKey)) missing.push(`${label} ${JSON.stringify(queryKey)}`)
    }
    function requireItem(item: Pick<Item, 'slug'>): void {
      require('item', itemDetailQueryOptions(item.slug).queryKey)
    }
    for (const item of GALLERY_ITEMS) {
      requireItem(item)
      for (const set of item.sets) require('set', setDetailQueryOptions(set.slug).queryKey)
      for (const effect of item.effects)
        require('effect', effectDetailQueryOptions(effect.slug).queryKey)
      for (const quest of item.quests)
        require('quest', questDetailQueryOptions(quest.slug).queryKey)
      for (const chain of item.questChains)
        require('chain', sourceDetailQueryOptions('questChain', chain.slug).queryKey)
      for (const saga of item.sagas)
        require('saga', sourceDetailQueryOptions('saga', saga.slug).queryKey)
      for (const source of [...item.adventurePackDrops, ...item.sourcesBeyondQuests]) {
        if (source.slug === null || source.kind === 'challengePack' || source.kind === 'starter')
          continue
        require('source', sourceDetailQueryOptions(source.kind, source.slug).queryKey)
      }
      for (const slot of item.augmentSlots) {
        require('slot candidates', fittingAugmentsQueryKey(slot.label))
        const candidates = queryClient.getQueryData<{ slug: Slug }[]>(
          fittingAugmentsQueryKey(slot.label),
        )
        for (const augment of candidates ?? [])
          require('augment', augmentDetailQueryOptions(augment.slug).queryKey)
      }
    }
    for (const set of GALLERY_SETS) {
      for (const piece of set.items) requireItem(piece)
      for (const tier of set.tiers)
        for (const effect of tier.effects)
          require('set effect', effectDetailQueryOptions(effect.slug).queryKey)
    }
    for (const augment of GALLERY_AUGMENTS)
      for (const effect of augment.effects)
        require('augment effect', effectDetailQueryOptions(effect.slug).queryKey)
    for (const item of GALLERY_ITEMS) {
      for (const quest of item.quests) {
        const detail = queryClient.getQueryData<{ items: { slug: Slug }[] }>(
          questDetailQueryOptions(quest.slug).queryKey,
        )
        for (const piece of detail?.items ?? []) requireItem(piece)
      }
    }
    expect(missing).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('ComponentGalleryView', () => {
  it('shows one titled section per rail entry and a pane and tooltip per specimen', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { container } = renderWithQueryClient(
      <HoverCardProvider>
        <ComponentGalleryView />
      </HoverCardProvider>,
    )
    for (const section of COMPONENT_GALLERY_SECTIONS)
      expect(
        screen.getByRole('heading', { level: 2, name: section.label }),
        section.label,
      ).toHaveAttribute('class', 'page-section-title')
    expect(container.querySelectorAll('.component-gallery__specimen')).toHaveLength(
      GALLERY_SPECIMENS.length,
    )
    expect(container.querySelectorAll('.detail-card--pane').length).toBe(
      container.querySelectorAll('.detail-card--hover').length,
    )
    const shownSectionKeys = new Set(
      [...container.querySelectorAll('.detail-card--pane [data-section-key]')].map((section) =>
        section.getAttribute('data-section-key'),
      ),
    )
    expect([...ITEM_DETAIL_SECTION_KEYS].filter((key) => !shownSectionKeys.has(key))).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
