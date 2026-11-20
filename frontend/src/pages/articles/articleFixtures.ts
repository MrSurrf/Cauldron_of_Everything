// Демонстрационные материалы для вёрстки каталога; API статей пока не подключён.
export const articleCategories = [
  { id: 'guides', label: 'Гайды' },
  { id: 'systems', label: 'Разборы систем' },
  { id: 'game-mastering', label: 'Мастеринг' },
  { id: 'worldbuilding', label: 'Миростроение' },
  { id: 'characters', label: 'Персонажи' },
  { id: 'adventures', label: 'Сюжеты и приключения' },
  { id: 'inspiration', label: 'Вдохновение' },
  { id: 'other', label: 'Другое' },
] as const

export type ArticleCategory = (typeof articleCategories)[number]['id']

export type ArticlePreview = {
  id: string
  title: string
  description: string
  category: ArticleCategory
  author: string
  publishedAt: string
  readingMinutes: number
  popularity: number
}

export const articleFixtures: readonly ArticlePreview[] = [
  {
    id: 'first-game',
    title: 'Как вести первую игру: полный гайд для начинающего ГМа',
    description: 'Подготовка, структура сессии, работа с игроками и частые ошибки — всё, что нужно знать, чтобы начать вести уверенно.',
    category: 'game-mastering',
    author: 'Алекс Найт',
    publishedAt: '2026-10-12',
    readingMinutes: 15,
    popularity: 100,
  },
  {
    id: 'living-cities',
    title: 'Как создавать живые города',
    description: 'Структура, атмосфера, фракции и детали, которые делают город настоящим.',
    category: 'worldbuilding',
    author: 'Мира Эллин',
    publishedAt: '2026-10-09',
    readingMinutes: 12,
    popularity: 80,
  },
  {
    id: 'dnd-2026',
    title: 'D&D 5e в 2026: что изменилось и как это влияет на игру',
    description: 'Разбираем новые правила, актуальные дополнения и то, что стоит учитывать в домашней игре.',
    category: 'systems',
    author: 'Кирилл Вест',
    publishedAt: '2026-10-06',
    readingMinutes: 10,
    popularity: 55,
  },
  {
    id: 'deep-backstories',
    title: 'Глубокие предыстории: больше, чем «я был фермером»',
    description: 'Как писать предыстории, которые действительно работают в игре.',
    category: 'characters',
    author: 'Лина Орлова',
    publishedAt: '2026-10-04',
    readingMinutes: 8,
    popularity: 85,
  },
  {
    id: 'oneshot-ideas',
    title: 'Пять идей для ваншотов на любой случай',
    description: 'Готовые концепты, которые можно адаптировать под свою систему и игроков.',
    category: 'adventures',
    author: 'Сергей Дракон',
    publishedAt: '2026-10-01',
    readingMinutes: 10,
    popularity: 90,
  },
  {
    id: 'fantasy-religions',
    title: 'Религии в фэнтези-мире',
    description: 'Как создавать верования, культы и пантеоны, которые влияют на историю и персонажей.',
    category: 'worldbuilding',
    author: 'Мира Эллин',
    publishedAt: '2026-09-28',
    readingMinutes: 14,
    popularity: 60,
  },
  {
    id: 'table-atmosphere',
    title: 'Атмосфера за столом: музыка, свет и мелочи',
    description: 'Практические советы, как создать нужное настроение для игры.',
    category: 'inspiration',
    author: 'Алекс Найт',
    publishedAt: '2026-09-25',
    readingMinutes: 6,
    popularity: 75,
  },
  {
    id: 'pathfinder-start',
    title: 'Pathfinder 2e: с чего начать',
    description: 'Краткий обзор системы, ключевых механик и отличий от 5e.',
    category: 'systems',
    author: 'Тимур Лесной',
    publishedAt: '2026-09-22',
    readingMinutes: 11,
    popularity: 50,
  },
  {
    id: 'difficult-players',
    title: 'Как работать с трудными игроками',
    description: 'Конструктивные подходы к сложным ситуациям за столом.',
    category: 'game-mastering',
    author: 'Алекс Найт',
    publishedAt: '2026-09-19',
    readingMinutes: 9,
    popularity: 65,
  },
  {
    id: 'character-arcs',
    title: 'Арки персонажей: от идеи до финала',
    description: 'Как выстраивать развитие героя, чтобы история была цельной и эмоциональной.',
    category: 'characters',
    author: 'Лина Орлова',
    publishedAt: '2026-09-17',
    readingMinutes: 13,
    popularity: 45,
  },
  {
    id: 'rpg-in-russia',
    title: 'НРИ в России: история и современность',
    description: 'Как развивалось хобби, какие сообщества существуют и куда оно движется сейчас.',
    category: 'other',
    author: 'Иван Чернов',
    publishedAt: '2026-09-14',
    readingMinutes: 10,
    popularity: 40,
  },
]
