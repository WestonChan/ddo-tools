import type { Slug } from './types'

export const API_DETAIL_KINDS = [
  'adventure-packs',
  'augments',
  'classes',
  'crafting-systems',
  'effects',
  'enhancement-trees',
  'events',
  'feats',
  'items',
  'quest-chains',
  'quests',
  'races',
  'sagas',
  'sets',
  'spells',
  'vendors',
] as const

export function apiDetailPath(kind: (typeof API_DETAIL_KINDS)[number], slug: Slug): string {
  return `/v1/${kind}/${slug}`
}

export function apiResponseDiagnosticPath(
  kind: (typeof API_DETAIL_KINDS)[number],
  slug: Slug | null | undefined,
): string {
  return apiDetailPath(kind, slug ?? ('unknown' as Slug))
}

export function slugFromPathSegment(text: string): Slug | null {
  return /^[a-z0-9][a-z0-9-]*$/.test(text) && !text.includes('\n') ? (text as Slug) : null
}
