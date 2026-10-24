import {
  NumericEditor,
  type ComputedValueResult,
  type FormulaFieldValue,
} from './fields'
import { SheetSection } from './SheetSection'
import styles from './CurrencyBlock.module.css'

export type CurrencyField = {
  id: string
  label: string
  result: ComputedValueResult
  value: FormulaFieldValue
}

export type CurrencyBlockProps = {
  fields: readonly CurrencyField[]
  frame?: 'default' | 'none'
  onFieldChange: (
    id: string,
    value: FormulaFieldValue,
  ) => void
}

export function CurrencyBlock({
  fields,
  frame = 'default',
  onFieldChange,
}: CurrencyBlockProps) {
  const row = (
    <div className={styles.currencyRow} data-currency-row>
      <h2 className={styles.title}>Деньги</h2>
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
    </div>
  )

  return frame === 'none' ? row : (
    <SheetSection aria-label="Деньги" className={styles.currencyBlock}>
      {row}
    </SheetSection>
  )
}
