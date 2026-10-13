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
  NumericFieldAddress,
  NumericFieldState,
  PersonalitySections,
  ProficiencyRank,
  RepeatableTextEntry,
  ResourcePool,
  RulesetId,
  SheetAppearance,
  SpellEntry,
  SpellSlotLevel,
} from './characterSheet.types'
import type { ContentItemValue } from '../../../shared/ui/ContentEditor'
import type { VisionSense } from '../../../shared/model'

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
  | { type: 'vision/set'; value: VisionSense[] }
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
  | { type: 'attacks/setContentText'; value: string }
  | { type: 'equipment/setContentText'; value: string }
  | { type: 'equipment/importItem'; entityId: number; source: string }
  | { type: 'equipment/enrichItem'; entityId: number; patch: Partial<ContentItemValue> }
  | { type: 'spellcasting/setAbility'; ability: AbilityKey }
  | { type: 'spellcasting/setSlotUsed'; level: SpellSlotLevel; used: number }
  | { type: 'spellcasting/setSlotMaximum'; level: SpellSlotLevel; maximum: number }
  | { type: 'spellcasting/addSpell'; value: SpellEntry }
  | { type: 'spellcasting/updateSpell'; id: string; patch: Partial<SpellEntry> }
  | { type: 'spellcasting/removeSpell'; id: string }
  | { type: 'spellcasting/setPrepared'; id: string; prepared: boolean }
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
  setVision: (value: VisionSense[]): CharacterSheetAction => ({
    type: 'vision/set',
    value,
  }),
  setAttacksContentText: (value: string): CharacterSheetAction => ({
    type: 'attacks/setContentText',
    value,
  }),
  setEquipmentContentText: (value: string): CharacterSheetAction => ({
    type: 'equipment/setContentText',
    value,
  }),
  importEquipmentItem: (entityId: number, source: string): CharacterSheetAction => ({ type: 'equipment/importItem', entityId, source }),
  enrichEquipmentItem: (entityId: number, patch: Partial<ContentItemValue>): CharacterSheetAction => ({ type: 'equipment/enrichItem', entityId, patch }),
  setSpellcastingAbility: (ability: AbilityKey): CharacterSheetAction => ({ type: 'spellcasting/setAbility', ability }),
  setSpellSlotUsed: (level: SpellSlotLevel, used: number): CharacterSheetAction => ({ type: 'spellcasting/setSlotUsed', level, used }),
  setSpellSlotMaximum: (level: SpellSlotLevel, maximum: number): CharacterSheetAction => ({ type: 'spellcasting/setSlotMaximum', level, maximum }),
  addSpell: (value: SpellEntry): CharacterSheetAction => ({ type: 'spellcasting/addSpell', value }),
  updateSpell: (id: string, patch: Partial<SpellEntry>): CharacterSheetAction => ({ type: 'spellcasting/updateSpell', id, patch }),
  removeSpell: (id: string): CharacterSheetAction => ({ type: 'spellcasting/removeSpell', id }),
  setSpellPrepared: (id: string, prepared: boolean): CharacterSheetAction => ({ type: 'spellcasting/setPrepared', id, prepared }),
  patchAppearance: (patch: Partial<SheetAppearance>): CharacterSheetAction => ({
    type: 'appearance/patch',
    patch,
  }),
  toggleSection: (id: string): CharacterSheetAction => ({
    type: 'view/toggleSection',
    id,
  }),
} as const
