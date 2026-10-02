import {
  FORMULA_FIELD_KEYS,
  attackBonusFormulaVariable,
  characterSheetActions,
  createClientId,
  hitDieFormulaVariable,
  manualNumericField,
  type AttackEntry,
} from '../../model'
import { DeathSavesBlock } from '../DeathSavesBlock'
import { FormulaField } from '../fields'
import { HitDiceBlock } from '../HitDiceBlock'
import { HitPointsBlock } from '../HitPointsBlock'
import { ContentEditor } from '../../../../shared/ui'
import { createResourceMaximumEvaluator } from './resourceMaximumEvaluator'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetCenterColumnProps = {
  sheet: CharacterSheetViewModel
}

function displayAttackBonus(value: number | null) {
  if (value === null) return ''
  return value >= 0 ? `+${value}` : String(value)
}

function attacksToText(
  attacks: readonly AttackEntry[],
  bonusFor: (attack: AttackEntry) => number | null,
) {
  return attacks
    .map((attack) => {
      const bonus = displayAttackBonus(bonusFor(attack))
      const damage = [attack.damage, attack.damageType]
        .filter(Boolean)
        .join(' · ')
      const summary = [
        bonus ? `Бонус атаки: ${bonus}` : '',
        damage ? `Урон: ${damage}` : '',
      ].filter(Boolean)

      return [
        `### ${attack.name || 'Атака'}`,
        summary.join(' · '),
        attack.notes,
      ].filter(Boolean).join('\n')
    })
    .join('\n\n')
}

export function CharacterHitPointsSection({
  sheet,
}: CharacterSheetCenterColumnProps) {
  const {
    document,
    isSectionOpen,
    resultFor,
    setSectionOpen,
    updateNumericField,
    valueFor,
    variables,
  } = sheet

  return (
    <HitPointsBlock
      compact={true}
      current={valueFor(FORMULA_FIELD_KEYS.currentHitPoints)}
      maximum={valueFor(FORMULA_FIELD_KEYS.maximumHitPoints)}
      temporary={valueFor(FORMULA_FIELD_KEYS.temporaryHitPoints)}
      open={isSectionOpen('hit-points')}
      renderField={(field, label) => {
        const key = {
          current: FORMULA_FIELD_KEYS.currentHitPoints,
          maximum: FORMULA_FIELD_KEYS.maximumHitPoints,
          temporary: FORMULA_FIELD_KEYS.temporaryHitPoints,
        }[field]

        return (
          <FormulaField
            compact={true}
            label={label}
            presentation="stat"
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
  )
}

export function CharacterHitDiceSection({
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
    <HitDiceBlock
      compact={true}
      fill={true}
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
  )
}

export function CharacterDeathSavesSection({
  sheet,
}: CharacterSheetCenterColumnProps) {
  const {
    dispatch,
    document,
    isSectionOpen,
    setSectionOpen,
  } = sheet

  return (
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
  )
}

export function CharacterAttacksSection({
  sheet,
}: CharacterSheetCenterColumnProps) {
  const {
    dispatch,
    document,
    valueFor,
  } = sheet

  return (
    <SheetSection contentLayout="editor" title="Атаки и заклинания">
      <ContentEditor
        evaluateResourceMaximum={createResourceMaximumEvaluator(sheet)}
        accessibleLabel="Атаки и заклинания"
        fill={true}
        renderPreview={true}
        showStructureActions={true}
        placeholder="Оружие, заклинания, бонусы атаки и урон..."
        rows={3}
        value={
          document.attacksContentText ??
          attacksToText(document.attacks, (attack) =>
            valueFor(attackBonusFormulaVariable(attack.id)),
          )
        }
        onValueChange={(value) => {
          dispatch(
            characterSheetActions.setAttacksContentText(value),
          )
        }}
      />
    </SheetSection>
  )
}
