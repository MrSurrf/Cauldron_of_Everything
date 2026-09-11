import type {
  AbilityKey,
  CharacterFeature,
  RulesetId,
} from '../characterSheet.types'

export type SkillDefinition = {
  id: string
  label: string
  ability: AbilityKey
  variableKey: string
}

export type CharacterRulesetDefinition = {
  id: RulesetId
  revision: number
  label: string
  defaultFormulas: Readonly<Record<string, string>>
  skills: readonly SkillDefinition[]
  featureSections: readonly {
    category: CharacterFeature['category']
    label: string
  }[]
}

export const abilityScoreVariable = (ability: AbilityKey) =>
  ({
    strength: 'STR',
    dexterity: 'DEX',
    constitution: 'CON',
    intelligence: 'INT',
    wisdom: 'WIS',
    charisma: 'CHA',
  })[ability]

export const abilityModifierVariable = (ability: AbilityKey) =>
  `${abilityScoreVariable(ability)}_MOD`

export const savingThrowVariable = (ability: AbilityKey) =>
  `SAVE_${abilityScoreVariable(ability)}`

export const savingThrowProficiencyVariable = (ability: AbilityKey) =>
  `${savingThrowVariable(ability)}_PROFICIENCY`

export const skillProficiencyVariable = (skillVariable: string) =>
  `${skillVariable}_PROFICIENCY`
