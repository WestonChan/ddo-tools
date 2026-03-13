import { useContext } from 'react'
import { CharacterContext } from '../context'
import type { CharacterContextValue } from '../context'

export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within <CharacterProvider>')
  return ctx
}
