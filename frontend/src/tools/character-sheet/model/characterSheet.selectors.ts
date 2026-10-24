import type {
  AbilityKey,
  CharacterSheetDocument,
  NumericFieldState,
} from './characterSheet.types'
import {
  buildCharacterSheetFormulaFields,
  evaluateCharacterSheetFormulas,
  type FormulaEvaluation,
} from './formulas/formulaEngine'
import type { FormulaResult } from './formulas/formula.types'
import { getRulesetDefinition } from './rulesets/registry'
import {
  abilityModifierVariable,
  abilityScoreVariable,
  savingThrowVariable,
} from './rulesets/ruleset.types'

export const selectRuleset = (document: CharacterSheetDocument) =>
  getRulesetDefinition(document.rulesetId)

export const selectFormulaEvaluation = (
  document: CharacterSheetDocument,
): FormulaEvaluation => evaluateCharacterSheetFormulas(document)

export const selectFormulaResult = (
  evaluation: FormulaEvaluation,
  variableKey: string,
): FormulaResult =>
  evaluation.results[variableKey.toUpperCase()] ?? { status: 'empty', value: null }

export const selectFormulaValue = (
  evaluation: FormulaEvaluation,
  variableKey: string,
) => evaluation.values[variableKey.toUpperCase()] ?? null

export const selectAbilityScore = (
  evaluation: FormulaEvaluation,
  ability: AbilityKey,
) => selectFormulaValue(evaluation, abilityScoreVariable(ability))

export const selectAbilityModifier = (
  evaluation: FormulaEvaluation,
  ability: AbilityKey,
) => selectFormulaValue(evaluation, abilityModifierVariable(ability))

export const selectSavingThrow = (
  evaluation: FormulaEvaluation,
  ability: AbilityKey,
) => selectFormulaValue(evaluation, savingThrowVariable(ability))

export const selectSkillValue = (
  document: CharacterSheetDocument,
  evaluation: FormulaEvaluation,
  skillId: string,
) => {
  const skill = document.skills[skillId]
  return skill ? selectFormulaValue(evaluation, skill.variableKey) : null
}

export const selectEffectiveFormula = (
  document: CharacterSheetDocument,
  variableKey: string,
) => {
  const key = variableKey.toUpperCase()
  const field = buildCharacterSheetFormulaFields(document)[key]
  if (!field) return null
  return field.state.formulaOverride ?? field.defaultFormula ?? null
}

export const selectNumericDisplayValue = (
  field: NumericFieldState,
  result?: FormulaResult,
) => {
  if (field.mode === 'manual') return field.manualValue
  return result?.value ?? null
}

export const formatSignedValue = (value: number | null) => {
  if (value === null) return '—'
  return value >= 0 ? `+${value}` : String(value)
}

