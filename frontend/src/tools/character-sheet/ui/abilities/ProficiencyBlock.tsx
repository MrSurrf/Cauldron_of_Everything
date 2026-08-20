import { Checkbox } from '../../../../shared/ui'
import {
  FormulaField,
  type ComputedValueResult,
  type FormulaFieldValue,
} from '../fields'
import { SheetSection } from '../SheetSection'
import styles from './ProficiencyBlock.module.css'

export type ProficiencyBlockProps = {
  inspiration: boolean
  onInspirationChange: (checked: boolean) => void
  onProficiencyChange: (value: FormulaFieldValue) => void
  proficiency: FormulaFieldValue
  proficiencyDefaultFormula?: string
  proficiencyResult: ComputedValueResult
}

export function ProficiencyBlock({
  inspiration,
  onInspirationChange,
  onProficiencyChange,
  proficiency,
  proficiencyDefaultFormula,
  proficiencyResult,
}: ProficiencyBlockProps) {
  return (
    <SheetSection title="Основные бонусы">
      <div className={styles.content}>
        <Checkbox
          checked={inspiration}
          label="Вдохновение"
          onCheckedChange={onInspirationChange}
        />

        <FormulaField
          defaultFormula={proficiencyDefaultFormula}
          label="Бонус мастерства"
          prefixPositive={true}
          result={proficiencyResult}
          value={proficiency}
          variables={[
            { key: 'LEVEL', label: 'Уровень' },
          ]}
          onValueChange={onProficiencyChange}
        />
      </div>
    </SheetSection>
  )
}
