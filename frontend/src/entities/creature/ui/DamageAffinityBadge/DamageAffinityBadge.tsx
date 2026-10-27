import type { CSSProperties } from 'react'

import { Tooltip } from '../../../../shared/ui/Tooltip'
import type {
  DamageAffinityState,
  DamageType,
} from '../../model/creature'
import shieldIcon from './assets/shield.svg'
import { damageTypePresentation } from './damageTypePresentation'
import styles from './DamageAffinityBadge.module.css'

export type DamageAffinityBadgeProps = {
  className?: string
  damageType: DamageType
  physicalState?: DamageAffinityState
  magicalState?: DamageAffinityState
}

type BadgeStyle = CSSProperties & {
  '--damage-color': string
  '--damage-icon': string
  '--glyph-rotation': string
  '--glyph-flip-x': number
  '--shield-icon': string
  '--glyph-scale': number
}

type MarkerKind =
  | 'physical-vulnerability'
  | 'magical-vulnerability'
  | 'physical-resistance'
  | 'magical-resistance'

const stateLabels: Record<
  Exclude<DamageAffinityState, 'normal'>,
  string
> = {
  vulnerability: 'уязвимость',
  resistance: 'сопротивление',
  immunity: 'иммунитет',
}

function getTooltipText(
  damageType: DamageType,
  physicalState: DamageAffinityState,
  magicalState: DamageAffinityState,
) {
  const { label } = damageTypePresentation[damageType]
  const effects: string[] = []

  if (physicalState !== 'normal') {
    effects.push(
      `физический источник — ${stateLabels[physicalState]}`,
    )
  }

  if (magicalState !== 'normal') {
    effects.push(
      `магический источник — ${stateLabels[magicalState]}`,
    )
  }

  if (effects.length === 0) {
    return `${label}. Нет уязвимости, сопротивления или иммунитета.`
  }

  return `${label}: ${effects.join('; ')}.`
}

function getMarkers(
  physicalState: DamageAffinityState,
  magicalState: DamageAffinityState,
) {
  const top: MarkerKind[] = []
  const bottom: MarkerKind[] = []

  if (physicalState === 'resistance') {
    top.push('physical-resistance')
  }

  if (magicalState === 'resistance') {
    top.push('magical-resistance')
  }

  if (physicalState === 'vulnerability') {
    bottom.push('physical-vulnerability')
  }

  if (magicalState === 'vulnerability') {
    bottom.push('magical-vulnerability')
  }

  return { bottom, top }
}

export function DamageAffinityBadge({
  className,
  damageType,
  physicalState = 'normal',
  magicalState = 'normal',
}: DamageAffinityBadgeProps) {
  const presentation =
    damageTypePresentation[damageType]
  const markers = getMarkers(
    physicalState,
    magicalState,
  )
  const tooltipText = getTooltipText(
    damageType,
    physicalState,
    magicalState,
  )
  const rootClassName = [styles.root, className]
    .filter(Boolean)
    .join(' ')
  const style: BadgeStyle = {
    '--damage-color': presentation.color,
    '--damage-icon': `url("${presentation.icon}")`,
    '--glyph-rotation': `${presentation.rotation ?? 0}deg`,
    '--glyph-flip-x': presentation.flipX ? -1 : 1,
    '--shield-icon': `url("${shieldIcon}")`,
    '--glyph-scale': presentation.scale,
  }

  return (
    <Tooltip content={tooltipText} openDelay={180}>
      <span
        className={rootClassName}
        style={style}
        role="img"
        tabIndex={0}
        aria-label={tooltipText}
        data-damage-type={damageType}
        data-physical-state={physicalState}
        data-magical-state={magicalState}
      >
        <span
          className={`${styles.glow} ${styles.physicalGlow}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.glow} ${styles.magicalGlow}`}
          aria-hidden="true"
        />
        <span className={styles.shield} aria-hidden="true" />
        <span className={styles.glyph} aria-hidden="true" />

        {markers.top.length > 0 && (
          <span
            className={`${styles.markers} ${styles.markersTop}`}
            aria-hidden="true"
          >
            {markers.top.map((marker) => (
              <span
                key={marker}
                className={styles.marker}
                data-marker={marker}
              />
            ))}
          </span>
        )}

        {markers.bottom.length > 0 && (
          <span
            className={`${styles.markers} ${styles.markersBottom}`}
            aria-hidden="true"
          >
            {markers.bottom.map((marker) => (
              <span
                key={marker}
                className={styles.marker}
                data-marker={marker}
              />
            ))}
          </span>
        )}
      </span>
    </Tooltip>
  )
}
