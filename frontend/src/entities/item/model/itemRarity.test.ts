import { describe, expect, it } from 'vitest'
import { getItemRarity } from './itemRarity'

describe('редкость предмета для цвета иконки', () => {
  it.each([
    ['Обычный', 'common'], ['Обычная', 'common'], ['common', 'common'],
    ['Необычный', 'uncommon'], ['Необычное', 'uncommon'], ['Uncommon', 'uncommon'],
    ['Редкий', 'rare'], ['Редкая', 'rare'], ['Rare', 'rare'],
    ['Очень редкий', 'very-rare'], ['Очень редкое', 'very-rare'], ['Very Rare', 'very-rare'],
    ['very_rare', 'very-rare'], ['very-rare', 'very-rare'],
    ['Легендарный', 'legendary'], ['Легендарная', 'legendary'], ['Legendary', 'legendary'],
    ['Артефакт', 'artifact'], ['Artifact', 'artifact'],
    ['  ОЧЕНЬ\u00a0РЕДКИЙ (требуется настройка) ', 'very-rare'],
  ])('распознаёт %s как %s', (rarity, expected) => {
    expect(getItemRarity(rarity)).toBe(expected)
  })

  it.each([
    undefined, '', 'Редкость не указана', 'Варьируется', 'Редкий или очень редкий',
    'Редкий, очень редкий или легендарный', 'Rare / legendary',
  ])('сохраняет нейтральный цвет для %s', (rarity) => {
    expect(getItemRarity(rarity)).toBe('unknown')
  })
})
