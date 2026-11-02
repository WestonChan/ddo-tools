import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiAugmentDetail, ApiNote, ApiSetDetail } from '../../../../lib/api'
import { apiFixture } from '../../../../test/apiFixture'
import plagueWolfResponse from '../../queries/fixtures/feat-wild-shape-plague-wolf.json'
import rampartResponse from '../../queries/fixtures/item-epic-deaths-rampart.json'
import augmentResponse from '../../queries/fixtures/augment-solar-gem-of-physical-resistance-rating-heroic.json'
import setResponse from '../../queries/fixtures/set-devoted-heart.json'
import { toAugmentDetail } from '../../queries/items'
import { toSetDetail } from '../../queries/sets'
import type { NoteKind } from '../../queries/notes'
import { augmentDetailQueryOptions, setDetailQueryOptions } from '../../queries/useItems'
import {
  AugmentDetailCard,
  AugmentHoverCard,
  SetDetailCard,
  SetHoverCard,
} from './ResourceHoverCards'
import { EffectListBriefView, EffectListFullView } from './EffectList'
import { setEffectRows } from './effectRows'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
afterEach(cleanup)

it('carries both note kinds through augment and set mappers into both card variants and item set tiers', () => {
  const capturedByKind = {
    game_bug: plagueWolfResponse.notes[0],
    unverified: rampartResponse.effects.flatMap((effect) => effect.notes)[0],
  } satisfies Record<NoteKind, unknown>
  for (const capturedNote of Object.values(capturedByKind)) {
    const notes = [capturedNote as ApiNote]
    const capturedAugment = apiFixture(augmentResponse) as ApiAugmentDetail
    const capturedSet = apiFixture(setResponse) as ApiSetDetail
    const augment = toAugmentDetail({
      ...capturedAugment,
      notes,
      effects: capturedAugment.effects.map((effect, index) => ({
        ...effect,
        notes: index === 0 ? notes : [],
      })),
    })
    const set = toSetDetail({
      ...capturedSet,
      notes,
      tiers: capturedSet.tiers.map((tier, tierIndex) => ({
        ...tier,
        effects: tier.effects.map((effect, index) => ({
          ...effect,
          notes: tierIndex === 0 && index === 0 ? notes : [],
        })),
      })),
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    client.setQueryData(augmentDetailQueryOptions(augment.slug).queryKey, augment)
    client.setQueryData(setDetailQueryOptions(set.slug).queryKey, set)
    for (const card of [
      <AugmentDetailCard augmentSlug={augment.slug} />,
      <AugmentHoverCard augmentSlug={augment.slug} />,
      <SetDetailCard setSlug={set.slug} />,
      <SetHoverCard setSlug={set.slug} />,
    ]) {
      const { container, unmount } = render(
        <QueryClientProvider client={client}>{card}</QueryClientProvider>,
      )
      expect(
        container.querySelectorAll('.detail-card__header .resources-note-marker'),
      ).toHaveLength(1)
      expect(
        container.querySelectorAll('.detail-value-row__label .resources-note-marker'),
      ).toHaveLength(1)
      for (const marker of container.querySelectorAll('.resources-note-marker'))
        expect(marker.closest('[data-tip]')).toHaveAttribute(
          'data-tip',
          expect.stringContaining(capturedNote.text),
        )
      unmount()
    }
    const tiers = setEffectRows(set)
    for (const View of [EffectListFullView, EffectListBriefView]) {
      const { container, getByRole, unmount } = render(
        <QueryClientProvider client={client}>
          <View entries={tiers} />
        </QueryClientProvider>,
      )
      fireEvent.click(getByRole('row', { name: new RegExp(set.name) }))
      expect(container.querySelectorAll('.resources-note-marker')).toHaveLength(1)
      unmount()
    }
    client.clear()
  }
})
