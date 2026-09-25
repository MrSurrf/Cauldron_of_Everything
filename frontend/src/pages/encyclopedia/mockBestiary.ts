import { mockTarrasque } from '../../entities/creature'
import type { CreatureEntity } from '../../entities/creature'
import type { CatalogCreature } from './bestiaryCatalog'

type MockGroup = {
  names: readonly string[]
  type: string
  sizes: readonly string[]
  alignments: readonly string[]
  habitats: readonly string[]
  languages: readonly string[]
  movements: readonly string[]
  description: string
}

const groups: readonly MockGroup[] = [
  {
    names: ['Ааракокра', 'Авиа', 'Агата Серебряная ложка', 'Альмираж', 'Ангел пепельных крыльев', 'Арло Киттоу', 'Астральный дозорный', 'Аэлон'],
    type: 'Гуманоид', sizes: ['Средний', 'Маленький'],
    alignments: ['нейтральный добрый', 'хаотичный добрый', 'законно нейтральный'],
    habitats: ['Горы', 'Город'], languages: ['Общий', 'Ауран'],
    movements: ['Ходьба', 'Полёт'],
    description: 'Путешественник и разведчик, знакомый с горными тропами и древними руинами.',
  },
  {
    names: ['Амфисбена', 'Болотная гадюка', 'Вепрь зарослей', 'Гигантский скорпион', 'Двуглавый волк', 'Лесная мантикора', 'Пещерный медведь', 'Тростниковый уж'],
    type: 'Зверь', sizes: ['Маленький', 'Средний', 'Большой'],
    alignments: ['без мировоззрения'], habitats: ['Лес', 'Болото'],
    languages: [], movements: ['Ходьба', 'Плавание'],
    description: 'Обитает в дикой местности, выслеживает добычу и скрывается среди густых зарослей.',
  },
  {
    names: ['Аметистовый дракон', 'Бронзовый вирмлинг', 'Вестник грозы', 'Дракон сумерек', 'Звёздный змей', 'Лазурный дракон', 'Рубиновый дракон', 'Хранитель гнезда'],
    type: 'Дракон', sizes: ['Средний', 'Большой', 'Огромный'],
    alignments: ['законно добрый', 'нейтральный', 'хаотичный злой'],
    habitats: ['Горы', 'Пещеры'], languages: ['Драконий', 'Общий'],
    movements: ['Ходьба', 'Полёт'],
    description: 'Древнее крылатое существо охраняет сокровища и владеет разрушительным дыханием.',
  },
  {
    names: ['Астральная зараза', 'Безликий шептун', 'Глаз пустоты', 'Ловец мыслей', 'Морок из Бездны', 'Ночной наблюдатель', 'Пожиратель памяти', 'Слуга иной звезды'],
    type: 'Аберрация', sizes: ['Средний', 'Большой'],
    alignments: ['хаотичный злой', 'нейтральный злой'],
    habitats: ['Астрал', 'Подземье'], languages: ['Глубинная речь', 'Телепатия'],
    movements: ['Ходьба', 'Полёт'],
    description: 'Чуждая разуму тварь искажает восприятие и питается страхами существ.',
  },
  {
    names: ['Алый призрак', 'Восставший рыцарь', 'Забытый архивариус', 'Костяной дозорный', 'Могильная тень', 'Проклятый капитан', 'Скелет стража', 'Шёпот склепа'],
    type: 'Нежить', sizes: ['Средний', 'Большой'],
    alignments: ['законно злой', 'нейтральный злой'],
    habitats: ['Руины', 'Подземье'], languages: ['Общий', 'Некротический'],
    movements: ['Ходьба'],
    description: 'Бродит среди древних захоронений, неся на себе следы забытого проклятия.',
  },
  {
    names: ['Буревестный элементаль', 'Глиняный голем', 'Железный страж', 'Искра вулкана', 'Каменный великан', 'Механический охотник', 'Песчаный дух', 'Стеклянный часовой'],
    type: 'Конструкт', sizes: ['Средний', 'Большой', 'Огромный'],
    alignments: ['без мировоззрения', 'законно нейтральный'],
    habitats: ['Руины', 'Пустыня'], languages: ['Общий', 'Первичный'],
    movements: ['Ходьба', 'Рытьё'],
    description: 'Охраняет забытые мастерские и выполняет заложенный создателем приказ.',
  },
]

const ratings = ['0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '8', '10', '12', '15']
const named = new Set(['Агата Серебряная ложка', 'Арло Киттоу', 'Забытый архивариус', 'Проклятый капитан'])

function makeCreature(group: MockGroup, groupIndex: number, index: number): CatalogCreature {
  const id = groupIndex * 8 + index + 1
  const name = group.names[index]
  const challengeRating = ratings[(groupIndex * 3 + index) % ratings.length]
  const size = group.sizes[index % group.sizes.length]
  const alignment = group.alignments[index % group.alignments.length]
  const homebrew = (groupIndex + index) % 7 === 0
  const sources = [homebrew ? 'Моковые легенды · Homebrew' : ['Бестиарий', 'Классика', 'Путеводитель мастера'][index % 3]]
  const habitats = [...group.habitats]
  const languages = [...group.languages]
  const movements = [...group.movements]
  const isNamedNpc = named.has(name)
  const contentText = `${group.description} ${name}. ${name === 'Арло Киттоу' ? 'Опытный исследователь и авантюрист.' : ''} Местность: ${habitats.join(', ')}. Языки: ${languages.join(', ') || 'нет'}. Скорость: ${movements.join(', ')}.`
  const speed = movements.map((movement, movementIndex) =>
    movement === 'Ходьба' ? `${30 + index * 5} фт.` : `${movement.toLowerCase()} ${20 + movementIndex * 10} фт.`,
  ).join(', ')
  const entity: CreatureEntity = {
    id: String(id), entityType: 'creature', slug: `mock-creature-${id}`,
    name, size, creatureType: group.type, alignment, challengeRating,
    armorClass: { value: 10 + groupIndex + index },
    hitPoints: String(12 + (groupIndex + 1) * (index + 2) * 5),
    speed,
    languages,
    habitat: habitats,
    sections: [{ id: `mock-description-${id}`, type: 'description', title: 'Описание', html: `<p>${group.description}</p>` }],
  }
  return {
    id, slug: entity.slug, name, nameEn: '', challengeRating, size,
    creatureType: group.type, alignment, sources, homebrew,
    namedNpc: isNamedNpc, languages, habitats, movements, contentText, entity,
  }
}

const tarrasque: CatalogCreature = {
  id: 49,
  slug: mockTarrasque.slug,
  name: mockTarrasque.name,
  nameEn: mockTarrasque.nameEn,
  challengeRating: mockTarrasque.challengeRating,
  size: mockTarrasque.size,
  creatureType: mockTarrasque.creatureType,
  alignment: mockTarrasque.alignment,
  sources: ['Бестиарий'],
  homebrew: false,
  namedNpc: false,
  languages: [...(mockTarrasque.languages ?? [])],
  habitats: ['Равнины'],
  movements: ['Ходьба', 'Полёт', 'Лазание', 'Плавание'],
  contentText: 'Тараск — исполинское бедствие. Его панцирь отражает магию, а каждый шаг ощущается как землетрясение.',
  fullRecord: true,
  entity: mockTarrasque,
}

export const mockBestiaryCatalog: readonly CatalogCreature[] = [
  ...groups.flatMap((group, groupIndex) =>
    group.names.map((_, index) => makeCreature(group, groupIndex, index)),
  ),
  tarrasque,
]
