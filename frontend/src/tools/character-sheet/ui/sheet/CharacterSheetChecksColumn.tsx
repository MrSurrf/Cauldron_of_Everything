import {
  ABILITY_KEYS,
  characterSheetActions,
  savingThrowVariable,
  type AbilityKey,
} from '../../model'
import {
  SavingThrowsList,
  SkillsList,
} from '../abilities'
import { abilityLabels } from './sheet.constants'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetChecksColumnProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterSavingThrowsSection({
  sheet,
}: CharacterSheetChecksColumnProps) {
  const {
    dispatch,
    document,
    resultFor,
    ruleset,
    updateNumericField,
  } = sheet

  return (
    <SavingThrowsList
      fill={true}
      items={ABILITY_KEYS.map((ability) => {
        const key = savingThrowVariable(ability)
        const state = document.savingThrows[ability]

        return {
          defaultFormula: ruleset.defaultFormulas[key],
          id: ability,
          label: abilityLabels[ability].label,
          proficient: state.rank !== 'none',
          result: resultFor(key),
          value: state.value,
        }
      })}
      onItemChange={(id, patch) => {
        const ability = id as AbilityKey
        if (patch.proficient !== undefined) {
          dispatch(
            characterSheetActions.setSavingThrowRank(
              ability,
              patch.proficient ? 'proficient' : 'none',
            ),
          )
        }
        if (patch.value) {
          updateNumericField(
            { kind: 'savingThrow', ability },
            patch.value,
          )
        }
      }}
    />
  )
}

export function CharacterSkillsSection({
  sheet,
}: CharacterSheetChecksColumnProps) {
  const {
    dispatch,
    document,
    resultFor,
    ruleset,
    updateNumericField,
  } = sheet

  return (
    <SkillsList
      fill={true}
      items={Object.values(document.skills).map((skill) => ({
        ability: abilityLabels[skill.ability].shortLabel,
        defaultFormula:
          ruleset.defaultFormulas[skill.variableKey],
        id: skill.id,
        label: skill.label,
        rank: skill.rank,
        result: resultFor(skill.variableKey),
        value: skill.value,
      }))}
      onItemChange={(id, patch) => {
        const skill = document.skills[id]
        if (!skill) return

        if (patch.rank !== undefined) {
          dispatch(
            characterSheetActions.setSkillRank(
              id,
              patch.rank,
            ),
          )
        }

        if (patch.value) {
          updateNumericField(
            { kind: 'skill', skillId: id },
            patch.value,
          )
        }
      }}
    />
  )
}
