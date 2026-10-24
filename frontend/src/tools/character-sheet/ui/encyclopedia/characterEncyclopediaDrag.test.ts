import { describe, expect, it } from 'vitest'
import {
  CHARACTER_ENCYCLOPEDIA_DRAG_TYPE,
  hasCharacterEncyclopediaTypeDrag,
  hasCharacterEncyclopediaSpellLevelDrag,
  readCharacterEncyclopediaDrag,
  toCharacterEncyclopediaEntry,
  writeCharacterEncyclopediaDrag,
} from './characterEncyclopediaDrag'

function transferWith(data: Record<string, string> = {}): DataTransfer {
  return {
    get types() { return Object.keys(data) },
    getData: (type: string) => data[type] ?? '',
    setData: (type: string, value: string) => { data[type] = value },
  } as unknown as DataTransfer
}

describe('перетаскивание энциклопедии в лист персонажа', () => {
  it.each(['item', 'spell', 'class', 'race', 'background'] as const)('сохраняет запись типа %s и распознаёт её в защищённом режиме dragover', (entityType) => {
    const entry = toCharacterEncyclopediaEntry({
      id: 42, entity_type: entityType, name: 'Запись из БД', name_en: 'Entry', slug: 'entry', summary: { level: 3 },
    })!
    expect(entry).not.toBeNull()
    const transfer = transferWith()
    writeCharacterEncyclopediaDrag(transfer, entry)
    expect(readCharacterEncyclopediaDrag(transfer)).toEqual(entry)
    const protectedTransfer = { types: transfer.types, getData: () => '' } as unknown as DataTransfer
    expect(hasCharacterEncyclopediaTypeDrag(protectedTransfer, entityType)).toBe(true)
    expect(hasCharacterEncyclopediaTypeDrag(protectedTransfer, entityType === 'race' ? 'class' : 'race')).toBe(false)
  })

  it.each([
    'not-json',
    JSON.stringify({ id: 42, entityType: 'creature', name: 'Монстр' }),
    JSON.stringify({ id: -1, entityType: 'class', name: 'Класс' }),
    JSON.stringify({ id: 42, entityType: 'race', name: ' ' }),
  ])('отклоняет некорректную запись %s', (raw) => {
    expect(readCharacterEncyclopediaDrag(transferWith({ [CHARACTER_ENCYCLOPEDIA_DRAG_TYPE]: raw }))).toBeNull()
  })

  it('распознаёт допустимый уровень заклинания без доступа к содержимому DataTransfer', () => {
    const transfer = transferWith()
    writeCharacterEncyclopediaDrag(transfer, {
      id: 42, entityType: 'spell', name: 'Туманный шаг', nameEn: '', level: 2, summary: {},
    })
    const protectedTransfer = { types: transfer.types, getData: () => '' } as unknown as DataTransfer
    expect(hasCharacterEncyclopediaSpellLevelDrag(protectedTransfer, 2)).toBe(true)
    expect(hasCharacterEncyclopediaSpellLevelDrag(protectedTransfer, 1)).toBe(false)
  })

  it('оставляет выбор уровня для заклинания без известного уровня', () => {
    const transfer = transferWith()
    writeCharacterEncyclopediaDrag(transfer, {
      id: 42, entityType: 'spell', name: 'Особое заклинание', nameEn: '', level: null, summary: {},
    })
    expect(hasCharacterEncyclopediaSpellLevelDrag(transfer, 0)).toBe(true)
    expect(hasCharacterEncyclopediaSpellLevelDrag(transfer, 9)).toBe(true)
  })
})
