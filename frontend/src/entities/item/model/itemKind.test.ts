import { describe, expect, it } from 'vitest'

import { getItemKind, ITEM_KIND_LABELS } from './itemKind'
import type { ItemKind } from './itemKind'

const kinds: [string, ItemKind][] = [
  ['Волшебная палочка', 'wand'],
  ['Доспех', 'armor'],
  ['Свиток', 'scroll'],
  ['Зелье', 'potion'],
  ['Кольцо', 'ring'],
  ['Маг. безделушка', 'wondrous'],
  ['Посох', 'staff'],
  ['Жезл', 'rod'],
  ['Оружие', 'weapon'],
]

describe('getItemKind', () => {
  it.each(kinds)('распознаёт базовый вид %s', (classification, kind) => {
    expect(getItemKind(classification)).toBe(kind)
    expect(ITEM_KIND_LABELS[kind]).toBe(classification)
  })

  it.each(kinds)('отделяет подтип и редкость вида %s', (classification, kind) => {
    expect(getItemKind(`${classification} (подтип), редкий`)).toBe(kind)
    expect(getItemKind(`${classification}, редкий (требуется настройка)`)).toBe(kind)
  })

  it.each([
    ['Чудесный предмет', 'wondrous'],
    ['Волшебная безделушка', 'wondrous'],
    ['Магическая безделушка', 'wondrous'],
    ['Wondrous item (tattoo), rare', 'wondrous'],
    ['Wand', 'wand'],
    ['Armor (shield)', 'armor'],
    ['Armour', 'armor'],
    ['Scroll', 'scroll'],
    ['Potion', 'potion'],
    ['Ring', 'ring'],
    ['Staff', 'staff'],
    ['Rod', 'rod'],
    ['Weapon (longsword)', 'weapon'],
    ['  ВОЛШЕБНАЯ\u00a0 ПАЛОЧКА (любая)  ', 'wand'],
    ['Доспехи [кольчуга]', 'armor'],
  ])('распознаёт вариант классификации %s', (classification, kind) => {
    expect(getItemKind(classification)).toBe(kind)
  })

  it.each([
    undefined,
    '',
    ' ',
    'Тип не указан',
    'Реликвия (кольцо)',
    'Неизвестный предмет, оружие',
    'Волшебная палочка огненных шаров',
    'Кольцо защиты',
    'Оружиеведение',
    'Ring of protection',
    'constructor',
  ])('сохраняет неизвестный вид и не угадывает по названию %s', (classification) => {
    expect(getItemKind(classification)).toBeUndefined()
  })
})
