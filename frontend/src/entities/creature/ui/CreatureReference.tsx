import type { CreatureEntity } from '../model/creature'
import { ListCard } from '../../../shared/ui/ListCard'
import { getCreatureTaxonomy } from './creatureFormatting'

export type CreatureReferenceProps = {
  className?: string
  entity: CreatureEntity
}

export function CreatureReference({
  className,
  entity,
}: CreatureReferenceProps) {
  const taxonomy = getCreatureTaxonomy(entity)
  const rating = entity.challengeRating?.split(' ')[0] || '—'

  return (
    <ListCard
      className={className}
      data-entity-id={entity.id}
      data-entity-type={entity.entityType}
      name={entity.name}
      metric={`ПО ${rating}`}
      metricLabel={`Показатель опасности: ${rating}`}
      tags={[taxonomy || entity.nameEn || '']}
    />
  )
}
