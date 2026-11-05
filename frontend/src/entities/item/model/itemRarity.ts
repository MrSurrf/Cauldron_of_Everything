export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary' | 'artifact' | 'unknown'

/** Неопределённая или зависящая от варианта редкость остаётся нейтральной. */
export function getItemRarity(rarity: string | undefined): ItemRarity {
  const label = (rarity ?? '').split(/[([]/, 1)[0].trim().toLocaleLowerCase('ru-RU')
    .replace(/[_-]/g, ' ').replace(/\s+/g, ' ')

  if (/^(common|обычн(?:ый|ая|ое|ые))$/.test(label)) return 'common'
  if (/^(uncommon|необычн(?:ый|ая|ое|ые))$/.test(label)) return 'uncommon'
  if (/^(rare|редк(?:ий|ая|ое|ие))$/.test(label)) return 'rare'
  if (/^(very rare|очень редк(?:ий|ая|ое|ие))$/.test(label)) return 'very-rare'
  if (/^(legendary|легендарн(?:ый|ая|ое|ые))$/.test(label)) return 'legendary'
  if (/^(artifact|артефакт)$/.test(label)) return 'artifact'
  return 'unknown'
}
