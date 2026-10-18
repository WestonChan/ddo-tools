import { apiFixture } from '../../test/apiFixture'
import { expectTypeOf, it } from 'vitest'
import type { ApiAdventurePack, ApiOptionalBuff } from './types'
import capturedBuffsResponse from './fixtures/optional-buffs.json'
import capturedPacksResponse from './fixtures/adventure-packs.json'

const capturedBuffs = apiFixture(capturedBuffsResponse)
const capturedPacks = apiFixture(capturedPacksResponse)

it('accepts captured optional buffs and packs', () => {
  const buffs: ApiOptionalBuff[] = capturedBuffs.optional_buffs
  const packs: ApiAdventurePack[] = capturedPacks.adventure_packs
  expectTypeOf(buffs).toEqualTypeOf<ApiOptionalBuff[]>()
  expectTypeOf(packs).toEqualTypeOf<ApiAdventurePack[]>()
})
