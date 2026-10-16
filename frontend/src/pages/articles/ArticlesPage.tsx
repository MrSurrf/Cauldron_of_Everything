import { useState } from 'react'

import { Button, Combobox, ListCard, Panel, SegmentedControl, TextInput } from '../../shared/ui'
import { ArticleCard } from './ArticleCard'
import { articleCategories, articleFixtures } from './articleFixtures'
import type { ArticleCategory } from './articleFixtures'
import styles from './ArticlesPage.module.css'

type CategoryFilter = ArticleCategory | 'all'
type ArticleSort = 'newest' | 'popular' | 'shortest'

const PAGE_SIZE = 11
const sortOptions = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'popular', label: 'Сначала популярные' },
  { value: 'shortest', label: 'Сначала короткие' },
] as const
const viewOptions = [
  { value: 'grid', label: 'Плитки' },
  { value: 'list', label: 'Список' },
] as const
const popularArticles = [...articleFixtures]
  .sort((a, b) => b.popularity - a.popularity)
  .slice(0, 5)

function categoryLabel(category: ArticleCategory) {
  return articleCategories.find(item => item.id === category)?.label ?? ''
}

function ArticlesSidebar({ category, onCategoryChange }: {
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
}) {
  const categories = [{ id: 'all', label: 'Все статьи' }, ...articleCategories] as const

  return (
    <aside className={styles.sidebar} aria-label="Подборки и категории статей">
      <Panel className={styles.writePanel} padding="normal">
        <section aria-labelledby="articles-write-title">
          <h2 id="articles-write-title">Напиши статью</h2>
          <p>Поделитесь опытом, идеями и вдохновением с сообществом.</p>
          <Button size="md" fullWidth icon={null} disabled title="Публикация статей скоро станет доступна">
            Создать статью
          </Button>
        </section>
      </Panel>

      <Panel className={styles.sidebarPanel} padding="normal">
        <section aria-labelledby="articles-categories-title">
          <h2 id="articles-categories-title">Категории</h2>
          <ul className={styles.categoryList}>
            {categories.map(item => (
              <li key={item.id}>
                <button type="button" className={styles.categoryRow}
                  aria-pressed={category === item.id} onClick={() => onCategoryChange(item.id)}>
                  <span>{item.label}</span>
                  <span className={styles.categoryCount}>
                    {item.id === 'all' ? articleFixtures.length : articleFixtures.filter(article => article.category === item.id).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </Panel>

      <Panel className={styles.sidebarPanel} padding="normal">
        <section aria-labelledby="articles-popular-title">
          <h2 id="articles-popular-title">Популярные статьи</h2>
          <ol className={styles.popularList}>
            {popularArticles.map((article, index) => (
              <li key={article.id}>
                <ListCard className={styles.popularCard} appearance="navigation"
                  name={article.title} metric={String(index + 1)} metricLabel={`Место в подборке: ${index + 1}`}
                  tags={[`${article.readingMinutes} мин чтения`]} />
              </li>
            ))}
          </ol>
        </section>
      </Panel>

      <Panel className={styles.sidebarPanel} padding="normal">
        <section aria-labelledby="articles-newsletter-title">
          <h2 id="articles-newsletter-title">Не пропускать новые статьи</h2>
          <p className={styles.sidebarDescription}>Получайте лучшие материалы, подборки и новости проекта.</p>
          <div className={styles.newsletter}>
            <TextInput type="email" icon={null} aria-label="Ваш e-mail для подписки"
              placeholder="Ваш e-mail" disabled />
            <Button size="sm" icon={null} disabled>Подписаться</Button>
          </div>
          <p className={styles.comingSoon}>Подписка скоро появится.</p>
        </section>
      </Panel>
    </aside>
  )
}

export default function ArticlesPage() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<ArticleSort>('newest')
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const fullSearch = Boolean(normalizedQuery && submittedQuery === normalizedQuery)
  const filteredArticles = articleFixtures
    .filter(article => category === 'all' || article.category === category)
    .filter(article => !normalizedQuery || (fullSearch
      ? normalizedQuery.split(/\s+/).every(word =>
        [article.title, article.description, article.author, categoryLabel(article.category)]
          .some(value => value.toLocaleLowerCase('ru-RU').includes(word)))
      : article.title.toLocaleLowerCase('ru-RU').startsWith(normalizedQuery)))
    .sort((a, b) => sort === 'popular' ? b.popularity - a.popularity
      : sort === 'shortest' ? a.readingMinutes - b.readingMinutes : b.publishedAt.localeCompare(a.publishedAt))
  const pageCount = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE))
  const visibleArticles = filteredArticles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const featureFirst = view === 'grid' && category === 'all' && !normalizedQuery && page === 1

  function changeCategory(value: CategoryFilter) {
    setCategory(value)
    setPage(1)
  }

  return (
    <main className={styles.page} data-cursor-light-background="">
      <div className={styles.hero}>
        <div className={`${styles.container} ${styles.heroContent}`}>
          <header className={styles.intro}>
            <h1>Статьи</h1>
            <span className={styles.titleDivider} aria-hidden="true" />
            <p>Гайды, разборы, вдохновение и всё, что делает мир НРИ ещё интереснее.</p>
          </header>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div className={styles.search} role="search" aria-label="Поиск по статьям">
            <TextInput type="search" aria-label="Поиск по названию; Enter — поиск по содержимому статей"
              className={styles.searchInput} rootClassName={styles.searchFrame}
              placeholder="Название; Enter — поиск по содержимому" value={query}
              onChange={event => { setQuery(event.target.value); setSubmittedQuery(''); setPage(1) }}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault(); setSubmittedQuery(query.trim().toLocaleLowerCase('ru-RU')); setPage(1)
              } }} />
          </div>
          <div className={styles.displayControls}>
            <Combobox aria-label="Сортировка статей" listboxLabel="Порядок статей"
              options={sortOptions} defaultValue="newest" onValueChange={value => {
                if (value && sortOptions.some(option => option.value === value)) {
                  setSort(value as ArticleSort)
                  setPage(1)
                }
              }} fieldClassName={styles.sortField} />
            <SegmentedControl aria-label="Вид каталога" options={viewOptions} value={view} onValueChange={setView} />
          </div>
        </div>

        <div className={styles.dashboard}>
          <section className={styles.catalog} aria-label="Каталог статей">
            <div className={styles.filters} role="group" aria-label="Фильтр по категории">
              {[{ id: 'all', label: 'Все' }, ...articleCategories].map(item => (
                <Button key={item.id} size="sm" decoration="minimal" icon={null}
                  variant={category === item.id ? 'primary' : 'secondary'}
                  aria-pressed={category === item.id} onClick={() => changeCategory(item.id as CategoryFilter)}>
                  {item.label}
                </Button>
              ))}
            </div>

            <p className={styles.resultCount} role="status">Найдено статей: {filteredArticles.length}</p>
            {visibleArticles.length > 0 ? (
              <>
                <div className={styles.articleGrid} data-view={view}>
                  {visibleArticles.map((article, index) => (
                    <ArticleCard key={article.id} article={article} featured={featureFirst && index === 0} />
                  ))}
                </div>
                <nav className={styles.pagination} aria-label="Страницы каталога статей">
                  <Button size="sm" variant="secondary" decoration="minimal" icon={null}
                    disabled={page === 1} onClick={() => setPage(value => value - 1)}>Назад</Button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => (
                    <Button key={number} size="sm" decoration="minimal" icon={null}
                      variant={number === page ? 'primary' : 'secondary'} aria-label={`Страница ${number}`}
                      aria-current={number === page ? 'page' : undefined} onClick={() => setPage(number)}>
                      {number}
                    </Button>
                  ))}
                  <Button size="sm" variant="secondary" decoration="minimal" icon={null}
                    disabled={page === pageCount} onClick={() => setPage(value => value + 1)}>Далее</Button>
                </nav>
              </>
            ) : (
              <Panel className={styles.emptyPanel} padding="normal">
                <h2>Статьи не найдены</h2>
                <p>Попробуйте другой запрос или выберите другую категорию.</p>
                <Button size="md" variant="secondary" icon={null} onClick={() => { setQuery(''); changeCategory('all') }}>
                  Сбросить фильтры
                </Button>
              </Panel>
            )}
          </section>

          <ArticlesSidebar category={category} onCategoryChange={changeCategory} />
        </div>
      </div>
    </main>
  )
}
