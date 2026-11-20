import type { CreatureArmorClass } from '../model/creature'
import styles from './CreatureArmorClassBadge.module.css'

export type CreatureArmorClassBadgeProps = {
  armorClass: CreatureArmorClass
  className?: string
}

export function CreatureArmorClassBadge({
  armorClass,
  className,
}: CreatureArmorClassBadgeProps) {
  const details = armorClass.details?.filter(Boolean) ?? []
  const accessibleName = [
    `Класс доспеха ${armorClass.value}`,
    ...details,
  ].join(', ')

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-label={accessibleName}
    >
      <div className={styles.shield}>
        <span className={styles.label}>КД</span>
        <strong className={styles.value}>{armorClass.value}</strong>
      </div>
      {details.length > 0 && (
        <span className={styles.details}>
          {details.map((detail) => (
            <small key={detail}>{detail}</small>
          ))}
        </span>
      )}
    </div>
  )
}
