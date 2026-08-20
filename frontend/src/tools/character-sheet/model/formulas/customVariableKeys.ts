import type {
  CharacterSheetDocument,
  CustomField,
} from '../characterSheet.types'
import { ABILITY_KEYS } from '../characterSheet.types'
import { getRulesetDefinition } from '../rulesets/registry'
import {
  abilityModifierVariable,
  abilityScoreVariable,
  savingThrowProficiencyVariable,
  savingThrowVariable,
  skillProficiencyVariable,
} from '../rulesets/ruleset.types'
import {
  attackBonusFormulaVariable,
  currencyFormulaVariable,
  featureUseFormulaVariable,
  FORMULA_FIELD_KEYS,
  hitDieFormulaVariable,
  resourceFormulaVariable,
} from './fieldKeys'

export type CustomFormulaField = Extract<
  CustomField,
  { kind: 'computed' | 'number' }
>

export type CustomVariableKeyIssueCode =
  | 'empty'
  | 'invalid'
  | 'reserved'
  | 'duplicate'

export type CustomVariableKeyIssue = {
  code: CustomVariableKeyIssueCode
  message: string
}

export type SelectedCustomFormulaField = {
  field: CustomFormulaField
  key: string
}

export type CustomFormulaVariableSelection = {
  fields: readonly SelectedCustomFormulaField[]
  issuesByFieldId: Readonly<Record<string, CustomVariableKeyIssue>>
}

const VARIABLE_KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/

export const normalizeCustomVariableKey = (key: string) =>
  key.trim().toUpperCase()

function collectReservedVariableKeys(
  document: CharacterSheetDocument,
): Set<string> {
  const ruleset = getRulesetDefinition(document.rulesetId)
  const keys = new Set<string>([
    ...Object.values(FORMULA_FIELD_KEYS),
    'ARMOR_BONUS',
  ])

  ABILITY_KEYS.forEach((ability) => {
    keys.add(abilityScoreVariable(ability))
    keys.add(abilityModifierVariable(ability))
    keys.add(savingThrowVariable(ability))
    keys.add(savingThrowProficiencyVariable(ability))
  })

  ruleset.skills.forEach((skill) => {
    keys.add(skill.variableKey.toUpperCase())
    keys.add(skillProficiencyVariable(skill.variableKey).toUpperCase())
  })

  document.hitDice.forEach((pool) => {
    keys.add(hitDieFormulaVariable(pool.id, 'current'))
    keys.add(hitDieFormulaVariable(pool.id, 'maximum'))
  })

  document.resources.forEach((resource) => {
    keys.add(resourceFormulaVariable(resource.id, 'current'))
    keys.add(resourceFormulaVariable(resource.id, 'maximum'))
  })

  document.features.forEach((feature) => {
    if (!feature.uses) return
    keys.add(featureUseFormulaVariable(feature.id, 'current'))
    keys.add(featureUseFormulaVariable(feature.id, 'maximum'))
  })

  document.attacks.forEach((attack) => {
    keys.add(attackBonusFormulaVariable(attack.id))
  })

  Object.keys(document.currency).forEach((currency) => {
    keys.add(currencyFormulaVariable(currency))
  })

  return keys
}

/**
 * Selects only unambiguous custom formula variables. The document remains
 * untouched so invalid API data can still be edited and saved explicitly.
 */
export function selectValidCustomFormulaFields(
  document: CharacterSheetDocument,
): CustomFormulaVariableSelection {
  const candidates = Object.values(document.customFields)
    .filter((field): field is CustomFormulaField =>
      field.kind === 'computed' || field.kind === 'number')
    .map((field) => ({
      field,
      key: normalizeCustomVariableKey(field.variableKey),
    }))
  const reservedKeys = collectReservedVariableKeys(document)
  const occurrenceCount = new Map<string, number>()

  candidates.forEach(({ key }) => {
    if (!key) return
    occurrenceCount.set(key, (occurrenceCount.get(key) ?? 0) + 1)
  })

  const fields: SelectedCustomFormulaField[] = []
  const issuesByFieldId: Record<string, CustomVariableKeyIssue> = {}

  candidates.forEach((candidate) => {
    const { field, key } = candidate

    if (!key) {
      issuesByFieldId[field.id] = {
        code: 'empty',
        message: 'Укажите ключ переменной.',
      }
      return
    }

    if (!VARIABLE_KEY_PATTERN.test(key)) {
      issuesByFieldId[field.id] = {
        code: 'invalid',
        message: 'Ключ должен начинаться с латинской буквы или знака _.',
      }
      return
    }

    if (reservedKeys.has(key)) {
      issuesByFieldId[field.id] = {
        code: 'reserved',
        message: `Ключ ${key} уже используется системным полем.`,
      }
      return
    }

    if ((occurrenceCount.get(key) ?? 0) > 1) {
      issuesByFieldId[field.id] = {
        code: 'duplicate',
        message: `Ключ ${key} используется несколькими пользовательскими полями.`,
      }
      return
    }

    fields.push(candidate)
  })

  return { fields, issuesByFieldId }
}
