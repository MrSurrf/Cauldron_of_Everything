import { useState } from 'react'
import type { ReactNode } from 'react'
import { Popover } from '../../../shared/ui/Popover'
import { TextInput } from '../../../shared/ui/TextInput'
import { SavingThrowIcon } from '../../../shared/ui/icons/SavingThrowIcon'
import { describeDiceRoll, rollDiceExpression } from '../../../shared/ui/ContentEditor/diceExpression'
import type { DiceRollResult } from '../../../shared/ui/ContentEditor/diceExpression'
import rollTokenStyles from '../../../shared/ui/ContentEditor/ContentEditor.module.css'
import rollPreviewStyles from '../../../shared/ui/ContentEditor/ContentPreview.module.css'
import type { CreatureFeature } from '../model/creature'
import { creatureAbilityLabels, formatSignedNumber } from './creatureFormatting'
import styles from './CreatureFeatureSections.module.css'

const rollButtonClassName = [
  rollTokenStyles.rollToken,
  rollPreviewStyles.rollToken,
  styles.rollButton,
].join(' ')

export function CreatureRollControl({
  label, formula, children, successAt,
}: {
  label: string
  formula: string
  children: ReactNode
  successAt?: number
}) {
  const [roll, setRoll] = useState<{ result: DiceRollResult; attempt: number } | null>(null)
  const result = roll?.result

  return (
    <div className={styles.roll}>
      <button
        type="button"
        className={rollButtonClassName}
        aria-label={`Бросить: ${label}, ${formula}`}
        onClick={() => setRoll((previous) => ({
          result: rollDiceExpression(formula.replace(/[кК]/g, 'd')),
          attempt: (previous?.attempt ?? 0) + 1,
        }))}
      >
        <span className={styles.rollValue}>{children}</span>
      </button>
      <output className={styles.rollResult} aria-live="polite" aria-label={`Результат: ${label}`}>
        {result && <span key={roll.attempt}>
          {describeDiceRoll(result)}
          {result.status === 'ok' && successAt !== undefined && (
            result.total >= successAt ? ' · Успех' : ' · Неудача'
          )}
        </span>}
      </output>
    </div>
  )
}

export function CreatureSaveControl({ save, name }: {
  save: NonNullable<CreatureFeature['save']>
  name: string
}) {
  const [modifier, setModifier] = useState('0')
  const bonus = Number(modifier)
  const valid = /^[+-]?\d+$/.test(modifier) && Number.isSafeInteger(bonus) && Math.abs(bonus) <= 1000
  const ability = creatureAbilityLabels[save.ability].label

  return (
    <div className={styles.save}>
      <Popover
        aria-label={`Спасбросок цели: ${name}`}
        content={
          <div className={styles.saveDialog}>
            <strong>{ability} · Сл {save.dc}</strong>
            <TextInput
              label="Модификатор спасброска цели"
              value={modifier}
              onChange={(event) => setModifier(event.target.value)}
              error={valid ? undefined : 'Введите целое число от −1000 до 1000'}
              hint="Бросок совершает цель эффекта. Укажите её бонус к спасброску."
            />
            {valid && <CreatureRollControl
              key={`${save.ability}-${save.dc}-${bonus}`}
              label={`${name} — спасбросок цели`}
              formula={`1d20 ${formatSignedNumber(bonus)}`}
              successAt={save.dc}
            >Бросить d20 {formatSignedNumber(bonus)}</CreatureRollControl>}
          </div>
        }
      >
        <button type="button" className={rollButtonClassName}
          aria-label={`Спасбросок цели: ${name}, ${ability}, Сл ${save.dc}`}>
          <span className={styles.rollValue}><SavingThrowIcon />Сл {save.dc}</span>
        </button>
      </Popover>
      <small className={styles.note}>{ability}</small>
    </div>
  )
}
