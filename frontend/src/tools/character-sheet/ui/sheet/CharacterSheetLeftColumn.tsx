import { ABILITY_KEYS } from '../../model'
import {
  abilityModifierVariable,
  abilityScoreVariable,
} from '../../model/rulesets/ruleset.types'
import { AbilityScoreCard } from '../abilities'
import styles from '../../CharacterSheetTool.module.css'
import { abilityLabels } from './sheet.constants'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetLeftColumnProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterSheetLeftColumn({
  sheet,
}: CharacterSheetLeftColumnProps) {
  const {
    document,
    resultFor,
    ruleset,
    updateNumericField,
  } = sheet

  return (
    <section
      aria-label="Характеристики"
      className={styles.abilitiesColumn}
    >
      <div className={styles.abilityGrid}>
        {ABILITY_KEYS.map((ability) => {
          const meta = abilityLabels[ability]
          const state = document.abilities[ability]
          const scoreKey = abilityScoreVariable(ability)
          const modifierKey = abilityModifierVariable(ability)

          return (
            <AbilityScoreCard
              key={ability}
              abbreviation={meta.formulaAbbreviation}
              label={meta.label}
              modifier={state.modifier}
              modifierDefaultFormula={
                ruleset.defaultFormulas[modifierKey]
              }
              modifierResult={resultFor(modifierKey)}
              score={state.score}
              scoreResult={resultFor(scoreKey)}
              onModifierChange={(value) => {
                updateNumericField(
                  {
                    ability,
                    field: 'modifier',
                    kind: 'ability',
                  },
                  value,
                )
              }}
              onScoreChange={(value) => {
                updateNumericField(
                  {
                    ability,
                    field: 'score',
                    kind: 'ability',
                  },
                  value,
                )
              }}
            />
          )
        })}
      </div>
    </section>
  )
}
