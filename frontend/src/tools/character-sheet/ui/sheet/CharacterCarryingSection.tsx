import {
  FORMULA_FIELD_KEYS,
  formulaNumericField,
  manualNumericField,
} from '../../model'
import { FormulaField } from '../fields'
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
  const carriedResult = resultFor(FORMULA_FIELD_KEYS.carriedWeight)
  const capacityResult = resultFor(FORMULA_FIELD_KEYS.carryingCapacity)
  const carried = carriedResult.status === 'ok' &&
    Number.isFinite(carriedResult.value)
      ? Math.max(0, carriedResult.value)
      : null
  const capacity = capacityResult.status === 'ok' &&
    Number.isFinite(capacityResult.value)
      ? Math.max(0, capacityResult.value)
      : null
  const hasProgress = carried !== null && capacity !== null
  const progress = hasProgress
    ? capacity > 0
      ? Math.min(100, (carried / capacity) * 100)
      : carried > 0 ? 100 : 0
    : 0

  return (
    <div className={styles.row} data-carrying-row>
      <h2 className={styles.title}>Вес</h2>
      <FormulaField
        className={styles.carriedField}
        compact={true}
        label="Несомый, фн."
        labelVisibility="sr-only"
        result={carriedResult}
        value={document.derivedStats.carriedWeight ?? manualNumericField(0)}
        variables={variables}
        onValueChange={(value) => updateNumericField(
          { kind: 'derived', field: 'carriedWeight' },
          value,
        )}
      />
      <progress
        aria-label="Нагрузка"
        aria-valuetext={hasProgress
          ? `${carried} из ${capacity} фн.`
          : 'Нагрузка недоступна'}
        className={styles.progress}
        data-weight-progress
        max={100}
        value={progress}
      />
      <FormulaField
        className={styles.capacityField}
        compact={true}
        defaultFormula={ruleset.defaultFormulas.CARRYING_CAPACITY}
        label="Предел, фн."
        presentation="stat"
        result={capacityResult}
        value={document.derivedStats.carryingCapacity ?? formulaNumericField(0)}
        variables={variables}
        onValueChange={(value) => updateNumericField(
          { kind: 'derived', field: 'carryingCapacity' },
          value,
        )}
      />
    </div>
  )
}
