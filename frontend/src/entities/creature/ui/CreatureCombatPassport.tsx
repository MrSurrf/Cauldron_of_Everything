import { visionTypeLabels } from '../../../shared/model'
import typography from '../../../shared/styles/entityTypography.module.css'
import { PlaceholderIcon } from '../../../shared/ui/icons/PlaceholderIcon'
import { VisionIcon } from '../../../shared/ui/icons/VisionIcon'
import type { CreatureEntity } from '../model/creature'
import { formatCreatureSpeeds } from './creatureFormatting'
import { CreatureArmorClassBadge } from './CreatureArmorClassBadge'
import { CreatureHitPointsBadge } from './CreatureHitPointsBadge'
import styles from './CreatureFullView.module.css'

/** Общий боевой паспорт для полной и компактной карточок существа. */
export function CreatureCombatPassport({ entity }: { entity: CreatureEntity }) {
  const speeds = formatCreatureSpeeds(entity.speed)
  const hasSenses = Boolean(entity.vision?.length || entity.senses?.length || entity.passivePerception != null)
  const hasVitals = Boolean(entity.armorClass || entity.hitPoints)
  return <div className={styles.passport} data-has-vitals={hasVitals}>
    {hasVitals && <dl className={styles.vitals}>
      {entity.armorClass && <div className={`${styles.armorClassVital} ${styles.armorAlignment}`}>
        <dt className={styles.srOnly}>Класс доспеха</dt>
        <dd><CreatureArmorClassBadge armorClass={entity.armorClass} /></dd>
      </div>}
      {entity.hitPoints && <div className={styles.armorClassVital}>
        <dt className={styles.srOnly}>Хиты</dt>
        <dd><CreatureHitPointsBadge creatureType={entity.creatureType} hitPoints={entity.hitPoints} /></dd>
      </div>}
    </dl>}
    {(speeds.length > 0 || hasSenses) && <dl className={styles.mobility}>
      {speeds.length > 0 && <div>
        <dt className={typography.subsectionLabel}><span className={styles.detailIcon} aria-hidden="true"><PlaceholderIcon /></span><span className={styles.detailLabelText}>Скорость</span></dt>
        <dd className={styles.speedList}>{speeds.map((speed, index) => <span className={styles.speed} key={index}>
          <strong>{speed.value}</strong>{speed.label && <small>{speed.label}</small>}
        </span>)}</dd>
      </div>}
      {hasSenses && <div>
        <dt className={typography.subsectionLabel}><span className={styles.detailIcon} aria-hidden="true"><PlaceholderIcon /></span><span className={styles.detailLabelText}>Чувства</span></dt>
        <dd className={styles.sensesList}>
          {entity.vision?.map(sense => <span className={styles.visionSense} key={`${sense.type}-${sense.range ?? 'unlimited'}`}>
            <VisionIcon type={sense.type} /><span><span>{visionTypeLabels[sense.type]}</span>{sense.range != null && <strong>{sense.range} фт.</strong>}</span>
          </span>)}
          {entity.senses?.map(sense => <span className={styles.senseNote} key={sense}>{sense}</span>)}
          {entity.passivePerception != null && <span className={styles.passivePerception}>
            <VisionIcon type="normal" /><span>Пассивная внимательность</span><strong>{entity.passivePerception}</strong>
          </span>}
        </dd>
      </div>}
    </dl>}
  </div>
}
