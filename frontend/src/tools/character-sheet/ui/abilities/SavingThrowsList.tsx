import { Checkbox } from '../../../../shared/ui'
import {
  FormulaField,
  type ComputedValueResult,
  type FormulaFieldValue,
} from '../fields'
import { SheetSection } from '../SheetSection'
import styles from './CheckLists.module.css'

export type SavingThrowListItem = {
  defaultFormula?: string
  id: string
  label: string
  proficient: boolean
  result: ComputedValueResult
  value: FormulaFieldValue
}

export type SavingThrowsListProps = {
  items: readonly SavingThrowListItem[]
  onItemChange: (
    id: string,
    patch: Partial<Pick<
      SavingThrowListItem,
      'proficient' | 'value'
    >>,
  ) => void
}

export function SavingThrowsList({
  items,
  onItemChange,
}: SavingThrowsListProps) {
  return (
    <SheetSection
      className={styles.checkSection}
      title="Спасброски"
    >
      <div className={styles.list}>
        {items.map((item) => (
          <div
            key={item.id}
            className={styles.row}
          >
            <Checkbox
              rootClassName={styles.checkControl}
              aria-label={`Владение спасброском: ${item.label}`}
              checked={item.proficient}
              onCheckedChange={(proficient) => {
                onItemChange(item.id, { proficient })
              }}
            />

            <FormulaField
              defaultFormula={item.defaultFormula}
              label={item.label}
              presentation="list"
              prefixPositive={true}
              result={item.result}
              value={item.value}
              onValueChange={(value) => {
                onItemChange(item.id, { value })
              }}
            />
          </div>
        ))}
      </div>
    </SheetSection>
  )
}
