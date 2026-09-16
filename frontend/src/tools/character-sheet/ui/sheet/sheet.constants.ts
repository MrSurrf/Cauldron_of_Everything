import type {
  AbilityKey,
  CurrencyKey,
  PersonalitySectionKey,
} from '../../model'

export const abilityLabels: Readonly<Record<
  AbilityKey,
  {
    formulaAbbreviation: string
    label: string
    shortLabel: string
  }
>> = {
  strength: {
    formulaAbbreviation: 'STR',
    label: 'Сила',
    shortLabel: 'СИЛ',
  },
  dexterity: {
    formulaAbbreviation: 'DEX',
    label: 'Ловкость',
    shortLabel: 'ЛОВ',
  },
  constitution: {
    formulaAbbreviation: 'CON',
    label: 'Телосложение',
    shortLabel: 'ТЕЛ',
  },
  intelligence: {
    formulaAbbreviation: 'INT',
    label: 'Интеллект',
    shortLabel: 'ИНТ',
  },
  wisdom: {
    formulaAbbreviation: 'WIS',
    label: 'Мудрость',
    shortLabel: 'МУД',
  },
  charisma: {
    formulaAbbreviation: 'CHA',
    label: 'Харизма',
    shortLabel: 'ХАР',
  },
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
