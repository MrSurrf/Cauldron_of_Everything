import type { CharacterSheetDocument, SpellEntry, SpellLevel } from './characterSheet.types'
import { SPELL_SLOT_LEVELS, formulaNumericField, manualNumericField } from './defaults'
import { createMockCharacterSheet } from './mocks'
import { getSingleClassSpellSlots } from './spellcastingRules'
import { emptyItem, itemToSource } from '../../../shared/ui/ContentEditor/itemContent'

function demoSpell(
  key: string,
  name: string,
  nameEn: string,
  level: SpellLevel,
  details: Partial<SpellEntry> = {},
): SpellEntry {
  return {
    id: `demo-spell-${key}`,
    name,
    nameEn,
    level,
    prepared: true,
    source: 'SRD',
    sourceClassId: 'cleric',
    ...details,
  }
}

function domainSpell(key: string, name: string, nameEn: string, level: SpellLevel, details: Partial<SpellEntry> = {}) {
  return demoSpell(key, name, nameEn, level, {
    alwaysPrepared: true,
    source: 'Домен жизни',
    ...details,
  })
}

/** Демонстрационный жрец 9 уровня: 14 подготовленных заклинаний и 10 заклинаний домена. */
export function createMockSpellcasterSheet(): CharacterSheetDocument {
  const sheet = createMockCharacterSheet()
  sheet.id = 'character-mirena-cleric'
  sheet.rulesetId = 'dnd5e-2024'
  sheet.identity = {
    ...sheet.identity,
    name: 'Мирена Эльдан',
    className: 'Жрец',
    subclass: 'Домен жизни',
    background: 'Послушница',
    race: 'Человек',
    alignment: 'Нейтрально-добрая',
    level: manualNumericField(9),
    experience: manualNumericField(48_000),
  }

  sheet.abilities.strength.score = manualNumericField(12)
  sheet.abilities.dexterity.score = manualNumericField(12)
  sheet.abilities.constitution.score = manualNumericField(14)
  sheet.abilities.intelligence.score = manualNumericField(10)
  sheet.abilities.wisdom.score = manualNumericField(18)
  sheet.abilities.charisma.score = manualNumericField(12)
  for (const savingThrow of Object.values(sheet.savingThrows)) savingThrow.rank = 'none'
  sheet.savingThrows.wisdom.rank = 'proficient'
  sheet.savingThrows.charisma.rank = 'proficient'
  for (const skill of Object.values(sheet.skills)) skill.rank = 'none'
  sheet.skills.insight.rank = 'proficient'
  sheet.skills.medicine.rank = 'proficient'
  sheet.skills.religion.rank = 'proficient'
  sheet.proficiencies = {
    languages: ['Общий', 'Небесный'],
    armor: ['Лёгкие доспехи', 'Средние доспехи', 'Тяжёлые доспехи', 'Щиты'],
    weapons: ['Простое оружие', 'Воинское оружие'],
    tools: [],
    notes: '',
  }
  sheet.derivedStats.armorClass = manualNumericField(18)
  sheet.derivedStats.speed = manualNumericField(30)
  sheet.hitPoints = {
    maximum: manualNumericField(66),
    current: manualNumericField(54),
    temporary: manualNumericField(0),
  }
  sheet.hitDice = [{
    id: 'hit-die-d8',
    die: 'd8',
    current: manualNumericField(7),
    maximum: manualNumericField(9),
  }]
  sheet.resources = [{
    id: 'channel-divinity',
    label: 'Божественный канал',
    current: manualNumericField(2),
    maximum: manualNumericField(3),
    recovery: 'either',
  }]
  sheet.attacks = [{
    id: 'attack-mace',
    name: 'Булава',
    attackBonus: formulaNumericField(5, 'STR_MOD + PROFICIENCY'),
    damage: '1d6 + 1',
    damageType: 'дробящий',
    notes: '',
    itemId: 'item-mace',
  }]
  sheet.equipmentContentText = ['Кольчуга', 'Щит', 'Булава', 'Священный символ']
    .map((title) => itemToSource({ ...emptyItem, title }))
    .join('\n\n')
  sheet.features = [{
    id: 'feature-life-domain',
    category: 'class',
    title: 'Домен жизни',
    description: 'Магия домена помогает исцелять и защищать союзников.',
    expanded: false,
    uses: null,
    recovery: null,
    recoveryLabel: '',
    customFieldIds: [],
    linkedEntityIds: [],
  }]
  sheet.customFields = {}
  sheet.customSections = []
  sheet.personality = {
    traits: [{ id: 'trait-mercy', title: '', text: 'В трудную минуту сначала ищет, кому нужна помощь.' }],
    ideals: [{ id: 'ideal-life', title: '', text: 'Каждая спасённая жизнь стоит усилий.' }],
    bonds: [],
    flaws: [],
  }

  const spellcasting = sheet.spellcasting!
  spellcasting.className = 'Жрец'
  spellcasting.ability = 'wisdom'
  spellcasting.slotMode = 'automatic'
  const progression = getSingleClassSpellSlots('Жрец', 9, 'dnd5e-2024')
  const used: Partial<Record<(typeof SPELL_SLOT_LEVELS)[number], number>> = { 1: 1, 2: 1, 3: 2, 4: 1 }
  for (const level of SPELL_SLOT_LEVELS) {
    spellcasting.slots[level] = {
      maximum: progression?.slotsByLevel[level] ?? 0,
      used: used[level] ?? 0,
    }
  }
  spellcasting.spells = [
    demoSpell('thaumaturgy', 'Чудотворство', 'Thaumaturgy', 0, {
      castingTime: 'Действие', range: '30 футов', duration: 'До 1 минуты', school: 'Преобразование',
      description: 'Небольшое знамение: меняется голос, дрожит земля или появляется иной безвредный эффект.',
    }),
    demoSpell('light', 'Свет', 'Light', 0),
    demoSpell('guidance', 'Указание', 'Guidance', 0, { concentration: true }),
    demoSpell('sacred-flame', 'Священное пламя', 'Sacred Flame', 0),

    demoSpell('command', 'Приказ', 'Command', 1, {
      castingTime: 'Действие', range: '60 футов', duration: '1 раунд', school: 'Очарование',
      description: 'Существо, провалившее спасбросок Мудрости, исполняет краткий приказ.',
    }),
    demoSpell('healing-word', 'Лечащее слово', 'Healing Word', 1),
    demoSpell('guiding-bolt', 'Направляющий снаряд', 'Guiding Bolt', 1),
    demoSpell('shield-of-faith', 'Щит веры', 'Shield of Faith', 1, { concentration: true }),
    domainSpell('bless', 'Благословение', 'Bless', 1, { concentration: true }),
    domainSpell('cure-wounds', 'Лечение ран', 'Cure Wounds', 1),

    domainSpell('lesser-restoration', 'Малое восстановление', 'Lesser Restoration', 2, {
      castingTime: 'Действие', range: 'Касание', duration: 'Мгновенно', school: 'Ограждение',
      description: 'Прекращает одно из ослабляющих состояний у существа, которого вы касаетесь.',
    }),
    demoSpell('spiritual-weapon', 'Божественное оружие', 'Spiritual Weapon', 2, { concentration: true }),
    demoSpell('hold-person', 'Удержание личности', 'Hold Person', 2, { concentration: true }),
    demoSpell('silence', 'Тишина', 'Silence', 2, { concentration: true, ritual: true }),
    domainSpell('aid', 'Подмога', 'Aid', 2),

    demoSpell('spirit-guardians', 'Духовные стражи', 'Spirit Guardians', 3, {
      castingTime: 'Действие', range: 'На себя', duration: 'Концентрация, до 10 минут',
      school: 'Вызов', concentration: true,
      description: 'Вокруг вас движутся духи, которые оберегают союзников и поражают врагов.',
    }),
    demoSpell('dispel-magic', 'Рассеивание магии', 'Dispel Magic', 3),
    demoSpell('speak-with-dead', 'Разговор с мёртвыми', 'Speak with Dead', 3),
    domainSpell('mass-healing-word', 'Массовое лечащее слово', 'Mass Healing Word', 3),
    domainSpell('revivify', 'Возрождение', 'Revivify', 3),

    demoSpell('banishment', 'Изгнание', 'Banishment', 4, {
      castingTime: 'Действие', range: '30 футов', duration: 'Концентрация, до 1 минуты',
      school: 'Ограждение', concentration: true,
      description: 'Временно отправляет цель в другое измерение при провале спасброска.',
    }),
    demoSpell('freedom-of-movement', 'Свобода передвижения', 'Freedom of Movement', 4),
    domainSpell('aura-of-life', 'Аура жизни', 'Aura of Life', 4, { concentration: true }),
    domainSpell('death-ward', 'Защита от смерти', 'Death Ward', 4),

    demoSpell('flame-strike', 'Огненный столп', 'Flame Strike', 5),
    demoSpell('commune', 'Общение', 'Commune', 5, { ritual: true }),
    domainSpell('greater-restoration', 'Высшее восстановление', 'Greater Restoration', 5),
    domainSpell('mass-cure-wounds', 'Массовое лечение ран', 'Mass Cure Wounds', 5),
  ]
  spellcasting.concentratingOnId = 'demo-spell-spirit-guardians'

  return sheet
}
