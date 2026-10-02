import { describe, expect, it } from 'vitest'
import { createEmptyCharacterSheet, formulaNumericField, manualNumericField } from '../defaults'
import {
  buildCharacterSheetFormulaFields,
  evaluateCharacterSheetFormulas,
  evaluateFormulaFields,
} from './formulaEngine'
import { selectValidCustomFormulaFields } from './customVariableKeys'
import { evaluateFormula } from './evaluator'
import { featureUseFormulaVariable } from './fieldKeys'
import { createCharacterSheetVariableRegistry } from './variableRegistry'

describe('безопасный движок формул', () => {
  it('учитывает приоритет операторов и разрешённые функции', () => {
    expect(evaluateFormula('2 + 3 * 4', {})).toEqual({ status: 'ok', value: 14 })
    expect(evaluateFormula('CLAMP(ROUND(4.6), 1, 5)', {})).toEqual({
      status: 'ok',
      value: 5,
    })
  })

  it('не принимает JavaScript и неизвестные функции', () => {
    expect(evaluateFormula('globalThis.alert(1)', {}).status).toBe('error')
    const unknownFunction = evaluateFormula('POW(2, 3)', {})
    expect(unknownFunction.status).toBe('error')
    if (unknownFunction.status === 'error') {
      expect(unknownFunction.error.code).toBe('UNKNOWN_FUNCTION')
    }
  })

  it('возвращает локальные ошибки вместо исключений', () => {
    const result = evaluateFormula('10 / 0', {})
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.error.code).toBe('DIVISION_BY_ZERO')
    }
  })

  it('пересчитывает цепочку зависимых полей', () => {
    const evaluation = evaluateFormulaFields({
      SOURCE: { state: manualNumericField(4) },
      DOUBLE: { state: formulaNumericField(null, 'SOURCE * 2') },
      TOTAL: { state: formulaNumericField(null, 'DOUBLE + 3') },
    })

    expect(evaluation.values).toMatchObject({ SOURCE: 4, DOUBLE: 8, TOTAL: 11 })
  })

  it('изолирует цикл и продолжает считать независимые поля', () => {
    const evaluation = evaluateFormulaFields({
      FIRST: { state: formulaNumericField(null, 'SECOND + 1') },
      SECOND: { state: formulaNumericField(null, 'FIRST + 1') },
      INDEPENDENT: { state: formulaNumericField(null, '2 + 2') },
      DEPENDENT: { state: formulaNumericField(null, 'FIRST + 10') },
    })

    expect(evaluation.results.FIRST.status).toBe('error')
    expect(evaluation.results.SECOND.status).toBe('error')
    expect(evaluation.results.DEPENDENT.status).toBe('error')
    expect(evaluation.results.INDEPENDENT).toEqual({ status: 'ok', value: 4 })
  })

  it('пересчитывает стандартные формулы листа', () => {
    const document = createEmptyCharacterSheet({ id: 'formula-test' })
    document.identity.level = manualNumericField(5)
    document.abilities.strength.score = manualNumericField(18)
    document.savingThrows.strength.rank = 'proficient'

    const evaluation = evaluateCharacterSheetFormulas(document)
    expect(evaluation.values.STR_MOD).toBe(4)
    expect(evaluation.values.PROFICIENCY).toBe(3)
    expect(evaluation.values.SAVE_STR).toBe(7)
  })

  it('публикует все стандартные вычисляемые поля в реестре переменных', () => {
    const document = createEmptyCharacterSheet({
      id: 'formula-registry-test',
    })
    const registry = createCharacterSheetVariableRegistry(document)
    const standardKeys = [
      'EXPERIENCE',
      'ARMOR_CLASS',
      'INITIATIVE',
      'SPEED',
      'PASSIVE_PERCEPTION',
      'SAVE_STR',
      'SAVE_DEX',
      'SAVE_CON',
      'SAVE_INT',
      'SAVE_WIS',
      'SAVE_CHA',
    ] as const

    standardKeys.forEach((key) => {
      expect(registry.get(key)?.source).toEqual({
        kind: 'computed',
        fieldId: key,
      })
    })
  })

  it('исключает пользовательское поле с пустым ключом', () => {
    const document = createEmptyCharacterSheet({ id: 'empty-custom-key' })
    document.customFields.empty = {
      id: 'empty',
      kind: 'number',
      label: 'Без ключа',
      variableKey: '',
      value: manualNumericField(12),
    }

    const selection = selectValidCustomFormulaFields(document)

    expect(selection.fields).toHaveLength(0)
    expect(selection.issuesByFieldId.empty?.code).toBe('empty')
    expect(
      Object.hasOwn(buildCharacterSheetFormulaFields(document), ''),
    ).toBe(false)
    expect(
      createCharacterSheetVariableRegistry(document).list()
        .some((variable) => variable.key === ''),
    ).toBe(false)
  })

  it('исключает все пользовательские поля с дублирующимся ключом', () => {
    const document = createEmptyCharacterSheet({ id: 'duplicate-custom-key' })
    document.customFields.first = {
      id: 'first',
      kind: 'number',
      label: 'Первое',
      variableKey: 'CUSTOM_BONUS',
      value: manualNumericField(2),
    }
    document.customFields.second = {
      id: 'second',
      kind: 'computed',
      label: 'Второе',
      variableKey: 'custom_bonus',
      value: formulaNumericField(null, '2 + 2'),
    }

    const selection = selectValidCustomFormulaFields(document)

    expect(selection.fields).toHaveLength(0)
    expect(selection.issuesByFieldId.first?.code).toBe('duplicate')
    expect(selection.issuesByFieldId.second?.code).toBe('duplicate')
    expect(buildCharacterSheetFormulaFields(document).CUSTOM_BONUS).toBeUndefined()
    expect(
      createCharacterSheetVariableRegistry(document).get('CUSTOM_BONUS'),
    ).toBeUndefined()
  })

  it('не позволяет пользовательскому ключу заменить системную переменную', () => {
    const document = createEmptyCharacterSheet({ id: 'reserved-custom-key' })
    document.abilities.strength.score = manualNumericField(16)
    document.customFields.reserved = {
      id: 'reserved',
      kind: 'number',
      label: 'Подмена силы',
      variableKey: 'str',
      value: manualNumericField(99),
    }
    document.customFields.reservedLevel = {
      id: 'reservedLevel',
      kind: 'computed',
      label: 'Подмена уровня',
      variableKey: 'LEVEL',
      value: formulaNumericField(null, '99'),
    }

    const selection = selectValidCustomFormulaFields(document)
    const fields = buildCharacterSheetFormulaFields(document)
    const registry = createCharacterSheetVariableRegistry(document)

    expect(selection.issuesByFieldId.reserved?.code).toBe('reserved')
    expect(selection.issuesByFieldId.reservedLevel?.code).toBe('reserved')
    expect(fields.STR.state).toBe(document.abilities.strength.score)
    expect(fields.LEVEL.state).toBe(document.identity.level)
    expect(registry.resolveDocumentValues(document).STR).toBe(16)
    expect(evaluateCharacterSheetFormulas(document).values).toMatchObject({
      LEVEL: 1,
      STR: 16,
    })
  })

  it('поддерживает зависимость между валидными пользовательскими полями', () => {
    const document = createEmptyCharacterSheet({ id: 'valid-custom-key' })
    document.customFields.base = {
      id: 'base',
      kind: 'number',
      label: 'Основа',
      variableKey: 'CUSTOM_BASE',
      value: manualNumericField(6),
    }
    document.customFields.total = {
      id: 'total',
      kind: 'computed',
      label: 'Итог',
      variableKey: 'CUSTOM_TOTAL',
      value: formulaNumericField(null, 'CUSTOM_BASE * 2'),
    }

    const selection = selectValidCustomFormulaFields(document)
    const evaluation = evaluateCharacterSheetFormulas(document)

    expect(selection.issuesByFieldId).toEqual({})
    expect(selection.fields.map(({ key }) => key)).toEqual([
      'CUSTOM_BASE',
      'CUSTOM_TOTAL',
    ])
    expect(evaluation.values.CUSTOM_TOTAL).toBe(12)
  })

  it('поддерживает формулы использований способности', () => {
    const document = createEmptyCharacterSheet({
      id: 'feature-formula-test',
    })
    document.identity.level = manualNumericField(5)
    document.features = [
      {
        id: 'second-wind',
        category: 'class',
        title: 'Второе дыхание',
        description: '',
        expanded: true,
        uses: {
          current: formulaNumericField(null, 'LEVEL - 2'),
          maximum: manualNumericField(4),
        },
        recovery: 'short',
        recoveryLabel: '',
        customFieldIds: [],
        linkedEntityIds: [],
      },
    ]

    const evaluation = evaluateCharacterSheetFormulas(document)

    expect(
      evaluation.values[
        featureUseFormulaVariable('second-wind', 'current')
      ],
    ).toBe(3)
  })

  it('резервирует ключи использований способности', () => {
    const document = createEmptyCharacterSheet({
      id: 'feature-key-collision-test',
    })
    document.features = [
      {
        id: 'second-wind',
        category: 'class',
        title: 'Второе дыхание',
        description: '',
        expanded: true,
        uses: {
          current: manualNumericField(1),
          maximum: manualNumericField(1),
        },
        recovery: 'short',
        recoveryLabel: '',
        customFieldIds: [],
        linkedEntityIds: [],
      },
    ]
    document.customFields.collision = {
      id: 'collision',
      kind: 'number',
      label: 'Конфликт',
      variableKey: featureUseFormulaVariable(
        'second-wind',
        'current',
      ),
      value: manualNumericField(99),
    }

    const selection = selectValidCustomFormulaFields(document)
    const evaluation = evaluateCharacterSheetFormulas(document)

    expect(selection.issuesByFieldId.collision?.code).toBe(
      'reserved',
    )
    expect(
      evaluation.values[
        featureUseFormulaVariable('second-wind', 'current')
      ],
    ).toBe(1)
  })
})
