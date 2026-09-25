import { createContext, useContext, type Dispatch } from 'react'
import type { CharacterSheetAction } from './characterSheet.actions'
import type { CharacterSheetDocument } from './characterSheet.types'
import type { FormulaEvaluation } from './formulas/formulaEngine'

export type CharacterSheetContextValue = {
  document: CharacterSheetDocument
  dispatch: Dispatch<CharacterSheetAction>
  formulas: FormulaEvaluation
}

export const CharacterSheetContext =
  createContext<CharacterSheetContextValue | null>(null)

export function useCharacterSheet() {
  const context = useContext(CharacterSheetContext)
  if (!context) {
    throw new Error('useCharacterSheet должен вызываться внутри CharacterSheetProvider')
  }
  return context
}

export const useCharacterSheetDocument = () => useCharacterSheet().document
export const useCharacterSheetDispatch = () => useCharacterSheet().dispatch
export const useCharacterSheetFormulas = () => useCharacterSheet().formulas
