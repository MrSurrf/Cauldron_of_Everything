/**
 * Возвращает часть названия, начиная с первой буквы.
 * Кавычки, скобки и прочая служебная пунктуация в начале не влияют
 * на алфавитную сортировку и группировку каталога.
 */
export function catalogNameKey(value: string): string {
  const firstLetterIndex = value.search(/\p{L}/u)
  return firstLetterIndex >= 0 ? value.slice(firstLetterIndex) : value.trim()
}

export function catalogFirstLetter(value: string): string {
  const firstLetter = catalogNameKey(value).match(/\p{L}/u)?.[0]
  return firstLetter?.toLocaleUpperCase('ru-RU') ?? '#'
}
