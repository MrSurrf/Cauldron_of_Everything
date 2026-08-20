import {
  FORMULA_FIELD_KEYS,
  attackBonusFormulaVariable,
  createClientId,
  hitDieFormulaVariable,
  manualNumericField,
} from '../../model'
import { AttacksTable } from '../AttacksTable'
import { DeathSavesBlock } from '../DeathSavesBlock'
import { FormulaField } from '../fields'
import { HitDiceBlock } from '../HitDiceBlock'
import { HitPointsBlock } from '../HitPointsBlock'
import styles from '../../CharacterSheetTool.module.css'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetCenterColumnProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterSheetCenterColumn({
  sheet,
}: CharacterSheetCenterColumnProps) {
  const {
    dispatch,
    document,
    isSectionOpen,
    resultFor,
    setSectionOpen,
    updateNumericField,
    valueFor,
    variables,
  } = sheet

  return (
    <div className={styles.column}>
      <div className={styles.vitalsGrid}>
      <HitPointsBlock
        current={valueFor(
          FORMULA_FIELD_KEYS.currentHitPoints,
        )}
        maximum={valueFor(
          FORMULA_FIELD_KEYS.maximumHitPoints,
        )}
        temporary={valueFor(
          FORMULA_FIELD_KEYS.temporaryHitPoints,
        )}
        open={isSectionOpen('hit-points')}
        renderField={(field, label) => {
          const key = {
            current: FORMULA_FIELD_KEYS.currentHitPoints,
            maximum: FORMULA_FIELD_KEYS.maximumHitPoints,
            temporary: FORMULA_FIELD_KEYS.temporaryHitPoints,
          }[field]

          return (
            <FormulaField
              label={label}
              result={resultFor(key)}
              value={document.hitPoints[field]}
              variables={variables}
              onValueChange={(value) => {
                updateNumericField(
                  { kind: 'hitPoints', field },
                  value,
                )
              }}
            />
          )
        }}
        onOpenChange={(open) => {
          setSectionOpen('hit-points', open)
        }}
      />

      <HitDiceBlock
        open={isSectionOpen('hit-dice')}
        pools={document.hitDice.map((pool) => ({
          die: pool.die,
          id: pool.id,
          remaining: valueFor(
            hitDieFormulaVariable(pool.id, 'current'),
          ),
          total: valueFor(
            hitDieFormulaVariable(pool.id, 'maximum'),
          ),
        }))}
        renderPoolField={(pool, field, label) => {
          const source = document.hitDice.find(
            (item) => item.id === pool.id,
          )
          if (!source) return null

          const sourceField =
            field === 'remaining' ? 'current' : 'maximum'
          const key = hitDieFormulaVariable(
            source.id,
            sourceField,
          )

          return (
            <FormulaField
              accessibleLabel={`${label}: ${pool.die}, пул ${
                document.hitDice.findIndex(
                  (item) => item.id === pool.id,
                ) + 1
              }`}
              label={label}
              result={resultFor(key)}
              value={source[sourceField]}
              variables={variables}
              onValueChange={(value) => {
                updateNumericField(
                  {
                    field: sourceField,
                    kind: 'hitDice',
                    poolId: source.id,
                  },
                  value,
                )
              }}
            />
          )
        }}
        onAdd={() => {
          dispatch({
            type: 'hitDice/add',
            value: {
              current: manualNumericField(1),
              die: 'd8',
              id: createClientId('hit-die'),
              maximum: manualNumericField(1),
            },
          })
        }}
        onPoolChange={(id, patch) => {
          const pool = document.hitDice.find(
            (item) => item.id === id,
          )
          if (!pool) return

          if (patch.die !== undefined) {
            dispatch({
              type: 'hitDice/update',
              id,
              patch: { die: patch.die },
            })
          }
          if (patch.remaining !== undefined) {
            updateNumericField(
              {
                field: 'current',
                kind: 'hitDice',
                poolId: id,
              },
              {
                ...pool.current,
                manualValue: patch.remaining,
                mode: 'manual',
              },
            )
          }
          if (patch.total !== undefined) {
            updateNumericField(
              {
                field: 'maximum',
                kind: 'hitDice',
                poolId: id,
              },
              {
                ...pool.maximum,
                manualValue: patch.total,
                mode: 'manual',
              },
            )
          }
        }}
        onPoolRemove={(id) => {
          dispatch({ type: 'hitDice/remove', id })
        }}
        onOpenChange={(open) => {
          setSectionOpen('hit-dice', open)
        }}
      />

      <DeathSavesBlock
        failures={document.deathSaves.failures}
        open={isSectionOpen('death-saves')}
        successes={document.deathSaves.successes}
        onChange={(value) => {
          dispatch({ type: 'deathSaves/set', value })
        }}
        onOpenChange={(open) => {
          setSectionOpen('death-saves', open)
        }}
      />
      </div>

      <AttacksTable
        open={isSectionOpen('attacks')}
        attacks={document.attacks.map((attack) => ({
          attackBonus: String(
            valueFor(
              attackBonusFormulaVariable(attack.id),
            ) ?? '',
          ),
          damage: attack.damage,
          damageType: attack.damageType,
          id: attack.id,
          name: attack.name,
          notes: attack.notes,
        }))}
        renderAttackBonus={(attack) => {
          const source = document.attacks.find(
            (item) => item.id === attack.id,
          )
          if (!source) return null
          const key = attackBonusFormulaVariable(source.id)

          return (
            <FormulaField
              accessibleLabel={`Бонус атаки: ${
                source.name || 'без названия'
              }`}
              label="Бонус"
              prefixPositive={true}
              result={resultFor(key)}
              value={source.attackBonus}
              variables={variables}
              onValueChange={(value) => {
                updateNumericField(
                  {
                    attackId: source.id,
                    kind: 'attack',
                  },
                  value,
                )
              }}
            />
          )
        }}
        onAdd={() => {
          dispatch({
            type: 'attack/add',
            value: {
              attackBonus: manualNumericField(0),
              damage: '',
              damageType: '',
              id: createClientId('attack'),
              itemId: null,
              name: `Новая атака ${document.attacks.length + 1}`,
              notes: '',
            },
          })
        }}
        onAttackChange={(id, patch) => {
          dispatch({
            type: 'attack/update',
            id,
            patch: {
              ...(patch.name !== undefined
                ? { name: patch.name }
                : {}),
              ...(patch.damage !== undefined
                ? { damage: patch.damage }
                : {}),
              ...(patch.damageType !== undefined
                ? { damageType: patch.damageType }
                : {}),
              ...(patch.notes !== undefined
                ? { notes: patch.notes }
                : {}),
            },
          })
        }}
        onAttackRemove={(id) => {
          dispatch({ type: 'attack/remove', id })
        }}
        onOpenChange={(open) => {
          setSectionOpen('attacks', open)
        }}
      />

    </div>
  )
}
