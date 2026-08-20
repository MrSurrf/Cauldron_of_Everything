import type {
  AbilityKey,
  AttackEntry,
  CharacterFeature,
  CharacterIdentityData,
  CharacterProficiencies,
  CharacterSheetDocument,
  CustomField,
  CustomSection,
  DeathSavesState,
  HitDicePool,
  InventoryEntry,
  NumericFieldAddress,
  NumericFieldState,
  PersonalitySections,
  ProficiencyRank,
  RepeatableTextEntry,
  ResourcePool,
  RulesetId,
  SheetAppearance,
} from './characterSheet.types'

export type PersonalitySectionKey = keyof PersonalitySections

export type CharacterSheetAction =
  | { type: 'document/replace'; document: CharacterSheetDocument }
  | { type: 'identity/patch'; patch: Partial<CharacterIdentityData> }
  | { type: 'ruleset/set'; rulesetId: RulesetId }
  | { type: 'numericField/set'; address: NumericFieldAddress; value: NumericFieldState }
  | { type: 'inspiration/set'; value: boolean }
  | { type: 'savingThrow/setRank'; ability: AbilityKey; rank: ProficiencyRank }
  | { type: 'skill/setRank'; skillId: string; rank: ProficiencyRank }
  | { type: 'proficiencies/patch'; patch: Partial<CharacterProficiencies> }
  | { type: 'proficiencies/patch'; patch: Partial<CharacterProficiencies> }
  | { type: 'deathSaves/set'; value: DeathSavesState }
  | { type: 'hitDice/add'; value: HitDicePool }
  | { type: 'hitDice/update'; id: string; patch: Partial<HitDicePool> }
  | { type: 'hitDice/remove'; id: string }
  | { type: 'resource/add'; value: ResourcePool }
  | { type: 'resource/update'; id: string; patch: Partial<ResourcePool> }
  | { type: 'resource/remove'; id: string }
  | { type: 'attack/add'; value: AttackEntry }
  | { type: 'attack/update'; id: string; patch: Partial<AttackEntry> }
  | { type: 'attack/remove'; id: string }
  | { type: 'inventory/add'; value: InventoryEntry }
  | { type: 'inventory/update'; id: string; patch: Partial<InventoryEntry> }
  | { type: 'inventory/remove'; id: string }
  | {
      type: 'personality/add'
      section: PersonalitySectionKey
      value: RepeatableTextEntry
    }
  | {
      type: 'personality/update'
      section: PersonalitySectionKey
      id: string
      patch: Partial<RepeatableTextEntry>
    }
  | { type: 'personality/remove'; section: PersonalitySectionKey; id: string }
  | { type: 'feature/add'; value: CharacterFeature }
  | { type: 'feature/update'; id: string; patch: Partial<CharacterFeature> }
  | { type: 'feature/remove'; id: string }
  | { type: 'feature/move'; id: string; direction: -1 | 1 }
  | { type: 'customField/set'; value: CustomField }
  | { type: 'customField/remove'; id: string }
  | { type: 'customSection/add'; value: CustomSection }
  | { type: 'customSection/update'; id: string; patch: Partial<CustomSection> }
  | { type: 'customSection/remove'; id: string }
  | { type: 'customSection/move'; id: string; direction: -1 | 1 }
  | { type: 'appearance/patch'; patch: Partial<SheetAppearance> }
  | { type: 'view/toggleSection'; id: string }

export const characterSheetActions = {
  replaceDocument: (document: CharacterSheetDocument): CharacterSheetAction => ({
    type: 'document/replace',
    document,
  }),
  patchIdentity: (patch: Partial<CharacterIdentityData>): CharacterSheetAction => ({
    type: 'identity/patch',
    patch,
  }),
  setRuleset: (rulesetId: RulesetId): CharacterSheetAction => ({
    type: 'ruleset/set',
    rulesetId,
  }),
  setNumericField: (
    address: NumericFieldAddress,
    value: NumericFieldState,
  ): CharacterSheetAction => ({ type: 'numericField/set', address, value }),
  setInspiration: (value: boolean): CharacterSheetAction => ({
    type: 'inspiration/set',
    value,
  }),
  setSavingThrowRank: (
    ability: AbilityKey,
    rank: ProficiencyRank,
  ): CharacterSheetAction => ({ type: 'savingThrow/setRank', ability, rank }),
  setSkillRank: (skillId: string, rank: ProficiencyRank): CharacterSheetAction => ({
    type: 'skill/setRank',
    skillId,
    rank,
  }),
  patchProficiencies: (
    patch: Partial<CharacterProficiencies>,
  ): CharacterSheetAction => ({
    type: 'proficiencies/patch',
    patch,
  }),
  patchAppearance: (patch: Partial<SheetAppearance>): CharacterSheetAction => ({
    type: 'appearance/patch',
    patch,
  }),
  toggleSection: (id: string): CharacterSheetAction => ({
    type: 'view/toggleSection',
    id,
  }),
} as const
