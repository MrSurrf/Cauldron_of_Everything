export const ABILITY_KEYS = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const

export type AbilityKey = (typeof ABILITY_KEYS)[number]

export type RulesetId = 'dnd5e-2014' | 'dnd5e-2024'
export type NumericFieldMode = 'manual' | 'formula'
export type ProficiencyRank = 'none' | 'half' | 'proficient' | 'expertise'
export type RestRecovery = 'short' | 'long' | 'either' | 'manual'
export type SheetDensity = 'compact' | 'comfortable' | 'spacious'
export type SheetFont = 'cauldron' | 'sans' | 'serif'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type NumericFieldState = {
  mode: NumericFieldMode
  manualValue: number | null
  formulaOverride: string | null
}

export type CharacterIdentityData = {
  name: string
  portraitUrl: string | null
  className: string
  subclass: string
  background: string
  race: string
  alignment: string
  playerName: string
  level: NumericFieldState
  experience: NumericFieldState
}

export type AbilityState = {
  score: NumericFieldState
  modifier: NumericFieldState
}

export type ProficiencyState = {
  rank: ProficiencyRank
  value: NumericFieldState
}

export type SkillState = ProficiencyState & {
  id: string
  label: string
  ability: AbilityKey
  variableKey: string
}

export type DerivedStats = {
  armorClass: NumericFieldState
  initiative: NumericFieldState
  speed: NumericFieldState
  passivePerception: NumericFieldState
}

export type HitPointsState = {
  maximum: NumericFieldState
  current: NumericFieldState
  temporary: NumericFieldState
}

export type HitDicePool = {
  id: string
  die: string
  current: NumericFieldState
  maximum: NumericFieldState
}

export type DeathSavesState = {
  successes: number
  failures: number
}

export type ResourcePool = {
  id: string
  label: string
  current: NumericFieldState
  maximum: NumericFieldState
  recovery: RestRecovery
}

export type AttackEntry = {
  id: string
  name: string
  attackBonus: NumericFieldState
  damage: string
  damageType: string
  notes: string
  itemId: string | null
}

export type CurrencyKey = 'cp' | 'sp' | 'ep' | 'gp' | 'pp'
export type CurrencyState = Record<CurrencyKey, NumericFieldState>

export type InventoryDefinition =
  | {
      kind: 'encyclopedia'
      itemId: string
    }
  | {
      kind: 'custom'
      name: string
    }

export type InventoryEntry = {
  id: string
  definition: InventoryDefinition
  quantity: number
  equipped: boolean
  attuned: boolean
  notes: string
  overrides: Record<string, JsonValue>
}

export type RepeatableTextEntry = {
  id: string
  title: string
  text: string
}

export type PersonalitySections = {
  traits: RepeatableTextEntry[]
  ideals: RepeatableTextEntry[]
  bonds: RepeatableTextEntry[]
  flaws: RepeatableTextEntry[]
}

export type CustomTextField = {
  id: string
  kind: 'text'
  label: string
  value: string
}

export type CustomNumberField = {
  id: string
  kind: 'number'
  label: string
  variableKey: string
  value: NumericFieldState
}

export type CustomComputedField = {
  id: string
  kind: 'computed'
  label: string
  variableKey: string
  value: NumericFieldState
}

export type CustomListField = {
  id: string
  kind: 'list'
  label: string
  items: Array<{ id: string; value: string }>
}

export type CustomTableColumn = {
  id: string
  label: string
}

export type CustomTableField = {
  id: string
  kind: 'table'
  label: string
  columns: CustomTableColumn[]
  rows: Array<{ id: string; cells: Record<string, string> }>
}

export type CustomField =
  | CustomTextField
  | CustomNumberField
  | CustomComputedField
  | CustomListField
  | CustomTableField

export type CharacterFeature = {
  id: string
  category: 'race' | 'class' | 'background' | 'feat' | 'other'
  title: string
  description: string
  expanded: boolean
  uses: {
    current: NumericFieldState
    maximum: NumericFieldState
  } | null
  recovery: RestRecovery | null
  recoveryLabel: string
  customFieldIds: string[]
  linkedEntityIds: string[]
}

export type CustomSectionKind =
  | 'text'
  | 'fields'
  | 'list'
  | 'table'
  | 'collapsible'

export type CustomSection = {
  id: string
  kind: CustomSectionKind
  title: string
  expanded: boolean
  removable: boolean
  fieldIds: string[]
  text: string
}

export type SheetAppearance = {
  font: SheetFont
  bodyFontSize: number
  headingFontSize: number
  density: SheetDensity
}

export type CharacterSheetViewState = {
  collapsedSectionIds: string[]
}

export type CharacterProficiencies = {
  languages: string[]
  armor: string[]
  weapons: string[]
  tools: string[]
  notes: string
  /**
   * Свободный текст единого редактора. Если поле отсутствует, UI безопасно
   * собирает его из прежних текстовых представлений и структурированных данных.
   * Остальные поля сохраняются для обратной совместимости и будущих связей.
   */
  contentText?: string | null
  languagesText?: string | null
  proficienciesText?: string | null
}

export type CharacterSheetDocument = {
  schemaVersion: 1
  id: string
  rulesetId: RulesetId
  rulesetRevision: number
  identity: CharacterIdentityData
  abilities: Record<AbilityKey, AbilityState>
  proficiencyBonus: NumericFieldState
  inspiration: boolean
  savingThrows: Record<AbilityKey, ProficiencyState>
  skills: Record<string, SkillState>
  proficiencies: CharacterProficiencies
  derivedStats: DerivedStats
  hitPoints: HitPointsState
  hitDice: HitDicePool[]
  deathSaves: DeathSavesState
  resources: ResourcePool[]
  attacks: AttackEntry[]
  /**
   * Свободное визуальное представление атак. Структурированный `attacks`
   * сохраняется отдельно для формул, связей с Encyclopedia и будущего API.
   */
  attacksContentText?: string | null
  currency: CurrencyState
  inventory: InventoryEntry[]
  personality: PersonalitySections
  features: CharacterFeature[]
  customFields: Record<string, CustomField>
  customSections: CustomSection[]
  appearance: SheetAppearance
  view: CharacterSheetViewState
}

export type NumericFieldAddress =
  | { kind: 'ability'; ability: AbilityKey; field: 'score' | 'modifier' }
  | { kind: 'identity'; field: 'level' | 'experience' }
  | { kind: 'proficiencyBonus' }
  | { kind: 'savingThrow'; ability: AbilityKey }
  | { kind: 'skill'; skillId: string }
  | { kind: 'derived'; field: keyof DerivedStats }
  | { kind: 'hitPoints'; field: keyof HitPointsState }
  | { kind: 'hitDice'; poolId: string; field: 'current' | 'maximum' }
  | { kind: 'featureUse'; featureId: string; field: 'current' | 'maximum' }
  | { kind: 'resource'; resourceId: string; field: 'current' | 'maximum' }
  | { kind: 'attack'; attackId: string }
  | { kind: 'currency'; currency: CurrencyKey }
  | { kind: 'customField'; fieldId: string }
