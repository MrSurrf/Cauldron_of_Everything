export type EntityType = 'creature' | 'class' | 'race' | 'background' | 'feat' | 'spell' | 'item' | 'sidekick' | 'reference' | 'character' | 'npc' | 'campaign'

export type EntityReference = {
  entityId: string
  entityType: EntityType
}

export type BaseEntity<
  TType extends EntityType = EntityType,
> = {
  id: string
  entityType: TType
  slug: string
  name: string
  nameEn?: string
}
