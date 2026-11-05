import { describe, expect, it } from 'vitest'

import { getSingleClassSpellSlots } from './spellcastingRules'

describe('getSingleClassSpellSlots', () => {
  it('даёт полному заклинателю ячейки по уровню класса', () => {
    expect(getSingleClassSpellSlots('Жрец', 5, 'dnd5e-2024')).toEqual({
      kind: 'spellcasting',
      slotsByLevel: { 1: 4, 2: 3, 3: 2 },
      recovery: 'long',
    })
    expect(getSingleClassSpellSlots('Wizard', 20, 'dnd5e-2014')?.slotsByLevel).toEqual({
      1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1,
    })
  })

  it('учитывает появление ячеек паладина и следопыта на первом уровне в редакции 2024', () => {
    expect(getSingleClassSpellSlots('Паладин', 1, 'dnd5e-2014')?.slotsByLevel).toEqual({})
    expect(getSingleClassSpellSlots('Паладин', 1, 'dnd5e-2024')?.slotsByLevel).toEqual({ 1: 2 })
    expect(getSingleClassSpellSlots('Ranger', 5, 'dnd5e-2024')?.slotsByLevel).toEqual({ 1: 4, 2: 2 })
  })

  it('считает ячейки треть-кастера только для явно указанного подкласса', () => {
    expect(getSingleClassSpellSlots('Воин', 7, 'dnd5e-2024')?.slotsByLevel).toEqual({})
    expect(getSingleClassSpellSlots('Воин (Мистический рыцарь)', 7, 'dnd5e-2024')?.slotsByLevel).toEqual({ 1: 4, 2: 2 })
    expect(getSingleClassSpellSlots('Arcane Trickster', 19, 'dnd5e-2014')?.slotsByLevel).toEqual({ 1: 4, 2: 3, 3: 3, 4: 1 })
  })

  it('держит короткие ячейки колдуна отдельно от обычных', () => {
    expect(getSingleClassSpellSlots('Колдун', 11, 'dnd5e-2024')).toEqual({
      kind: 'pactMagic',
      slotsByLevel: { 5: 3 },
      recovery: 'short-or-long',
    })
  })

  it('оставляет ручной максимум для неизвестного класса, мультикласса и ошибочного уровня', () => {
    expect(getSingleClassSpellSlots('Жрец / Паладин', 5, 'dnd5e-2024')).toBeNull()
    expect(getSingleClassSpellSlots('Домашний класс', 5, 'dnd5e-2024')).toBeNull()
    expect(getSingleClassSpellSlots('Жрец', 21, 'dnd5e-2024')).toBeNull()
    expect(getSingleClassSpellSlots('Жрец', 2.5, 'dnd5e-2024')).toBeNull()
  })
})
