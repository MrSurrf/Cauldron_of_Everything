import { ScrollArea } from '../../../../shared/ui'
import type { ProficiencyRank } from '../../model'
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
  id: string
  label: string
  rank: ProficiencyRank
  result: ComputedValueResult
  value: FormulaFieldValue
}

export type SkillsListProps = {
  fill?: boolean
  items: readonly SkillListItem[]
  onItemChange: (
    id: string,
    patch: Partial<Pick<
      SkillListItem,
      'rank' | 'value'
    >>,
  ) => void
}

const rankLabels: Readonly<
  Record<ProficiencyRank, string>
> = {
  none: 'Нет владения',
  half: 'Половинное владение',
  proficient: 'Владение',
  expertise: 'Экспертиза',
}

function getNextRank(
  rank: ProficiencyRank,
): ProficiencyRank {
  switch (rank) {
    case 'none':
    case 'half':
      return 'proficient'
    case 'proficient':
      return 'expertise'
    case 'expertise':
      return 'none'
  }
}

export function SkillsList({
  fill = false,
  items,
  onItemChange,
}: SkillsListProps) {
  const list = (
    <div className={styles.list}>
      {items.map((item) => {
        const rank = item.rank

        return (
          <div
            key={item.id}
            className={styles.skillRow}
            data-skill-row={item.id}
            data-rank={rank}
            title={`${item.label}. ${rankLabels[rank]}. Нажмите, чтобы изменить владение.`}
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
                rank: getNextRank(rank),
              })
            }}
          >
            <span
              aria-hidden={true}
              className={styles.rankMarker}
              data-rank={rank}
            />

            <FormulaField
              accessibleLabel={`${item.label} (${item.ability})`}
              defaultFormula={item.defaultFormula}
              label={item.label}
              labelDetail={item.ability}
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
        )
      })}
    </div>
  )

  return (
    <SheetSection
      className={styles.checkSection}
      data-fill={fill || undefined}
      title="Навыки"
    >
      {fill ? (
        <ScrollArea
          aria-label="Навыки"
          orientation="vertical"
          rootClassName={styles.checkScrollArea}
        >
          {list}
        </ScrollArea>
      ) : list}
    </SheetSection>
  )
}
