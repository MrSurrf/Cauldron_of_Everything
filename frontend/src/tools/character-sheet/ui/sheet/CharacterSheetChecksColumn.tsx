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
import styles from '../../CharacterSheetTool.module.css'
import { abilityLabels } from './sheet.constants'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetChecksColumnProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterSheetChecksColumn({
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
    <div className={`${styles.column} ${styles.checksColumn}`}>
      <SavingThrowsList
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
                patch.proficient
                  ? 'proficient'
                  : 'none',
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

      <SkillsList
        items={Object.values(document.skills).map(
          (skill) => ({
            ability: abilityLabels[skill.ability].abbreviation,
            defaultFormula:
              ruleset.defaultFormulas[skill.variableKey],
            expertise: skill.rank === 'expertise',
            id: skill.id,
            label: skill.label,
            proficient:
              skill.rank === 'proficient' ||
              skill.rank === 'expertise',
            result: resultFor(skill.variableKey),
            value: skill.value,
          }),
        )}
        onItemChange={(id, patch) => {
          const skill = document.skills[id]
          if (!skill) return

          if (
            patch.proficient !== undefined ||
            patch.expertise !== undefined
          ) {
            const proficient =
              patch.proficient ??
              (skill.rank !== 'none')
            const expertise =
              patch.expertise ??
              (skill.rank === 'expertise')
            dispatch(
              characterSheetActions.setSkillRank(
                id,
                !proficient
                  ? 'none'
                  : expertise
                    ? 'expertise'
                    : 'proficient',
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
    </div>
  )
}
