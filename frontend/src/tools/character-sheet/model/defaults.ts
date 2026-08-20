import type {
  AbilityKey,
  CharacterSheetDocument,
  NumericFieldState,
  ProficiencyState,
  RulesetId,
  SkillState,
} from './characterSheet.types'
import { ABILITY_KEYS } from './characterSheet.types'
import { getRulesetDefinition } from './rulesets/registry'

export const manualNumericField = (value: number | null = null): NumericFieldState => ({
  mode: 'manual',
  manualValue: value,
  formulaOverride: null,
})

export const formulaNumericField = (
  manualFallback: number | null = null,
  formulaOverride: string | null = null,
): NumericFieldState => ({
  mode: 'formula',
  manualValue: manualFallback,
  formulaOverride,
})

export const createClientId = (prefix: string) => {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid
    ? `${prefix}-${uuid}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const createAbilityRecord = () =>
  Object.fromEntries(
    ABILITY_KEYS.map((ability) => [
      ability,
      {
        score: manualNumericField(10),
        modifier: formulaNumericField(0),
      },
    ]),
  ) as CharacterSheetDocument['abilities']

const createSavingThrowRecord = () =>
  Object.fromEntries(
    ABILITY_KEYS.map((ability) => [
      ability,
      {
        rank: 'none',
        value: formulaNumericField(0),
      } satisfies ProficiencyState,
    ]),
  ) as Record<AbilityKey, ProficiencyState>

const createSkillRecord = (rulesetId: RulesetId) =>
  Object.fromEntries(
    getRulesetDefinition(rulesetId).skills.map((skill) => [
      skill.id,
      {
        ...skill,
        rank: 'none',
        value: formulaNumericField(0),
      } satisfies SkillState,
    ]),
  )

export function createEmptyCharacterSheet(
  options: { id?: string; rulesetId?: RulesetId } = {},
): CharacterSheetDocument {
  const rulesetId = options.rulesetId ?? 'dnd5e-2014'
  return {
    schemaVersion: 1,
    id: options.id ?? createClientId('character'),
    rulesetId,
    rulesetRevision: getRulesetDefinition(rulesetId).revision,
    identity: {
      name: '',
      portraitUrl: null,
      className: '',
      subclass: '',
      background: '',
      race: '',
      alignment: '',
      playerName: '',
      level: manualNumericField(1),
      experience: manualNumericField(0),
    },
    abilities: createAbilityRecord(),
    proficiencyBonus: formulaNumericField(2),
    inspiration: false,
    savingThrows: createSavingThrowRecord(),
    skills: createSkillRecord(rulesetId),
    proficiencies: {
      languages: [],
      armor: [],
      weapons: [],
      tools: [],
      notes: '',
    },
    derivedStats: {
      armorClass: formulaNumericField(10),
      initiative: formulaNumericField(0),
      speed: manualNumericField(30),
      passivePerception: formulaNumericField(10),
    },
    hitPoints: {
      maximum: manualNumericField(null),
      current: manualNumericField(null),
      temporary: manualNumericField(0),
    },
    hitDice: [],
    deathSaves: { successes: 0, failures: 0 },
    resources: [],
    attacks: [],
    currency: {
      cp: manualNumericField(0),
      sp: manualNumericField(0),
      ep: manualNumericField(0),
      gp: manualNumericField(0),
      pp: manualNumericField(0),
    },
    inventory: [],
    personality: {
      traits: [],
      ideals: [],
      bonds: [],
      flaws: [],
    },
    features: [],
    customFields: {},
    customSections: [],
    appearance: {
      font: 'cauldron',
      bodyFontSize: 14,
      headingFontSize: 16,
      density: 'compact',
    },
    view: { collapsedSectionIds: [] },
  }
}
