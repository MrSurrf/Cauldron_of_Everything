import type {
  AbilityKey,
  CurrencyKey,
  PersonalitySectionKey,
} from '../../model'

export const abilityLabels: Readonly<Record<
  AbilityKey,
  { abbreviation: string; label: string }
>> = {
  strength: { abbreviation: 'STR', label: 'Сила' },
  dexterity: { abbreviation: 'DEX', label: 'Ловкость' },
  constitution: { abbreviation: 'CON', label: 'Телосложение' },
  intelligence: { abbreviation: 'INT', label: 'Интеллект' },
  wisdom: { abbreviation: 'WIS', label: 'Мудрость' },
  charisma: { abbreviation: 'CHA', label: 'Харизма' },
}

export const currencyLabels: Readonly<Record<CurrencyKey, string>> = {
  cp: 'ММ',
  sp: 'СМ',
  ep: 'ЭМ',
  gp: 'ЗМ',
  pp: 'ПМ',
}

export const personalityLabels: Readonly<Record<
  PersonalitySectionKey,
  string
>> = {
  traits: 'Черты характера',
  ideals: 'Идеалы',
  bonds: 'Привязанности',
  flaws: 'Слабости',
}

export const mockItemNames: Readonly<Record<string, string>> = {
  'item-chain-mail': 'Кольчуга',
  'item-longsword': 'Длинный меч',
  'item-light-crossbow': 'Лёгкий арбалет',
}
