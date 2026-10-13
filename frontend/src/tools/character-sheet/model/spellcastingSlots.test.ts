import { describe, expect, it } from 'vitest'
import { characterSheetActions } from './characterSheet.actions'
import { characterSheetReducer } from './characterSheet.reducer'
import { createMockSpellcasterSheet } from './mockSpellcaster'
import { manualNumericField } from './defaults'
import { getEffectiveSpellSlots } from './spellcastingSlots'
import { getEffectiveSpellcastingAbility } from './spellcastingAbility'

describe('Лист заклинаний персонажа', () => {
  it('пересчитывает ячейки по уровню класса и ограничивает потраченные', () => {
    const document = createMockSpellcasterSheet()
    expect(getEffectiveSpellSlots(document)[1]).toEqual({ maximum: 4, used: 1 })
    expect(getEffectiveSpellSlots(document)[5]).toEqual({ maximum: 1, used: 0 })

    document.identity.level = manualNumericField(1)
    expect(getEffectiveSpellSlots(document)[1]).toEqual({ maximum: 2, used: 1 })
    expect(getEffectiveSpellSlots(document)[3]).toEqual({ maximum: 0, used: 0 })
  })

  it('тратит автоматические ячейки, не отключая расчёт класса', () => {
    const initial = createMockSpellcasterSheet()
    const next = characterSheetReducer(initial, characterSheetActions.setSpellSlotUsed(1, 2))
    expect(next.spellcasting?.slotMode).toBe('automatic')
    expect(getEffectiveSpellSlots(next)[1]).toEqual({ maximum: 4, used: 2 })
  })

  it('при ручной правке сохраняет остальные рассчитанные уровни', () => {
    const initial = createMockSpellcasterSheet()
    const next = characterSheetReducer(initial, characterSheetActions.setSpellSlotMaximum(1, 5))
    expect(next.spellcasting?.slotMode).toBe('manual')
    expect(getEffectiveSpellSlots(next)[1]).toEqual({ maximum: 5, used: 1 })
    expect(getEffectiveSpellSlots(next)[3]).toEqual({ maximum: 3, used: 2 })
  })

  it('связывает записи энциклопедии и не дублирует изученное заклинание', () => {
    const initial = createMockSpellcasterSheet()
    const item = { id: 'first-shield', entityId: 101, name: 'Щит', quantity: 1 }
    const withItem = characterSheetReducer(initial, characterSheetActions.addEquipmentItem(item))
    const doubledItem = characterSheetReducer(withItem, characterSheetActions.addEquipmentItem({ ...item, id: 'second-shield' }))
    expect(doubledItem.equipmentItems?.find(entry => entry.entityId === 101)?.quantity).toBe(2)

    const spell = { id: 'first-spell', entityId: 202, name: 'Благословение', level: 1 as const, prepared: false }
    const withSpell = characterSheetReducer(doubledItem, characterSheetActions.addSpell(spell))
    const duplicate = characterSheetReducer(withSpell, characterSheetActions.addSpell({ ...spell, id: 'second-spell' }))
    expect(duplicate.spellcasting?.spells.filter(entry => entry.entityId === 202)).toHaveLength(1)
  })

  it('выбирает характеристику по классу и сохраняет ручной выбор', () => {
    const wizard = createMockSpellcasterSheet()
    wizard.identity.className = 'Волшебник'
    expect(getEffectiveSpellcastingAbility(wizard)).toBe('intelligence')
    const manual = characterSheetReducer(wizard, characterSheetActions.setSpellcastingAbility('charisma'))
    expect(getEffectiveSpellcastingAbility(manual)).toBe('charisma')
  })
})
