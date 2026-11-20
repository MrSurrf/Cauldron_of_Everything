import type { CreatureEntity } from '../model/creature'
import { ListCard } from '../../../shared/ui/ListCard'

export type CreatureReferenceProps = {
  className?: string
  entity: CreatureEntity
}

export function CreatureReference({
  className,
  entity,
}: CreatureReferenceProps) {
  const rating = entity.challengeRating?.split(' ')[0] || '—'

  return (
    <ListCard
      className={className}
      data-entity-id={entity.id}
      data-entity-type={entity.entityType}
      name={entity.name}
      metric={`ПО ${rating}`}
      metricLabel={`Показатель опасности: ${rating}`}
    />
  )
}
