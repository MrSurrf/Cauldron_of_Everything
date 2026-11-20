import { describe, expect, it } from 'vitest'

import { catalogFirstLetter, catalogNameKey, catalogNameStartsWith } from './catalogAlphabet'

describe('алфавитный ключ каталога', () => {
  it('пропускает кавычки и другую пунктуацию перед названием', () => {
    expect(catalogFirstLetter('«Демогоргон»')).toBe('Д')
    expect(catalogFirstLetter('?!  (аболет)')).toBe('А')
    expect(catalogNameKey('  — «Баньши»')).toBe('Баньши»')
  })

  it('оставляет запасную группу для строк без букв', () => {
    expect(catalogFirstLetter('?!')).toBe('#')
    expect(catalogFirstLetter('')).toBe('#')
  })

  it('фильтрует только начало названия без учёта регистра и начальной пунктуации', () => {
    expect(catalogNameStartsWith('«Аббат»', 'а')).toBe(true)
    expect(catalogNameStartsWith('Аббат', 'Аб')).toBe(true)
    expect(catalogNameStartsWith('Ведьма', 'едь')).toBe(false)
    expect(catalogNameStartsWith('Берёзовый дух', 'берез')).toBe(true)
  })
})
