import { useContext } from 'react'
import { CharacterContext } from '../contexts/characterContext'
import type { CharacterContextValue } from '../contexts/characterContext'

export function useCharacters(): CharacterContextValue {
  const contextValue = useContext(CharacterContext)
  if (!contextValue) throw new Error('useCharacters must be used within <CharacterProvider>')
  return contextValue
}
