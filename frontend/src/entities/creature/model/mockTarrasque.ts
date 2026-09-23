import type { CreatureEntity } from './creature'

export const mockTarrasque = {
  id: 'creature-tarrasque',
  entityType: 'creature',
  slug: 'tarrasque',
  name: 'Тараск',
  nameEn: 'Tarrasque',
  size: 'Громадный',
  creatureType: 'монстр',
  alignment: 'без мировоззрения',
  armorClass: {
    value: 25,
    details: ['природный доспех'],
  },
  hitPoints: '676 (33к20 + 330)',
  // Дополнительные скорости и виды зрения — стресс-тест UI, не свойства Тараска.
  speed: '40 фт., полёт 60 фт., лазание 20 фт., плавание 30 фт.',
  abilities: {
    strength: { score: 30 },
    dexterity: { score: 11 },
    constitution: { score: 30 },
    intelligence: { score: 3 },
    wisdom: { score: 11 },
    charisma: { score: 11 },
  },
  savingThrows: {
    intelligence: '+5',
    wisdom: '+9',
    charisma: '+9',
  },
  skills: {
    Внимательность: '+9',
  },
  damageAffinities: [
    {
      damageType: 'fire',
      physical: 'immunity',
      magical: 'immunity',
    },
    {
      damageType: 'poison',
      physical: 'immunity',
      magical: 'immunity',
    },
    {
      damageType: 'bludgeoning',
      physical: 'immunity',
      magical: 'normal',
    },
    {
      damageType: 'piercing',
      physical: 'immunity',
      magical: 'normal',
    },
    {
      damageType: 'slashing',
      physical: 'immunity',
      magical: 'normal',
    },
    // Демонстрационные состояния для проверки UI, не игровые свойства Тараска.
    {
      damageType: 'cold',
      physical: 'resistance',
      magical: 'resistance',
    },
    {
      damageType: 'acid',
      physical: 'vulnerability',
      magical: 'normal',
    },
    {
      damageType: 'force',
      physical: 'resistance',
      magical: 'vulnerability',
    },
    {
      damageType: 'psychic',
      physical: 'vulnerability',
      magical: 'vulnerability',
    },
    {
      damageType: 'lightning',
      physical: 'resistance',
      magical: 'immunity',
    },
    {
      damageType: 'thunder',
      physical: 'normal',
      magical: 'resistance',
    },
    {
      damageType: 'necrotic',
      physical: 'normal',
      magical: 'vulnerability',
    },
    {
      damageType: 'radiant',
      physical: 'normal',
      magical: 'immunity',
    },
  ],
  conditionImmunities: [
    'испуг',
    'очарование',
    'отравление',
    'паралич',
  ],
  vision: [
    { type: 'normal' },
    { type: 'blindsight', range: 120 },
    { type: 'darkvision', range: 120 },
    { type: 'tremorsense', range: 60 },
    { type: 'truesight', range: 120 },
  ],
  passivePerception: 19,
  languages: ['—'],
  challengeRating: '30 (155 000 опыта)',
  proficiencyBonus: '+9',
  habitat: [
    'глубины земли',
    'руины',
    'места древних катастроф',
  ],
  sections: [
    {
      id: 'tarrasque-description',
      type: 'description',
      title: 'Описание',
      html: '<p>Тараск — исполинское бедствие, пробуждающееся лишь затем, чтобы сокрушать города и менять очертания земель. Его панцирь отражает магию, а каждый шаг ощущается как землетрясение.</p>',
    },
    {
      id: 'tarrasque-traits',
      type: 'traits',
      title: 'Особенности',
      html: '<p><strong>Легендарное сопротивление.</strong> Если Тараск проваливает спасбросок, он может вместо этого считать его успешным.</p><p><strong>Магический панцирь.</strong> Панцирь чудовища затрудняет попадание заклинаний и способен обратить направленную магию против её создателя.</p><p><strong>Осадное чудовище.</strong> Тараск наносит удвоенный урон строениям и предметам.</p>',
    },
    {
      id: 'tarrasque-actions',
      type: 'actions',
      title: 'Действия',
      html: '<p><strong>Мультиатака.</strong> Тараск обрушивает на противников укус, рога, когти и удар хвостом.</p><p><strong>Укус.</strong> Мощная атака по существу рядом. Цель может оказаться схваченной и проглоченной.</p><p><strong>Коготь.</strong> Размашистый удар по ближайшей цели.</p><p><strong>Хвост.</strong> Удар способен сбить огромное существо с ног.</p><p><strong>Поглощение.</strong> Схваченное существо исчезает в утробе Тараска и получает урон в начале каждого его хода.</p>',
    },
    {
      id: 'tarrasque-legendary-actions',
      type: 'legendary-actions',
      title: 'Легендарные действия',
      html: '<p>Тараск совершает легендарные действия в конце ходов других существ.</p><ul><li><strong>Атака.</strong> Совершает одну атаку когтем или хвостом.</li><li><strong>Перемещение.</strong> Движется на половину скорости.</li><li><strong>Жевание.</strong> Совершает атаку укусом или пытается проглотить схваченную цель.</li></ul>',
    },
    {
      id: 'tarrasque-regional-effects',
      type: 'regional-effects',
      title: 'След катастрофы',
      html: '<p>Даже после ухода чудовища земля хранит следы его пробуждения: рушатся старые тоннели, пересыхают источники, а звери покидают окрестности.</p>',
    },
  ],
} satisfies CreatureEntity
