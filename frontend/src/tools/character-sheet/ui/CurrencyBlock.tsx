import {
  NumericEditor,
  type ComputedValueResult,
  type FormulaFieldValue,
} from './fields'
import { SheetSection } from './SheetSection'
import styles from './stats.module.css'

export type CurrencyField = {
  id: string
  label: string
  result: ComputedValueResult
  value: FormulaFieldValue
}

export type CurrencyBlockProps = {
  fields: readonly CurrencyField[]
  onFieldChange: (
    id: string,
    value: FormulaFieldValue,
  ) => void
}

export function CurrencyBlock({
  fields,
  onFieldChange,
}: CurrencyBlockProps) {
  return (
    <SheetSection
      className={styles.currencyBlock}
      title="Деньги"
    >
      <div className={styles.currencyGrid}>
        {fields.map((field) => {
          const displayedValue =
            field.result.status === 'ok'
              ? field.result.value
              : field.value.manualValue

          return (
            <label
              key={field.id}
              className={styles.currencyField}
            >
              <span className={styles.currencyLabel}>
                {field.label}
              </span>
              <NumericEditor
                aria-label={field.label}
                value={displayedValue}
                onValueChange={(manualValue) => {
                  onFieldChange(field.id, {
                    formulaOverride: null,
                    manualValue,
                    mode: 'manual',
                  })
                }}
              />
            </label>
          )
        })}
      </div>
    </SheetSection>
  )
}
