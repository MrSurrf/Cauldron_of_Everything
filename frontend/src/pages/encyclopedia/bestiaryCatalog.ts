import type { CreatureEntity } from '../../entities/creature'

export type CatalogCreature = {
  id: number
  slug: string
  name: string
  nameEn: string
  challengeRating: string
  size: string
  creatureType: string
  alignment: string
  sources: string[]
  homebrew: boolean
  namedNpc: boolean | null
  languages: string[]
  habitats: string[]
  movements: string[]
  contentText: string
  fullRecord?: boolean
  entity: CreatureEntity
}
