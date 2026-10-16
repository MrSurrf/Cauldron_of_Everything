export const profileTabs = [
  { id: 'personalization', label: 'Персонализация' },
  { id: 'about', label: 'О себе' },
  { id: 'activity', label: 'Активность' },
  { id: 'achievements', label: 'Достижения' },
  { id: 'privacy', label: 'Приватность' },
] as const

export type ProfileTab = typeof profileTabs[number]['id']
export const gameSystems = ['Dungeons & Dragons 5e', 'Pathfinder 2e', 'Call of Cthulhu', 'Vampire: The Masquerade', 'Blades in the Dark']
export const playStyles = ['Ролевая игра и отыгрыш', 'Политика и интриги', 'Глубокий лор и мир', 'Тактические сражения', 'Исследование и загадки', 'Юмор и лёгкий тон']
export const genres = ['Тёмное фэнтези', 'Готика', 'Ужасы', 'Мистика', 'Исследования', 'Древние цивилизации']
export const themes = [
  { value: 'purple', label: 'Аметист', color: 'var(--palette-purple-400)' },
  { value: 'blue', label: 'Сапфир', color: 'var(--palette-blue-400)' },
  { value: 'green', label: 'Изумруд', color: 'var(--palette-green-500)' },
  { value: 'gold', label: 'Янтарь', color: 'var(--palette-yellow-500)' },
] as const
export const visibilityOptions = [
  { value: 'all', label: 'Все пользователи' },
  { value: 'friends', label: 'Только друзья' },
  { value: 'none', label: 'Только я' },
]
export const privacyFields = [
  { key: 'online', label: 'Показывать статус «Онлайн»' },
  { key: 'activity', label: 'Показывать активность' },
  { key: 'articles', label: 'Показывать статьи' },
  { key: 'characters', label: 'Показывать чарлисты' },
  { key: 'followers', label: 'Показывать количество подписчиков' },
  { key: 'city', label: 'Показывать город' },
] as const

export type ProfileData = {
  name: string
  tagline: string
  city: string
  title: string
  role: string
  bio: string
  quote: string
  portrait: string | null
  theme: string
  systems: string[]
  styles: string[]
  genres: string[]
  links: { label: string; value: string }[]
  visibility: string
  messages: string
  privacy: Record<typeof privacyFields[number]['key'], boolean>
}

export const initialProfile: ProfileData = {
  name: 'Babaika',
  tagline: 'Бросаю кубики и строю миры',
  city: 'Москва',
  title: 'Мастер миров',
  role: 'Мастер',
  bio: 'Привет! Я Babaika — игрок, мастер и вечный исследователь вымышленных миров. Люблю глубоких персонажей, моральные дилеммы и истории, в которых мрак и надежда идут рука об руку. Особенно тянет к тёмному фэнтези, готике и всему, где есть место тайнам, потерянным империям и странным богам.\n\nИграю, чтобы наблюдать, как рождаются истории, которые остаются с нами надолго.',
  quote: 'Хорошая история начинается с правильной компании.',
  portrait: null,
  theme: 'purple',
  systems: gameSystems.slice(0, 3),
  styles: [playStyles[0], playStyles[1], playStyles[2], playStyles[4]],
  genres: genres.slice(0, 5),
  links: [{ label: 'Discord', value: 'babaika_rpg' }, { label: 'Telegram', value: '@babaika_rpg' }, { label: 'ВКонтакте', value: 'vk.com/babaika' }],
  visibility: 'all',
  messages: 'all',
  privacy: { online: true, activity: true, articles: true, characters: true, followers: true, city: true },
}

export const activityFilters = ['Все', 'Статьи', 'Игры', 'Чарлисты', 'Сообщество']
export const activityItems = [
  { id: 1, category: 'Статьи', action: 'Опубликована статья', title: 'Города, которые помнят', description: 'Исследование живых городов в фэнтези-мирах и того, как они влияют на историю.', date: '2 часа назад' },
  { id: 2, category: 'Чарлисты', action: 'Обновлён чарлист', title: 'NPC: союзники и антагонисты', description: 'Новые персонажи, связи и заметки по текущей кампании.', date: 'Вчера' },
  { id: 3, category: 'Игры', action: 'Проведена игра', title: 'Пепельные земли', description: 'Четыре героя, одна исчезнувшая империя и история, которая только начинается.', date: '2 дня назад' },
  { id: 4, category: 'Сообщество', action: 'Оставлен комментарий', title: 'Искусство мастерства', description: 'Обсуждаем, как дать каждому персонажу место в общей истории.', date: '3 дня назад' },
  { id: 5, category: 'Сообщество', action: 'Вступление в клуб', title: 'Писатели миров', description: 'Сообщество авторов, мастеров и любителей миростроения.', date: 'Неделю назад' },
]
