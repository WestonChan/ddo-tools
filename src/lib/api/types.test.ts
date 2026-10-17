import { expectTypeOf, it } from 'vitest'
import type { ApiAdventurePack, ApiOptionalBuff } from './types'
import capturedBuffs from './fixtures/optional-buffs.json'
import capturedPacks from './fixtures/adventure-packs.json'

it('accepts captured optional buffs and packs', () => {
  const buffs: ApiOptionalBuff[] = capturedBuffs.optional_buffs
  const packs: ApiAdventurePack[] = capturedPacks.adventure_packs
  expectTypeOf(buffs).toEqualTypeOf<ApiOptionalBuff[]>()
  expectTypeOf(packs).toEqualTypeOf<ApiAdventurePack[]>()
})
