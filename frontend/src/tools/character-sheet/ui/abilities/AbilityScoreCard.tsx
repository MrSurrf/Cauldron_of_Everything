import {
  FormulaField,
  type ComputedValueResult,
  type FormulaFieldValue,
} from '../fields'
import styles from './AbilityScoreCard.module.css'

export type AbilityScoreCardProps = {
  abbreviation: string
  label: string
  modifier: FormulaFieldValue
  modifierDefaultFormula?: string
  modifierResult: ComputedValueResult
  onModifierChange: (value: FormulaFieldValue) => void
  onScoreChange: (value: FormulaFieldValue) => void
  score: FormulaFieldValue
  scoreResult: ComputedValueResult
}

export function AbilityScoreCard({
  abbreviation,
  label,
  modifier,
  modifierDefaultFormula,
  modifierResult,
  onModifierChange,
  onScoreChange,
  score,
  scoreResult,
}: AbilityScoreCardProps) {
  return (
    <article
      className={styles.card}
      aria-label={label}
    >
      <header className={styles.header}>
        <span className={styles.label}>
          {label}
        </span>
        <span
          className={styles.abbreviation}
          aria-hidden="true"
        >
          ({abbreviation})
        </span>
      </header>

      <div className={styles.fields}>
        <FormulaField
          className={styles.modifierField}
          accessibleLabel={`${label}: модификатор`}
          defaultFormula={modifierDefaultFormula}
          labelVisibility="sr-only"
          label="Модификатор"
          prefixPositive={true}
          value={modifier}
          result={modifierResult}
          variables={[
            { key: abbreviation, label },
          ]}
          onValueChange={onModifierChange}
        />

        <FormulaField
          className={styles.scoreField}
          accessibleLabel={`${label}: значение`}
          labelVisibility="sr-only"
          label="Значение"
          value={score}
          result={scoreResult}
          onValueChange={onScoreChange}
        />
      </div>
    </article>
  )
}
