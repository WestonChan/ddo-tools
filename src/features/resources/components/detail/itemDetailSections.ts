import {
  detailCardSection,
  type DetailCardSectionContent,
  type DetailCardSectionDefinition,
} from '../../../../components'

export const ITEM_DETAIL_SECTION_KEYS = [
  'description',
  'stats',
  'enchantments',
  'clickies',
  'sources',
  'source-location',
  'set-status',
] as const

export function itemDetailSection<Entry>(
  section: DetailCardSectionDefinition<Entry> & { key: (typeof ITEM_DETAIL_SECTION_KEYS)[number] },
): DetailCardSectionContent {
  return detailCardSection(section)
}
