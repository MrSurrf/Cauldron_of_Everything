import type {
  CharacterSheetDocument,
  ProficiencyRank,
} from '../characterSheet.types'
import { ABILITY_KEYS } from '../characterSheet.types'
import {
  abilityModifierVariable,
  abilityScoreVariable,
  savingThrowVariable,
  savingThrowProficiencyVariable,
  skillProficiencyVariable,
} from '../rulesets/ruleset.types'
import { getRulesetDefinition } from '../rulesets/registry'
import {
  attackBonusFormulaVariable,
  currencyFormulaVariable,
  featureUseFormulaVariable,
  FORMULA_FIELD_KEYS,
  hitDieFormulaVariable,
  resourceFormulaVariable,
} from './fieldKeys'
import { selectValidCustomFormulaFields } from './customVariableKeys'

export type FormulaVariableDescriptor = {
  key: string
  label: string
  category: string
  source:
    | {
        kind: 'document'
        read: (document: CharacterSheetDocument) => number | null
      }
    | {
        kind: 'computed'
        fieldId: string
      }
}

export type FormulaVariableRegistry = {
  list: () => readonly FormulaVariableDescriptor[]
  get: (key: string) => FormulaVariableDescriptor | undefined
  resolveDocumentValues: (
    document: CharacterSheetDocument,
  ) => Record<string, number | null>
}

export const proficiencyMultiplier = (rank: ProficiencyRank) => {
  if (rank === 'half') return 0.5
  if (rank === 'proficient') return 1
  if (rank === 'expertise') return 2
  return 0
}

export function createFormulaVariableRegistry(
  descriptors: readonly FormulaVariableDescriptor[],
): FormulaVariableRegistry {
  const byKey = new Map(
    descriptors.map((descriptor) => [descriptor.key.toUpperCase(), descriptor]),
  )

  return {
    list: () => [...byKey.values()],
    get: (key) => byKey.get(key.toUpperCase()),
    resolveDocumentValues: (document) =>
      Object.fromEntries(
        [...byKey.values()]
          .filter((descriptor) => descriptor.source.kind === 'document')
          .map((descriptor) => [
            descriptor.key,
            descriptor.source.kind === 'document'
              ? descriptor.source.read(document)
              : null,
          ]),
      ),
  }
}

const readManualValue = (value: { manualValue: number | null }) => value.manualValue

const abilityDescriptors: FormulaVariableDescriptor[] = ABILITY_KEYS.flatMap(
  (ability) => [
    {
      key: abilityScoreVariable(ability),
      label: `Значение: ${abilityScoreVariable(ability)}`,
      category: 'Характеристики',
      source: {
        kind: 'document' as const,
        read: (document: CharacterSheetDocument) =>
          readManualValue(document.abilities[ability].score),
      },
    },
    {
      key: abilityModifierVariable(ability),
      label: `Модификатор: ${abilityScoreVariable(ability)}`,
      category: 'Характеристики',
      source: {
        kind: 'computed' as const,
        fieldId: abilityModifierVariable(ability),
      },
    },
    {
      key: savingThrowProficiencyVariable(ability),
      label: `Множитель владения спасброском ${abilityScoreVariable(ability)}`,
      category: 'Спасброски',
      source: {
        kind: 'document' as const,
        read: (document: CharacterSheetDocument) =>
          proficiencyMultiplier(document.savingThrows[ability].rank),
      },
    },
    {
      key: savingThrowVariable(ability),
      label: `Спасбросок: ${abilityScoreVariable(ability)}`,
      category: 'Спасброски',
      source: {
        kind: 'computed' as const,
        fieldId: savingThrowVariable(ability),
      },
    },
  ],
)

const staticDescriptors: FormulaVariableDescriptor[] = [
  {
    key: 'LEVEL',
    label: 'Уровень',
    category: 'Персонаж',
    source: {
      kind: 'document',
      read: (document) => readManualValue(document.identity.level),
    },
  },
  {
    key: 'PROFICIENCY',
    label: 'Бонус мастерства',
    category: 'Персонаж',
    source: { kind: 'computed', fieldId: 'PROFICIENCY' },
  },
  {
    key: FORMULA_FIELD_KEYS.experience,
    label: 'Опыт',
    category: 'Персонаж',
    source: {
      kind: 'computed',
      fieldId: FORMULA_FIELD_KEYS.experience,
    },
  },
  {
    key: FORMULA_FIELD_KEYS.armorClass,
    label: 'Класс доспеха',
    category: 'Бой',
    source: {
      kind: 'computed',
      fieldId: FORMULA_FIELD_KEYS.armorClass,
    },
  },
  {
    key: FORMULA_FIELD_KEYS.initiative,
    label: 'Инициатива',
    category: 'Бой',
    source: {
      kind: 'computed',
      fieldId: FORMULA_FIELD_KEYS.initiative,
    },
  },
  {
    key: FORMULA_FIELD_KEYS.speed,
    label: 'Скорость',
    category: 'Бой',
    source: {
      kind: 'computed',
      fieldId: FORMULA_FIELD_KEYS.speed,
    },
  },
  {
    key: FORMULA_FIELD_KEYS.passivePerception,
    label: 'Пассивное восприятие',
    category: 'Навыки',
    source: {
      kind: 'computed',
      fieldId: FORMULA_FIELD_KEYS.passivePerception,
    },
  },
]

export function createCharacterSheetVariableRegistry(
  document: CharacterSheetDocument,
): FormulaVariableRegistry {
  const skillDescriptors: FormulaVariableDescriptor[] = getRulesetDefinition(
    document.rulesetId,
  ).skills.flatMap((skill) => [
    {
      key: skill.variableKey,
      label: skill.label,
      category: 'Навыки',
      source: { kind: 'computed' as const, fieldId: skill.variableKey },
    },
    {
      key: skillProficiencyVariable(skill.variableKey),
      label: `Множитель владения: ${skill.label}`,
      category: 'Навыки',
      source: {
        kind: 'document' as const,
        read: (sourceDocument: CharacterSheetDocument) =>
          proficiencyMultiplier(sourceDocument.skills[skill.id]?.rank ?? 'none'),
      },
    },
  ])

  const customDescriptors: FormulaVariableDescriptor[] =
    selectValidCustomFormulaFields(document).fields.map(({ field, key }) => ({
      key,
      label: field.label,
      category: 'Пользовательские поля',
      source: { kind: 'computed' as const, fieldId: key },
    }))

  const dynamicDescriptors: FormulaVariableDescriptor[] = [
    ...document.hitDice.flatMap((pool) =>
      (['current', 'maximum'] as const).map((field) => ({
        key: hitDieFormulaVariable(pool.id, field),
        label: `${pool.die}: ${field === 'current' ? 'доступно' : 'максимум'}`,
        category: 'Кости хитов',
        source: {
          kind: 'computed' as const,
          fieldId: hitDieFormulaVariable(pool.id, field),
        },
      })),
    ),
    ...document.resources.flatMap((resource) =>
      (['current', 'maximum'] as const).map((field) => ({
        key: resourceFormulaVariable(resource.id, field),
        label: `${resource.label}: ${field === 'current' ? 'доступно' : 'максимум'}`,
        category: 'Ресурсы',
        source: {
          kind: 'computed' as const,
          fieldId: resourceFormulaVariable(resource.id, field),
        },
      })),
    ),
    ...document.features.flatMap((feature) =>
      feature.uses
        ? (['current', 'maximum'] as const).map((field) => ({
            key: featureUseFormulaVariable(feature.id, field),
            label: `${feature.title}: ${field === 'current' ? 'использовано' : 'максимум'}`,
            category: 'Особенности',
            source: {
              kind: 'computed' as const,
              fieldId: featureUseFormulaVariable(
                feature.id,
                field,
              ),
            },
          }))
        : [],
    ),
    ...document.attacks.map((attack) => ({
      key: attackBonusFormulaVariable(attack.id),
      label: `Бонус атаки: ${attack.name}`,
      category: 'Атаки',
      source: {
        kind: 'computed' as const,
        fieldId: attackBonusFormulaVariable(attack.id),
      },
    })),
    ...Object.keys(document.currency).map((currency) => ({
      key: currencyFormulaVariable(currency),
      label: `Монеты: ${currency.toUpperCase()}`,
      category: 'Снаряжение',
      source: {
        kind: 'computed' as const,
        fieldId: currencyFormulaVariable(currency),
      },
    })),
    {
      key: FORMULA_FIELD_KEYS.maximumHitPoints,
      label: 'Максимум хитов',
      category: 'Хиты',
      source: { kind: 'computed' as const, fieldId: FORMULA_FIELD_KEYS.maximumHitPoints },
    },
    {
      key: FORMULA_FIELD_KEYS.currentHitPoints,
      label: 'Текущие хиты',
      category: 'Хиты',
      source: { kind: 'computed' as const, fieldId: FORMULA_FIELD_KEYS.currentHitPoints },
    },
    {
      key: FORMULA_FIELD_KEYS.temporaryHitPoints,
      label: 'Временные хиты',
      category: 'Хиты',
      source: { kind: 'computed' as const, fieldId: FORMULA_FIELD_KEYS.temporaryHitPoints },
    },
  ]

  return createFormulaVariableRegistry([
    ...abilityDescriptors,
    ...staticDescriptors,
    ...skillDescriptors,
    ...customDescriptors,
    ...dynamicDescriptors,
  ])
}
