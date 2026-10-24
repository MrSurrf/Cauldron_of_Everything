import { Panel } from '../../../shared/ui/Panel'
import type { CreatureEntity } from '../model/creature'
import { getCreatureTaxonomy, hasCreatureCombatPassport } from './creatureFormatting'
import { CreatureCombatPassport } from './CreatureCombatPassport'
import styles from './CreatureCompactCard.module.css'

export type CreatureCompactCardProps = {
  className?: string
  entity: CreatureEntity
}

export function CreatureCompactCard({
  className,
  entity,
}: CreatureCompactCardProps) {
  const rootClassName = [
    styles.root,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const taxonomy = getCreatureTaxonomy(entity)

  return (
    <article
      className={rootClassName}
      aria-label={entity.name}
      data-entity-id={entity.id}
      data-entity-type={entity.entityType}
    >
      <Panel padding="compact">
        <header className={styles.header}>
          <span
            className={styles.mark}
            aria-hidden="true"
          >
            {entity.name.slice(0, 1)}
          </span>
          <span className={styles.heading}>
            <strong>{entity.name}</strong>
            {entity.nameEn && (
              <small>{entity.nameEn}</small>
            )}
          </span>
          {entity.challengeRating && (
            <span className={styles.challenge}>
              <small>ПО</small>
              <strong>
                {entity.challengeRating.split(' ')[0]}
              </strong>
            </span>
          )}
        </header>

        {taxonomy && (
          <p className={styles.taxonomy}>{taxonomy}</p>
        )}

        {hasCreatureCombatPassport(entity) && <section className={styles.passport} aria-label="Боевой паспорт">
          <h3>Боевой паспорт</h3>
          <div className={styles.passportBody}><CreatureCombatPassport entity={entity} /></div>
        </section>}
      </Panel>
    </article>
  )
}
