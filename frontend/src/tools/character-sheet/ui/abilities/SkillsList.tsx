import { Checkbox } from '../../../../shared/ui'
import {
  FormulaField,
  type ComputedValueResult,
  type FormulaFieldValue,
} from '../fields'
import { SheetSection } from '../SheetSection'
import styles from './CheckLists.module.css'

export type SkillListItem = {
  ability: string
  defaultFormula?: string
  expertise: boolean
  id: string
  label: string
  proficient: boolean
  result: ComputedValueResult
  value: FormulaFieldValue
}

export type SkillsListProps = {
  items: readonly SkillListItem[]
  onItemChange: (
    id: string,
    patch: Partial<Pick<
      SkillListItem,
      'expertise' | 'proficient' | 'value'
    >>,
  ) => void
}

export function SkillsList({
  items,
  onItemChange,
}: SkillsListProps) {
  return (
    <SheetSection
      className={styles.checkSection}
      title="Навыки"
    >
      <div className={styles.list}>
        {items.map((item) => (
          <div
            key={item.id}
            className={styles.skillRow}
          >
            <div className={styles.proficiencies}>
              <Checkbox
                rootClassName={styles.checkControl}
                aria-label={`Владение навыком: ${item.label}`}
                checked={item.proficient}
                onCheckedChange={(proficient) => {
                  onItemChange(item.id, {
                    proficient,
                    expertise:
                      proficient
                        ? item.expertise
                        : false,
                  })
                }}
              />

              <Checkbox
                rootClassName={styles.checkControl}
                aria-label={`Экспертиза навыка: ${item.label}`}
                checked={item.expertise}
                disabled={!item.proficient}
                onCheckedChange={(expertise) => {
                  onItemChange(item.id, { expertise })
                }}
              />
            </div>

            <FormulaField
              accessibleLabel={`${item.label} (${item.ability})`}
              defaultFormula={item.defaultFormula}
              label={item.label}
              labelDetail={`(${item.ability})`}
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
