import { ScrollArea } from '../../../../shared/ui'
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
  fill?: boolean
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
  fill = false,
  items,
  onItemChange,
}: SavingThrowsListProps) {
  const list = (
    <div className={styles.list}>
      {items.map((item) => (
        <div
          key={item.id}
          className={styles.row}
          data-saving-throw-row={item.id}
          data-rank={
            item.proficient ? 'proficient' : 'none'
          }
          title={
            item.proficient
              ? 'Нажмите, чтобы убрать владение.'
              : 'Нажмите, чтобы добавить владение.'
          }
          onClick={(event) => {
            const target = event.target
            if (
              target instanceof Element &&
              target.closest(
                "button, input, textarea, select, a, [contenteditable='true'], [role='button']",
              )
            ) {
              return
            }

            onItemChange(item.id, {
              proficient: !item.proficient,
            })
          }}
        >
          <button
            type="button"
            className={styles.rankButton}
            aria-label={`Владение спасброском: ${item.label}`}
            aria-pressed={item.proficient}
            title={
              item.proficient
                ? 'Убрать владение'
                : 'Добавить владение'
            }
            onClick={() => {
              onItemChange(item.id, {
                proficient: !item.proficient,
              })
            }}
          >
            <span
              aria-hidden={true}
              className={styles.rankMarker}
              data-rank={
                item.proficient
                  ? 'proficient'
                  : 'none'
              }
            />
          </button>

          <FormulaField
            defaultFormula={item.defaultFormula}
            label={item.label}
            presentation="list"
            prefixPositive={true}
            result={item.result}
            signDisplay="compact"
            value={item.value}
            onValueChange={(value) => {
              onItemChange(item.id, { value })
            }}
          />
        </div>
      ))}
    </div>
  )

  return (
    <SheetSection
      className={styles.checkSection}
      data-fill={fill || undefined}
      title="Спасброски"
    >
      {fill ? (
        <ScrollArea
          aria-label="Спасброски"
          orientation="vertical"
          rootClassName={styles.checkScrollArea}
        >
          {list}
        </ScrollArea>
      ) : list}
    </SheetSection>
  )
}
