import { Checkbox } from '../../../../shared/ui'
import {
  FORMULA_FIELD_KEYS,
  characterSheetActions,
} from '../../model'
import { FormulaField } from '../fields'
import styles from '../../CharacterSheetTool.module.css'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetStatsStripProps = {
  group: 'combat' | 'support'
  sheet: CharacterSheetViewModel
}

const derivedStats = [
  {
    field: 'armorClass',
    key: FORMULA_FIELD_KEYS.armorClass,
    label: 'Класс защиты',
    prefixPositive: false,
  },
  {
    field: 'initiative',
    key: FORMULA_FIELD_KEYS.initiative,
    label: 'Инициатива',
    prefixPositive: true,
  },
  {
    field: 'speed',
    key: FORMULA_FIELD_KEYS.speed,
    label: 'Скорость',
    prefixPositive: false,
  },
  {
    field: 'passivePerception',
    key: FORMULA_FIELD_KEYS.passivePerception,
    label: 'Пасс. мудрость',
    prefixPositive: false,
  },
] as const

export function CharacterSheetStatsStrip({
  group,
  sheet,
}: CharacterSheetStatsStripProps) {
  const {
    dispatch,
    document,
    resultFor,
    ruleset,
    updateNumericField,
    variables,
  } = sheet
  const visibleDerivedStats = derivedStats.filter((stat) =>
    group === 'combat'
      ? stat.field !== 'passivePerception'
      : stat.field === 'passivePerception',
  )

  return (
    <section
      aria-label={
        group === 'combat'
          ? 'Боевые показатели персонажа'
          : 'Вспомогательные показатели персонажа'
      }
      className={`${styles.statsStrip} ${
        group === 'combat'
          ? styles.combatStats
          : styles.supportStats
      }`}
    >
      {group === 'support' && (
        <>
          <div
            className={`${styles.statCard} ${styles.inspirationStat}`}
          >
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

          <div className={styles.statCard}>
            <FormulaField
              accessibleLabel="Бонус мастерства"
              defaultFormula={
                ruleset.defaultFormulas[
                  FORMULA_FIELD_KEYS.proficiency
                ]
              }
              label="Мастерство"
              presentation="stat"
              prefixPositive={true}
              result={resultFor(
                FORMULA_FIELD_KEYS.proficiency,
              )}
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
        </>
      )}

      {visibleDerivedStats.map((stat) => (
        <div
          key={stat.field}
          className={
            stat.field === 'armorClass'
              ? styles.armorClassStat
              : styles.statCard
          }
          data-stat={stat.field}
        >
          <FormulaField
            defaultFormula={
              ruleset.defaultFormulas[stat.key]
            }
            label={stat.label}
            presentation={
              stat.field === 'armorClass'
                ? 'shield'
                : 'stat'
            }
            prefixPositive={stat.prefixPositive}
            result={resultFor(stat.key)}
            value={document.derivedStats[stat.field]}
            variables={variables}
            onValueChange={(value) => {
              updateNumericField(
                {
                  field: stat.field,
                  kind: 'derived',
                },
                value,
              )
            }}
          />
        </div>
      ))}
    </section>
  )
}
