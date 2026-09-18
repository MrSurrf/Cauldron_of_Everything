import type { CreatureEntity } from '../model/creature'
import { getCreatureTaxonomy } from './creatureFormatting'
import styles from './CreatureReference.module.css'

export type CreatureReferenceProps = {
  className?: string
  entity: CreatureEntity
}

export function CreatureReference({
  className,
  entity,
}: CreatureReferenceProps) {
  const rootClassName = [
    styles.root,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const taxonomy = getCreatureTaxonomy(entity)

  return (
    <span
      className={rootClassName}
      data-entity-id={entity.id}
      data-entity-type={entity.entityType}
    >
      <span
        className={styles.mark}
        aria-hidden="true"
      >
        {entity.name.slice(0, 1)}
      </span>
      <span className={styles.content}>
        <strong>{entity.name}</strong>
        {(taxonomy || entity.nameEn) && (
          <small>
            {taxonomy || entity.nameEn}
          </small>
        )}
      </span>
      {entity.challengeRating && (
        <span className={styles.challenge}>
          ПО {entity.challengeRating.split(' ')[0]}
        </span>
      )}
    </span>
  )
}
