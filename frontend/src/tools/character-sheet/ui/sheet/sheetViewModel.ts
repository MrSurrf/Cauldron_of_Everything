import { useCallback, useMemo } from 'react'

import {
  characterSheetActions,
  createCharacterSheetVariableRegistry,
  getRulesetDefinition,
  selectValidCustomFormulaFields,
  selectFormulaResult,
  selectFormulaValue,
  useCharacterSheet,
  type FormulaResult,
  type NumericFieldAddress,
} from '../../model'
import type {
  ComputedValueResult,
  FormulaFieldValue,
  FormulaVariableOption,
} from '../fields'

export function toComputedResult(
  result: FormulaResult | undefined,
): ComputedValueResult {
  if (!result) {
    return { status: 'empty', value: null }
  }

  if (result.status === 'error') {
    return {
      status: 'error',
      value: null,
      error: result.error.message,
    }
  }

  return result
}

export function useCharacterSheetViewModel() {
  const {
    dispatch,
    document,
    formulas,
  } = useCharacterSheet()
  const ruleset = getRulesetDefinition(document.rulesetId)
  const customVariableKeyIssues = useMemo(
    () => selectValidCustomFormulaFields(document).issuesByFieldId,
    [document],
  )
  const variables = useMemo<readonly FormulaVariableOption[]>(
    () => createCharacterSheetVariableRegistry(document)
      .list()
      .map((variable) => ({
        key: variable.key,
        label: variable.label,
      })),
    [document],
  )
  const resultFor = useCallback(
    (key: string) => toComputedResult(
      selectFormulaResult(formulas, key),
    ),
    [formulas],
  )
  const valueFor = useCallback(
    (key: string) => selectFormulaValue(formulas, key),
    [formulas],
  )
  const updateNumericField = useCallback((
    address: NumericFieldAddress,
    value: FormulaFieldValue,
  ) => {
    dispatch(
      characterSheetActions.setNumericField(address, value),
    )
  }, [dispatch])
  const isSectionOpen = useCallback(
    (sectionId: string) =>
      !document.view.collapsedSectionIds.includes(sectionId),
    [document.view.collapsedSectionIds],
  )
  const setSectionOpen = useCallback(
    (sectionId: string, open: boolean) => {
      const currentlyOpen =
        !document.view.collapsedSectionIds.includes(sectionId)

      if (currentlyOpen !== open) {
        dispatch(
          characterSheetActions.toggleSection(sectionId),
        )
      }
    },
    [dispatch, document.view.collapsedSectionIds],
  )

  return {
    customVariableKeyIssues,
    dispatch,
    document,
    formulas,
    isSectionOpen,
    resultFor,
    ruleset,
    setSectionOpen,
    updateNumericField,
    valueFor,
    variables,
  }
}

export type CharacterSheetViewModel = ReturnType<
  typeof useCharacterSheetViewModel
>
