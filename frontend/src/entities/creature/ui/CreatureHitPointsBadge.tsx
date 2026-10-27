import { useState } from 'react'
import type { CSSProperties } from 'react'
import { DiceIcon } from '../../../shared/ui/icons/DiceIcon'
import { getDiceTypeFromExpression } from '../../../shared/ui/icons/dice'
import { Tooltip } from '../../../shared/ui/Tooltip'
import {
  rollDiceExpression,
  type DiceRollResult,
} from '../../../shared/ui/ContentEditor/diceExpression'
import styles from './CreatureHitPointsBadge.module.css'
import { getCreatureHitPointsFrame } from './creatureHitPointsBadge/creatureHitPointsFrames'

export type CreatureHitPointsBadgeProps = {
  creatureType?: string
  hitPoints: string
}

type FrameStyle = CSSProperties & {
  '--creature-hp-frame': string
  '--creature-hp-value-x': string
  '--creature-hp-value-y': string
}

export function CreatureHitPointsBadge({ creatureType, hitPoints }: CreatureHitPointsBadgeProps) {
  const [roll, setRoll] = useState<{ source: string; result: DiceRollResult } | null>(null)
  const match = hitPoints.match(/^\s*(\d+)\s*(?:\(([^)]*)\))?\s*$/)
  const value = match?.[1] ?? hitPoints
  const details = match?.[2]
  const expression = details?.replace(/[кК]/g, 'd') ?? ''
  const isFormula = /^(?:\d*[dD]\d+)(?:\s*[+-]\s*(?:\d*[dD]\d+|\d+))*$/.test(expression.trim())
  const result = roll?.source === hitPoints ? roll.result : null
  const frame = getCreatureHitPointsFrame(creatureType)
  const frameStyle: FrameStyle = {
    '--creature-hp-frame': `url("${frame.source}")`,
    '--creature-hp-value-x': `${frame.valueCenter.x}%`,
    '--creature-hp-value-y': `${frame.valueCenter.y}%`,
  }

  return (
    <div
      className={styles.root}
      aria-label={`Хиты ${hitPoints}`}
      data-creature-hp-frame={frame.type}
    >
      <span className={styles.label} data-creature-hp-label>Хиты</span>
      <div className={styles.heart} data-creature-hp-shape style={frameStyle}>
        <span aria-hidden="true" className={styles.frame} />
        <strong className={styles.value} data-creature-hp-value>{value}</strong>
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
