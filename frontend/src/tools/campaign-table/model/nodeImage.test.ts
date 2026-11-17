import { describe, expect, it } from 'vitest'
import { imageNodeTitle, nodeImageField, nodeImageKind } from './nodeImage'

describe('изображения нод кампании', () => {
  it.each(['playerCharacter', 'npc'] as const)('использует портрет для %s', (type) => {
    expect(nodeImageKind(type)).toBe('avatar')
    expect(nodeImageField(type)).toBe('avatarAssetId')
  })

  it.each(['location', 'creature', 'item'] as const)('использует обложку для %s', (type) => {
    expect(nodeImageKind(type)).toBe('cover')
    expect(nodeImageField(type)).toBe('coverAssetId')
  })

  it('не принимает изображения для нод без медиа-контракта', () => {
    expect(nodeImageKind('spell')).toBeNull()
    expect(nodeImageField('note')).toBeNull()
  })

  it('получает читаемое название из имени файла', () => {
    expect(imageNodeTitle('Заброшенный_храм.webp')).toBe('Заброшенный храм')
    expect(imageNodeTitle('captain-of-guard.png')).toBe('captain of guard')
    expect(imageNodeTitle('.png')).toBe('Новое изображение')
  })
})
