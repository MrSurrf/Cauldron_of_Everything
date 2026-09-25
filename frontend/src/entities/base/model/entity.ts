export type EntityType = 'creature'

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
