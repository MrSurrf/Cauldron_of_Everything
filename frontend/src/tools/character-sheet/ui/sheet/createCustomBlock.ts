import {
  createClientId,
  formulaNumericField,
  manualNumericField,
  type CustomField,
  type CustomSection,
} from '../../model'
import type { NewCustomBlockKind } from '../custom'

export type CreatedCustomBlock = {
  field?: CustomField
  section: CustomSection
}

export function createCustomBlock(
  kind: NewCustomBlockKind,
): CreatedCustomBlock {
  const sectionId = createClientId('custom-section')
  const section: CustomSection = {
    expanded: true,
    fieldIds: [],
    id: sectionId,
    kind:
      kind === 'number' || kind === 'computed'
        ? 'fields'
        : kind,
    removable: true,
    text: '',
    title: {
      text: 'Текстовый блок',
      number: 'Числовое поле',
      computed: 'Вычисляемое поле',
      list: 'Список',
      table: 'Таблица',
      collapsible: 'Новая секция',
    }[kind],
  }

  if (
    kind !== 'number' &&
    kind !== 'computed' &&
    kind !== 'list' &&
    kind !== 'table'
  ) {
    return { section }
  }

  const fieldId = createClientId('custom-field')
  const variableKey = `CUSTOM_${fieldId
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')}`
  let field: CustomField

  if (kind === 'number') {
    field = {
      id: fieldId,
      kind,
      label: 'Значение',
      value: manualNumericField(null),
      variableKey,
    }
  } else if (kind === 'computed') {
    field = {
      id: fieldId,
      kind,
      label: 'Вычисляемое значение',
      value: formulaNumericField(null, ''),
      variableKey,
    }
  } else if (kind === 'list') {
    field = {
      id: fieldId,
      items: [],
      kind,
      label: 'Список',
    }
  } else {
    field = {
      columns: [
        { id: 'name', label: 'Название' },
        { id: 'value', label: 'Значение' },
      ],
      id: fieldId,
      kind,
      label: 'Таблица',
      rows: [],
    }
  }

  section.fieldIds = [fieldId]
  return { field, section }
}
