import { useState } from 'react'
import { HeartIcon } from '../../../shared/ui/icons/HeartIcon'
import { DiceIcon } from '../../../shared/ui/icons/DiceIcon'
import { getDiceTypeFromExpression } from '../../../shared/ui/icons/dice'
import { Tooltip } from '../../../shared/ui/Tooltip'
import {
  rollDiceExpression,
  type DiceRollResult,
} from '../../../shared/ui/ContentEditor/diceExpression'
import styles from './CreatureHitPointsBadge.module.css'

export function CreatureHitPointsBadge({ hitPoints }: { hitPoints: string }) {
  const [roll, setRoll] = useState<{ source: string; result: DiceRollResult } | null>(null)
  const match = hitPoints.match(/^\s*(\d+)\s*(?:\(([^)]*)\))?\s*$/)
  const value = match?.[1] ?? hitPoints
  const details = match?.[2]
  const expression = details?.replace(/[кК]/g, 'd') ?? ''
  const isFormula = /^(?:\d*[dD]\d+)(?:\s*[+-]\s*(?:\d*[dD]\d+|\d+))*$/.test(expression.trim())
  const result = roll?.source === hitPoints ? roll.result : null

  return (
    <div className={styles.root} aria-label={`Хиты ${hitPoints}`}>
      <div className={styles.heart}>
        <HeartIcon />
        <span className={styles.label}>Хиты</span>
        <strong className={styles.value}>{value}</strong>
      </div>
      {details && (
        <div className={styles.details}>
          {isFormula ? (
            <Tooltip content={result ? 'Нажмите, чтобы перебросить хиты' : 'Нажмите, чтобы бросить хиты'}>
              <button
                type="button"
                className={styles.formula}
                aria-label={`Бросить хиты ${details}`}
                onClick={() => setRoll({ source: hitPoints, result: rollDiceExpression(expression) })}
              >
                <DiceIcon type={getDiceTypeFromExpression(expression) ?? 'd20'} />
                <span>({details})</span>
              </button>
            </Tooltip>
          ) : <small>({details})</small>}
          <output className={styles.result} aria-live="polite">
            {result && (result.status === 'ok' ? `Хиты: ${result.total}` : result.error)}
          </output>
        </div>
      )}
    </div>
  )
}
