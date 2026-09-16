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
  showScore?: boolean
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
  showScore = true,
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
      </header>

      <div
        className={styles.fields}
        data-score-visible={showScore || undefined}
      >
        <FormulaField
          className={styles.modifierField}
          accessibleLabel={`${label}: модификатор`}
          compact={true}
          defaultFormula={modifierDefaultFormula}
          labelVisibility="sr-only"
          label="Модификатор"
          presentation="stat"
          prefixPositive={true}
          value={modifier}
          result={modifierResult}
          variables={[
            { key: abbreviation, label },
          ]}
          onValueChange={onModifierChange}
        />

        {showScore && (
          <FormulaField
            className={styles.scoreField}
            accessibleLabel={`${label}: значение`}
            compact={true}
            labelVisibility="sr-only"
            label="Значение"
            value={score}
            result={scoreResult}
            onValueChange={onScoreChange}
          />
        )}
      </div>
    </article>
  )
}
