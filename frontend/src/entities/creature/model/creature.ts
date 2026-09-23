import type { BaseEntity } from '../../base'
import type { VisionSense } from '../../../shared/model'

export const CREATURE_ABILITY_KEYS = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const

export type CreatureAbilityKey =
  (typeof CREATURE_ABILITY_KEYS)[number]

export type CreatureAbilityScore = {
  score: number
  modifier?: number
}

export type CreatureArmorClass = {
  value: number | string
  details?: readonly string[]
}

export const DAMAGE_TYPES = [
  'bludgeoning',
  'piercing',
  'slashing',
  'acid',
  'poison',
  'cold',
  'fire',
  'lightning',
  'thunder',
  'force',
  'necrotic',
  'psychic',
  'radiant',
] as const

export type DamageType =
  (typeof DAMAGE_TYPES)[number]

export type DamageAffinityState =
  | 'normal'
  | 'vulnerability'
  | 'resistance'
  | 'immunity'

export type DamageAffinity = {
  damageType: DamageType
  physical: DamageAffinityState
  magical: DamageAffinityState
}

export type CreatureSectionType =
  | 'traits'
  | 'actions'
  | 'bonus-actions'
  | 'reactions'
  | 'legendary-actions'
  | 'lair-actions'
  | 'regional-effects'
  | 'description'
  | 'custom'

export type CreatureSection = {
  id: string
  type: CreatureSectionType
  title: string
  html: string
}

export type CreatureEntity = BaseEntity<'creature'> & {
  size?: string
  creatureType?: string
  alignment?: string
  armorClass?: CreatureArmorClass
  hitPoints?: string
  speed?: string
  abilities?: Partial<
    Record<CreatureAbilityKey, CreatureAbilityScore>
  >
  savingThrows?: Partial<
    Record<CreatureAbilityKey, string>
  >
  skills?: Readonly<Record<string, string>>
  damageVulnerabilities?: readonly string[]
  damageResistances?: readonly string[]
  damageImmunities?: readonly string[]
  damageAffinities?: readonly DamageAffinity[]
  conditionImmunities?: readonly string[]
  vision?: readonly VisionSense[]
  senses?: readonly string[]
  passivePerception?: number
  languages?: readonly string[]
  challengeRating?: string
  proficiencyBonus?: string
  habitat?: readonly string[]
  sections: readonly CreatureSection[]
}
