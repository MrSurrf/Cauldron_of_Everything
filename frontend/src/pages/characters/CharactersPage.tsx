import {
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  Button,
  Combobox,
  Panel,
  SegmentedControl,
  TextInput,
} from '../../shared/ui'
import styles from './CharactersPage.module.css'

type CharacterStatus = 'all' | 'campaigns' | 'favorites' | 'archive'
type CharacterSort = 'recent' | 'name' | 'level'
type CharacterView = 'grid' | 'list'

type CharacterPreview = {
  id: string
  name: string
  level: number
  className: string
  race: string
  campaign: string | null
  updatedAt: string
  archived?: boolean
  favorite?: boolean
  glyph: string
  accent: string
}

type CharacterCardStyle = CSSProperties & {
  '--character-accent': string
}

const characters: readonly CharacterPreview[] = [
  {
    id: 'mirena-eldan', name: 'Мирена Эльдан', level: 9, className: 'Жрец', race: 'Человек',
    campaign: 'Пепельные земли', updatedAt: '2026-10-14', favorite: true, glyph: '✦', accent: 'var(--palette-purple-300)',
  },
  {
    id: 'garold', name: 'Гарольд', level: 8, className: 'Воин', race: 'Человек',
    campaign: 'Сломанный трон', updatedAt: '2026-10-11', glyph: '⚔', accent: 'var(--palette-red-500)',
  },
  {
    id: 'serafina', name: 'Серафина', level: 6, className: 'Чародей', race: 'Тифлинг',
    campaign: 'Пепельные земли', updatedAt: '2026-10-09', favorite: true, glyph: '◇', accent: 'var(--palette-purple-500)',
  },
  {
    id: 'kaiden', name: 'Кайден', level: 4, className: 'Плут', race: 'Человек',
    campaign: 'Тени Вальдора', updatedAt: '2026-10-04', glyph: '☽', accent: 'var(--palette-blue-400)',
  },
  {
    id: 'vorraks', name: 'Ворракс', level: 7, className: 'Жрец', race: 'Драконорождённый',
    campaign: 'Сломанный трон', updatedAt: '2026-09-28', glyph: 'ᚱ', accent: 'var(--palette-yellow-500)',
  },
  {
    id: 'mirabel', name: 'Мирабель', level: 5, className: 'Бард', race: 'Человек',
    campaign: 'Песни и клинки', updatedAt: '2026-09-20', favorite: true, glyph: '♪', accent: 'var(--palette-purple-400)',
  },
  {
    id: 'takir', name: 'Та’Кир', level: 3, className: 'Некромант', race: 'Полуэльф',
    campaign: null, updatedAt: '2026-09-12', glyph: '◈', accent: 'var(--palette-cyan-300)',
  },
  {
    id: 'bromdir', name: 'Бромдир', level: 9, className: 'Ремесленник', race: 'Дварф',
    campaign: 'Северный предел', updatedAt: '2026-08-30', glyph: '⚒', accent: 'var(--palette-red-500)',
  },
  {
    id: 'ilara', name: 'Илара', level: 6, className: 'Волшебник', race: 'Эльф',
    campaign: 'Пепельные земли', updatedAt: '2026-08-17', glyph: '✧', accent: 'var(--palette-green-500)',
  },
  {
    id: 'sevard', name: 'Севард', level: 11, className: 'Колдун', race: 'Человек',
    campaign: 'Тени Вальдора', updatedAt: '2026-06-02', archived: true, glyph: '⌁', accent: 'var(--palette-purple-muted)',
  },
]

const statusOptions: readonly { value: CharacterStatus; label: string }[] = [
  { value: 'all', label: 'Все персонажи' },
  { value: 'campaigns', label: 'В кампаниях' },
  { value: 'favorites', label: 'Избранные' },
  { value: 'archive', label: 'Архив' },
]

const sortOptions = [
  { value: 'recent', label: 'Сначала новые' },
  { value: 'name', label: 'По имени' },
  { value: 'level', label: 'По уровню' },
] as const

function PlusIcon() {
  return <svg viewBox="0 0 24 24" role="presentation"><path d="M12 4v16M4 12h16" /></svg>
}

function GridIcon() {
  return <svg viewBox="0 0 24 24" role="presentation"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>
}

function ListIcon() {
  return <svg viewBox="0 0 24 24" role="presentation"><path d="M5 6h14M5 12h14M5 18h14" /></svg>
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" role="presentation">
      <path d="m12 3 2.7 5.55 6.12.89-4.41 4.3 1.04 6.08L12 16.95l-5.45 2.87 1.04-6.08-4.41-4.3 6.12-.89Z" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
}

function CampaignIcon() {
  return <svg viewBox="0 0 24 24" role="presentation"><path d="m4 18 5-10 3 5 2-3 6 8Z" /></svg>
}

function CharacterSigil({ character }: { character: CharacterPreview }) {
  return (
    <span className={styles.sigil} aria-hidden="true">
      <span className={styles.sigilOrbit} />
      <span className={styles.sigilGlyph}>{character.glyph}</span>
      <span className={styles.sigilLevel}>{character.level}</span>
    </span>
  )
}

function CharacterCard({
  character,
  favorite,
  onFavoriteChange,
}: {
  character: CharacterPreview
  favorite: boolean
  onFavoriteChange: (favorite: boolean) => void
}) {
  const cardStyle: CharacterCardStyle = {
    '--character-accent': character.accent,
  }

  return (
    <Panel
      className={styles.characterCard}
      data-archived={character.archived || undefined}
      padding="none"
      style={cardStyle}
    >
      <article className={styles.cardArticle}>
        <Link
          className={styles.cardLink}
          to={`/tools/character-sheet?character=${character.id}`}
          aria-label={`Открыть персонажа ${character.name}`}
        >
          <CharacterSigil character={character} />
          <span className={styles.cardCopy}>
            <span className={styles.cardHeading}>
              <strong>{character.name}</strong>
              <span>Уровень {character.level}</span>
            </span>
            <span className={styles.cardIdentity}>
              {character.className}<i aria-hidden="true" />{character.race}
            </span>
            <span className={styles.campaign} data-empty={!character.campaign || undefined}>
              <CampaignIcon />
              {character.campaign ?? 'Вне кампании'}
            </span>
          </span>
        </Link>

        <button
          type="button"
          className={styles.favoriteButton}
          aria-label={`${favorite ? 'Убрать из избранного' : 'Добавить в избранное'}: ${character.name}`}
          aria-pressed={favorite}
          onClick={() => onFavoriteChange(!favorite)}
        >
          <StarIcon filled={favorite} />
        </button>
      </article>
    </Panel>
  )
}

function uniqueOptions(
  key: 'campaign' | 'race' | 'className',
  allLabel: string,
) {
  const values = characters
    .map((character) => character[key])
    .filter((value): value is string => Boolean(value))
  return [
    { value: 'all', label: allLabel },
    ...Array.from(new Set(values))
      .sort((first, second) => first.localeCompare(second, 'ru'))
      .map((value) => ({ value, label: value })),
  ]
}

const campaignOptions = uniqueOptions('campaign', 'Все кампании')
const raceOptions = uniqueOptions('race', 'Все расы')
const classOptions = uniqueOptions('className', 'Все классы')

export default function CharactersPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<CharacterStatus>('all')
  const [campaign, setCampaign] = useState('all')
  const [race, setRace] = useState('all')
  const [className, setClassName] = useState('all')
  const [sort, setSort] = useState<CharacterSort>('recent')
  const [view, setView] = useState<CharacterView>('grid')
  const [favorites, setFavorites] = useState(
    () => new Set(characters.filter((character) => character.favorite).map((character) => character.id)),
  )

  const counts = useMemo(() => ({
    all: characters.filter((character) => !character.archived).length,
    campaigns: characters.filter((character) => !character.archived && character.campaign).length,
    favorites: characters.filter((character) => !character.archived && favorites.has(character.id)).length,
    archive: characters.filter((character) => character.archived).length,
  }), [favorites])

  const visibleCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')

    return characters
      .filter((character) => status === 'archive' ? character.archived : !character.archived)
      .filter((character) => status !== 'campaigns' || Boolean(character.campaign))
      .filter((character) => status !== 'favorites' || favorites.has(character.id))
      .filter((character) => campaign === 'all' || character.campaign === campaign)
      .filter((character) => race === 'all' || character.race === race)
      .filter((character) => className === 'all' || character.className === className)
      .filter((character) => !normalizedQuery || [
        character.name,
        character.className,
        character.race,
        character.campaign ?? '',
      ].some((value) => value.toLocaleLowerCase('ru-RU').includes(normalizedQuery)))
      .sort((first, second) => sort === 'name'
        ? first.name.localeCompare(second.name, 'ru')
        : sort === 'level'
          ? second.level - first.level
          : second.updatedAt.localeCompare(first.updatedAt))
  }, [campaign, className, favorites, query, race, sort, status])

  function resetFilters() {
    setQuery('')
    setStatus('all')
    setCampaign('all')
    setRace('all')
    setClassName('all')
  }

  return (
    <main className={styles.page} data-cursor-light-background="">
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Личная коллекция</p>
            <h1>Мои персонажи</h1>
            <span className={styles.titleDivider} aria-hidden="true" />
            <p>Все ваши герои, их истории и кампании в одном месте.</p>
          </div>

          <Button
            className={styles.createButton}
            icon={<PlusIcon />}
            size="md"
            onClick={() => navigate('/tools/character-sheet?new=1')}
          >
            Создать персонажа
          </Button>
        </header>

        <section className={styles.controls} aria-label="Поиск и фильтры персонажей">
          <TextInput
            aria-label="Поиск по персонажам"
            className={styles.searchInput}
            placeholder="Имя, класс, раса или кампания..."
            rootClassName={styles.searchFrame}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Combobox
            aria-label="Фильтр по кампании"
            fieldClassName={styles.filterField}
            listboxLabel="Кампании"
            options={campaignOptions}
            value={campaign}
            onValueChange={(value) => setCampaign(value ?? 'all')}
          />
          <Combobox
            aria-label="Фильтр по расе"
            fieldClassName={styles.filterField}
            listboxLabel="Расы"
            options={raceOptions}
            value={race}
            onValueChange={(value) => setRace(value ?? 'all')}
          />
          <Combobox
            aria-label="Фильтр по классу"
            fieldClassName={styles.filterField}
            listboxLabel="Классы"
            options={classOptions}
            value={className}
            onValueChange={(value) => setClassName(value ?? 'all')}
          />
        </section>

        <div className={styles.catalogHeader}>
          <nav className={styles.tabs} aria-label="Разделы персонажей">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-current={status === option.value ? 'page' : undefined}
                onClick={() => setStatus(option.value)}
              >
                {option.label} <span>{counts[option.value]}</span>
              </button>
            ))}
          </nav>

          <div className={styles.displayControls}>
            <Combobox
              aria-label="Сортировка персонажей"
              fieldClassName={styles.sortField}
              listboxLabel="Порядок персонажей"
              options={sortOptions}
              value={sort}
              onValueChange={(value) => {
                if (value && sortOptions.some((option) => option.value === value)) {
                  setSort(value as CharacterSort)
                }
              }}
            />
            <SegmentedControl
              aria-label="Вид списка персонажей"
              className={styles.viewControl}
              options={[
                { value: 'grid', label: <GridIcon />, ariaLabel: 'Плитки' },
                { value: 'list', label: <ListIcon />, ariaLabel: 'Список' },
              ]}
              value={view}
              onValueChange={(value) => setView(value as CharacterView)}
            />
          </div>
        </div>

        <p className={styles.resultCount} role="status">
          {visibleCharacters.length === 0
            ? 'Персонажи не найдены'
            : `Найдено персонажей: ${visibleCharacters.length}`}
        </p>

        {visibleCharacters.length > 0 ? (
          <section className={styles.characterGrid} data-view={view} aria-label="Ваши персонажи">
            {visibleCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                favorite={favorites.has(character.id)}
                onFavoriteChange={(favorite) => {
                  setFavorites((current) => {
                    const next = new Set(current)
                    if (favorite) next.add(character.id)
                    else next.delete(character.id)
                    return next
                  })
                }}
              />
            ))}
          </section>
        ) : (
          <Panel className={styles.emptyState} padding="normal">
            <span className={styles.emptySigil} aria-hidden="true">✦</span>
            <h2>В этой части коллекции пока пусто</h2>
            <p>Измените поисковый запрос или сбросьте выбранные фильтры.</p>
            <Button size="sm" variant="secondary" icon={null} onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </Panel>
        )}
      </div>
    </main>
  )
}
