import { useState } from 'react'

import { DiceIcon } from '../../../shared/ui/icons/DiceIcon'
import { SavingThrowIcon } from '../../../shared/ui/icons/SavingThrowIcon'
import { Tooltip } from '../../../shared/ui/Tooltip'
import {
  CREATURE_ABILITY_KEYS,
  type CreatureAbilityKey,
  type CreatureEntity,
} from '../model/creature'
import {
  creatureAbilityLabels,
  formatSignedNumber,
  getAbilityModifier,
} from './creatureFormatting'
import styles from './CreatureAbilitiesPanel.module.css'

export type CreatureAbilitiesPanelProps = {
  abilities: NonNullable<CreatureEntity['abilities']>
  savingThrows?: CreatureEntity['savingThrows']
}

type RollResult = {
  ability: CreatureAbilityKey
  bonus: number
  die: number
  total: number
}

function parseBonus(value: string | undefined) {
  if (!value) return null
  const bonus = Number.parseInt(value, 10)
  return Number.isFinite(bonus) ? bonus : null
}

export function CreatureAbilitiesPanel({
  abilities,
  savingThrows,
}: CreatureAbilitiesPanelProps) {
  const [openAbility, setOpenAbility] = useState<CreatureAbilityKey | null>(null)
  const [rollResult, setRollResult] = useState<RollResult | null>(null)
  const hasSavingThrows = Boolean(
    savingThrows && Object.keys(savingThrows).length > 0,
  )

  return (
    <dl
      className={styles.root}
      aria-label="Характеристики существа"
      data-has-saving-throws={hasSavingThrows || undefined}
    >
      {CREATURE_ABILITY_KEYS.map((abilityKey) => {
        const ability = abilities[abilityKey]
        if (!ability) return null

        const savingThrow = savingThrows?.[abilityKey]
        const savingThrowBonus = parseBonus(savingThrow)
        const labels = creatureAbilityLabels[abilityKey]
        const isOpen = openAbility === abilityKey
        const result = rollResult?.ability === abilityKey ? rollResult : null

        return (
          <div
            className={styles.ability}
            key={abilityKey}
            data-ability={abilityKey}
            data-save-open={isOpen || undefined}
            data-save-result={Boolean(result) || undefined}
          >
            <dt title={labels.label}>{labels.abbreviation}</dt>
            <dd>
              <strong>{ability.score}</strong>
              <span>
                ({formatSignedNumber(
                  ability.modifier ?? getAbilityModifier(ability.score),
                )})
              </span>
            </dd>

            {savingThrow !== undefined && (
              <Tooltip
                content={`Спасбросок ${labels.abbreviation}. ${result ? 'Нажмите, чтобы бросить снова.' : 'Нажмите, чтобы бросить d20.'}`}
                placement="bottom"
              >
                <button
                  className={styles.saveControl}
                  type="button"
                  data-save-control={true}
                  aria-label={result
                    ? `Спасбросок ${labels.abbreviation}: d20 ${result.die} ${result.bonus < 0 ? '−' : '+'} ${Math.abs(result.bonus)} = ${result.total}. Бросить снова`
                    : `Бросить спасбросок ${labels.abbreviation}, d20 ${savingThrow}`}
                  onBlur={() => {
                    if (!result) setOpenAbility(null)
                  }}
                  onFocus={() => setOpenAbility(abilityKey)}
                  onMouseEnter={() => setOpenAbility(abilityKey)}
                  onMouseLeave={() => {
                    if (!result) setOpenAbility(null)
                  }}
                  onClick={() => {
                    if (savingThrowBonus === null) return
                    const die = Math.floor(Math.random() * 20) + 1
                    setRollResult({
                      ability: abilityKey,
                      bonus: savingThrowBonus,
                      die,
                      total: die + savingThrowBonus,
                    })
                    setOpenAbility(abilityKey)
                  }}
                  disabled={savingThrowBonus === null}
                >
                  <span className={styles.saveSummary} aria-hidden={isOpen}>
                    <SavingThrowIcon />
                    <span>{savingThrow}</span>
                  </span>

                  <span
                    className={styles.saveAction}
                    aria-hidden={!isOpen}
                    aria-live={result ? 'polite' : undefined}
                  >
                    <DiceIcon type="d20" />
                    {result ? (
                      <span className={styles.result}>
                        {result.die}{result.bonus < 0 ? '−' : '+'}{Math.abs(result.bonus)}=<strong>{result.total}</strong>
                      </span>
                    ) : (
                      <span className={styles.rollPrompt}>
                        d20 {savingThrow}
                      </span>
                    )}
                  </span>
                </button>
              </Tooltip>
            )}
          </div>
        )
      })}
    </dl>
  )
}
