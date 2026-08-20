import type { CharacterSheetDocument } from './characterSheet.types'
import {
  createEmptyCharacterSheet,
  formulaNumericField,
  manualNumericField,
} from './defaults'

export const createMockCharacterSheet = (): CharacterSheetDocument => {
  const sheet = createEmptyCharacterSheet({
    id: 'character-brendon',
    rulesetId: 'dnd5e-2014',
  })

  sheet.identity = {
    name: 'Брендон Вейл',
    portraitUrl: null,
    className: 'Воин',
    subclass: 'Мастер боевых искусств',
    background: 'Солдат',
    race: 'Человек',
    alignment: 'Законно-нейтральный',
    playerName: 'Алексей',
    level: manualNumericField(3),
    experience: manualNumericField(900),
  }

  sheet.abilities.strength.score = manualNumericField(16)
  sheet.abilities.dexterity.score = manualNumericField(15)
  sheet.abilities.constitution.score = manualNumericField(16)
  sheet.abilities.intelligence.score = manualNumericField(9)
  sheet.abilities.wisdom.score = manualNumericField(11)
  sheet.abilities.charisma.score = manualNumericField(13)
  sheet.savingThrows.strength.rank = 'proficient'
  sheet.savingThrows.constitution.rank = 'proficient'
  sheet.skills.athletics.rank = 'proficient'
  sheet.skills.intimidation.rank = 'proficient'
  sheet.skills.perception.rank = 'proficient'
  sheet.skills.survival.rank = 'proficient'
  sheet.proficiencies = {
    languages: ['Общий', 'Дварфский'],
    armor: ['Все доспехи', 'Щиты'],
    weapons: ['Простое оружие', 'Воинское оружие'],
    tools: ['Карты', 'Наземный транспорт'],
    notes: '',
  }
  sheet.derivedStats.armorClass = formulaNumericField(17, '15 + DEX_MOD')
  sheet.derivedStats.speed = manualNumericField(30)
  sheet.hitPoints = {
    maximum: manualNumericField(31),
    current: manualNumericField(24),
    temporary: manualNumericField(0),
  }
  sheet.hitDice = [
    {
      id: 'hit-die-d10',
      die: 'd10',
      current: manualNumericField(3),
      maximum: manualNumericField(3),
    },
  ]
  sheet.resources = [
    {
      id: 'action-surge',
      label: 'Всплеск действий',
      current: manualNumericField(1),
      maximum: manualNumericField(1),
      recovery: 'short',
    },
  ]
  sheet.attacks = [
    {
      id: 'attack-longsword',
      name: 'Длинный меч',
      attackBonus: formulaNumericField(5, 'STR_MOD + PROFICIENCY'),
      damage: '1d8 + 3',
      damageType: 'рубящий',
      notes: 'Универсальное (1d10)',
      itemId: 'item-longsword',
    },
    {
      id: 'attack-light-crossbow',
      name: 'Лёгкий арбалет',
      attackBonus: formulaNumericField(4, 'DEX_MOD + PROFICIENCY'),
      damage: '1d8 + 2',
      damageType: 'колющий',
      notes: 'Дистанция 80/320',
      itemId: 'item-light-crossbow',
    },
  ]
  sheet.currency.gp = manualNumericField(24)
  sheet.currency.sp = manualNumericField(8)
  sheet.inventory = [
    {
      id: 'inventory-chain-mail',
      definition: { kind: 'encyclopedia', itemId: 'item-chain-mail' },
      quantity: 1,
      equipped: true,
      attuned: false,
      notes: '',
      overrides: { armorBonus: 5 },
    },
    {
      id: 'inventory-longsword',
      definition: { kind: 'encyclopedia', itemId: 'item-longsword' },
      quantity: 1,
      equipped: true,
      attuned: false,
      notes: 'Фамильный клинок',
      overrides: {},
    },
    {
      id: 'inventory-memento',
      definition: { kind: 'custom', name: 'Полковой жетон' },
      quantity: 1,
      equipped: false,
      attuned: false,
      notes: 'Память о сослуживцах',
      overrides: {},
    },
  ]
  sheet.personality = {
    traits: [
      { id: 'trait-1', title: '', text: 'Всегда сохраняю спокойствие перед опасностью.' },
    ],
    ideals: [
      { id: 'ideal-1', title: '', text: 'Ответственность. Я защищаю тех, кто рядом.' },
    ],
    bonds: [
      { id: 'bond-1', title: '', text: 'Мой отряд остаётся моей семьёй.' },
    ],
    flaws: [
      { id: 'flaw-1', title: '', text: 'Мне сложно признать поражение.' },
    ],
  }
  sheet.customFields = {
    'second-wind-healing': {
      id: 'second-wind-healing',
      kind: 'computed',
      label: 'Бонус лечения',
      variableKey: 'SECOND_WIND_HEALING',
      value: formulaNumericField(4, '1 + LEVEL'),
    },
    reputation: {
      id: 'reputation',
      kind: 'number',
      label: 'Репутация',
      variableKey: 'REPUTATION',
      value: manualNumericField(2),
    },
  }
  sheet.features = [
    {
      id: 'feature-second-wind',
      category: 'class',
      title: 'Второе дыхание',
      description: 'Бонусным действием восстановите 1d10 + уровень воина хитов.',
      expanded: true,
      uses: {
        current: manualNumericField(1),
        maximum: manualNumericField(1),
      },
      recovery: 'short',
      recoveryLabel: '',
      customFieldIds: ['second-wind-healing'],
      linkedEntityIds: [],
    },
    {
      id: 'feature-fighting-style',
      category: 'class',
      title: 'Боевой стиль: оборона',
      description: 'Пока вы носите доспехи, вы получаете +1 к КД.',
      expanded: false,
      uses: null,
      recovery: null,
      recoveryLabel: '',
      customFieldIds: [],
      linkedEntityIds: [],
    },
  ]
  sheet.customSections = [
    {
      id: 'section-campaign-notes',
      kind: 'collapsible',
      title: 'Заметки кампании',
      expanded: true,
      removable: true,
      fieldIds: ['reputation'],
      text: 'Найти пропавший патруль у северной заставы.',
    },
  ]

  return sheet
}

export const EMPTY_CHARACTER_SHEET: CharacterSheetDocument =
  createEmptyCharacterSheet({ id: 'character-empty' })

export const MOCK_CHARACTER_SHEET: CharacterSheetDocument =
  createMockCharacterSheet()
