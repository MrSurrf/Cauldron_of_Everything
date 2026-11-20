import { Checkbox } from '../../../../shared/ui'
import {
  FORMULA_FIELD_KEYS,
  characterSheetActions,
} from '../../model'
import { FormulaField } from '../fields'
import styles from '../../CharacterSheetTool.module.css'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetStatKey =
  | 'armorClass'
  | 'initiative'
  | 'inspiration'
  | 'passivePerception'
  | 'proficiency'
  | 'speed'

export type CharacterSheetStatProps = {
  className?: string
  compact?: boolean
  presentation?: 'list' | 'stat'
  sheet: CharacterSheetViewModel
  stat: CharacterSheetStatKey
}

const derivedStats = {
  armorClass: {
    field: 'armorClass',
    key: FORMULA_FIELD_KEYS.armorClass,
    label: 'КД',
    prefixPositive: false,
  },
  initiative: {
    field: 'initiative',
    key: FORMULA_FIELD_KEYS.initiative,
    label: 'Инициатива',
    prefixPositive: true,
  },
  passivePerception: {
    field: 'passivePerception',
    key: FORMULA_FIELD_KEYS.passivePerception,
    label: 'Пассивное восприятие',
    prefixPositive: false,
  },
  speed: {
    field: 'speed',
    key: FORMULA_FIELD_KEYS.speed,
    label: 'Скорость',
    prefixPositive: false,
  },
} as const

export function CharacterSheetStat({
  className,
  compact = false,
  presentation,
  sheet,
  stat,
}: CharacterSheetStatProps) {
  const {
    dispatch,
    document,
    resultFor,
    ruleset,
    updateNumericField,
    variables,
  } = sheet
  const rootClassName = [
    styles.statCard,
    stat === 'armorClass'
      ? styles.armorClassStat
      : undefined,
    stat === 'inspiration' ? styles.inspirationStat : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (stat === 'inspiration') {
    return (
      <div className={rootClassName} data-stat={stat}>
        <span className={styles.statCardLabel}>
          Вдохновение
        </span>
        <Checkbox
          aria-label="Вдохновение"
          checked={document.inspiration}
          rootClassName={styles.inspirationControl}
          onCheckedChange={(value) => {
            dispatch(
              characterSheetActions.setInspiration(value),
            )
          }}
        />
      </div>
    )
  }

  if (stat === 'proficiency') {
    return (
      <div className={rootClassName} data-stat={stat}>
        <FormulaField
          accessibleLabel="Бонус мастерства"
          compact={compact}
          defaultFormula={
            ruleset.defaultFormulas[
              FORMULA_FIELD_KEYS.proficiency
            ]
          }
          label="Бонус мастерства"
          presentation={presentation ?? 'stat'}
          prefixPositive={true}
          result={resultFor(FORMULA_FIELD_KEYS.proficiency)}
          value={document.proficiencyBonus}
          variables={variables}
          onValueChange={(value) => {
            updateNumericField(
              { kind: 'proficiencyBonus' },
              value,
            )
          }}
        />
      </div>
    )
  }

  const meta = derivedStats[stat]

  return (
    <div
      className={rootClassName}
      data-stat={meta.field}
    >
      <FormulaField
        compact={compact}
        defaultFormula={ruleset.defaultFormulas[meta.key]}
        label={meta.label}
        presentation={
          meta.field === 'armorClass'
            ? 'stat'
            : (presentation ?? 'stat')
        }
        prefixPositive={meta.prefixPositive}
        result={resultFor(meta.key)}
        value={document.derivedStats[meta.field]}
        variables={variables}
        onValueChange={(value) => {
          updateNumericField(
            { field: meta.field, kind: 'derived' },
            value,
          )
        }}
      />
    </div>
  )
}
