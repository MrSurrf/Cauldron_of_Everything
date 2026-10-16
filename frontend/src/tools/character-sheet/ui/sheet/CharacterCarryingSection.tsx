import {
  FORMULA_FIELD_KEYS,
  formulaNumericField,
  manualNumericField,
} from '../../model'
import { FormulaField } from '../fields'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'
import styles from './CharacterCarryingSection.module.css'

export type CharacterCarryingSectionProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterCarryingSection({ sheet }: CharacterCarryingSectionProps) {
  const {
    document,
    resultFor,
    ruleset,
    updateNumericField,
    variables,
  } = sheet

  return (
    <SheetSection title="Вес">
      <div className={styles.fields}>
        <FormulaField
          compact={true}
          label="Несомый, фн."
          presentation="list"
          result={resultFor(FORMULA_FIELD_KEYS.carriedWeight)}
          value={document.derivedStats.carriedWeight ?? manualNumericField(0)}
          variables={variables}
          onValueChange={(value) => updateNumericField(
            { kind: 'derived', field: 'carriedWeight' },
            value,
          )}
        />
        <FormulaField
          compact={true}
          defaultFormula={ruleset.defaultFormulas.CARRYING_CAPACITY}
          label="Предел, фн."
          presentation="list"
          result={resultFor(FORMULA_FIELD_KEYS.carryingCapacity)}
          value={document.derivedStats.carryingCapacity ?? formulaNumericField(0)}
          variables={variables}
          onValueChange={(value) => updateNumericField(
            { kind: 'derived', field: 'carryingCapacity' },
            value,
          )}
        />
      </div>
    </SheetSection>
  )
}
