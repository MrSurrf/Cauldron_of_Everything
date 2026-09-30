import { describe, expect, it } from 'vitest'

import { catalogFirstLetter, catalogNameKey } from './catalogAlphabet'

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
})
