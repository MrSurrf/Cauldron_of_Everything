import { describe, expect, it } from 'vitest'

import { createEmptyCharacterSheet } from './defaults'
import { characterSheetReducer } from './characterSheet.reducer'

describe('characterSheetReducer', () => {
  it('удаляет поля удалённой секции, но сохраняет поля с другими ссылками', () => {
    const document = createEmptyCharacterSheet({
      id: 'section-removal-test',
    })

    document.customFields = {
      privateField: {
        id: 'privateField',
        kind: 'text',
        label: 'Только в секции',
        value: 'Значение',
      },
      sharedField: {
        id: 'sharedField',
        kind: 'text',
        label: 'Общее поле',
        value: 'Значение',
      },
    }
    document.customSections = [
      {
        id: 'removed',
        kind: 'fields',
        title: 'Удаляемая',
        expanded: true,
        removable: true,
        fieldIds: ['privateField', 'sharedField'],
        text: '',
      },
      {
        id: 'retained',
        kind: 'fields',
        title: 'Оставшаяся',
        expanded: true,
        removable: true,
        fieldIds: ['sharedField'],
        text: '',
      },
    ]

    const next = characterSheetReducer(document, {
      type: 'customSection/remove',
      id: 'removed',
    })

    expect(next.customSections).toHaveLength(1)
    expect(next.customFields.privateField).toBeUndefined()
    expect(next.customFields.sharedField).toBeDefined()
  })

  it('удаляет осиротевшее поле способности', () => {
    const document = createEmptyCharacterSheet({
      id: 'feature-removal-test',
    })
    document.customFields = {
      featureField: {
        id: 'featureField',
        kind: 'text',
        label: 'Поле способности',
        value: 'Значение',
      },
    }
    document.features = [
      {
        id: 'feature',
        category: 'class',
        title: 'Способность',
        description: '',
        expanded: true,
        uses: null,
        recovery: null,
        recoveryLabel: '',
        customFieldIds: ['featureField'],
        linkedEntityIds: [],
      },
    ]

    const next = characterSheetReducer(document, {
      type: 'feature/remove',
      id: 'feature',
    })

    expect(next.features).toHaveLength(0)
    expect(next.customFields.featureField).toBeUndefined()
  })

  it('меняет порядок способностей внутри их категории', () => {
    const document = createEmptyCharacterSheet({
      id: 'feature-order-test',
    })
    const createFeature = (
      id: string,
      category: 'class' | 'background',
    ) => ({
      id,
      category,
      title: id,
      description: '',
      expanded: true,
      uses: null,
      recovery: null,
      recoveryLabel: '',
      customFieldIds: [],
      linkedEntityIds: [],
    })
    document.features = [
      createFeature('class-first', 'class'),
      createFeature('background', 'background'),
      createFeature('class-second', 'class'),
    ]

    const next = characterSheetReducer(document, {
      type: 'feature/move',
      id: 'class-second',
      direction: -1,
    })

    expect(next.features.map((feature) => feature.id)).toEqual([
      'class-second',
      'background',
      'class-first',
    ])
  })
})
