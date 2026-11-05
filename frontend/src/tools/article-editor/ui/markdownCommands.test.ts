import { describe, expect, it } from 'vitest'

import { applyMarkdownCommand, escapeMarkdownLabel } from './markdownCommands'
import type { MarkdownCommand } from './markdownCommands'

describe('Команды Markdown', () => {
  it.each([
    ['bold', '**мир**', 2], ['italic', '*мир*', 1], ['strike', '~~мир~~', 2],
    ['underline', '<u>мир</u>', 3], ['code', '`мир`', 1],
  ] as const)('оборачивает выделение: %s', (command, expected, offset) => {
    const result = applyMarkdownCommand('мир', { start: 0, end: 3 }, command)
    expect(result.value).toBe(expected)
    expect(result.selection).toEqual({ start: offset, end: offset + 3 })
  })

  it('сохраняет префикс/суффикс и выделяет вставленный placeholder у пустой каретки', () => {
    const result = applyMarkdownCommand('До  после', { start: 3, end: 3 }, 'bold')
    expect(result.value).toBe('До **текст** после')
    expect(result.value.slice(result.selection.start, result.selection.end)).toBe('текст')
  })

  it.each([
    ['heading', '## Первая\n## Вторая'], ['list', '- Первая\n- Вторая'],
    ['ordered', '1. Первая\n2. Вторая'], ['quote', '> Первая\n> Вторая'],
  ] satisfies [MarkdownCommand, string][])('применяет команду к выделенным строкам: %s', (command, expected) => {
    const result = applyMarkdownCommand('Первая\nВторая\nТретья', { start: 1, end: 13 }, command)
    expect(result.value).toBe(`${expected}\nТретья`)
    expect(result.value.slice(result.selection.start, result.selection.end)).toBe(expected)
  })

  it('вставляет ссылку и выделяет адрес вместо потери исходного текста', () => {
    const result = applyMarkdownCommand('Мой источник.', { start: 4, end: 12 }, 'link')
    expect(result.value).toBe('Мой [источник](https://).')
    expect(result.value.slice(result.selection.start, result.selection.end)).toBe('https://')
  })

  it('экранирует подписи фотографий и карточек, но не меняет русский текст', () => {
    expect(escapeMarkdownLabel('Щит [PHB] \\ путь\nОписание')).toBe('Щит \\[PHB\\] \\\\ путь Описание')
  })
})
