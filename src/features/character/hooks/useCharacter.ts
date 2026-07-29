import { useContext } from 'react'
import { CharacterContext } from '../contexts/characterContext'
import type { CharacterContextValue } from '../contexts/characterContext'

export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within <CharacterProvider>')
  return ctx
}
