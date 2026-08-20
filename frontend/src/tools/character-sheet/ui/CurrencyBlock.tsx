import {
  FormulaField,
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
    <SheetSection title="Деньги">
      <div className={styles.currencyGrid}>
        {fields.map((field) => (
          <FormulaField
            key={field.id}
            label={field.label}
            result={field.result}
            value={field.value}
            onValueChange={(value) => {
              onFieldChange(field.id, value)
            }}
          />
        ))}
      </div>
    </SheetSection>
  )
}
