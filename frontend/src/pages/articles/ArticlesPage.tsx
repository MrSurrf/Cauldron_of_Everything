import { useState } from 'react'

import { Button, Combobox, ListCard, Panel, SegmentedControl, TextInput } from '../../shared/ui'
import { articleCategories, articleFixtures } from './articleFixtures'
import type { ArticleCategory, ArticlePreview } from './articleFixtures'
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
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
})
const popularArticles = [...articleFixtures]
  .sort((a, b) => b.popularity - a.popularity)
  .slice(0, 5)

function categoryLabel(category: ArticleCategory) {
  return articleCategories.find(item => item.id === category)?.label ?? ''
}

function ArticleCard({ article, featured }: { article: ArticlePreview; featured: boolean }) {
  const titleId = `article-title-${article.id}`

  return (
    <article className={styles.article} data-featured={featured || undefined} aria-labelledby={titleId}>
      <Panel className={styles.articlePanel} padding="none">
        <div className={styles.articleContent}>
          <div className={styles.cover} aria-hidden="true" />
          <div className={styles.articleCopy}>
            <span className={styles.categoryBadge}>{categoryLabel(article.category)}</span>
            <h2 id={titleId}>{article.title}</h2>
            <p className={styles.description}>{article.description}</p>
            <footer className={styles.articleMeta}>
              <div className={styles.author}>
                <span>{article.author}</span>
                <time dateTime={article.publishedAt}>{dateFormatter.format(new Date(`${article.publishedAt}T00:00:00Z`))}</time>
              </div>
              <span className={styles.readingTime}>{article.readingMinutes} мин чтения</span>
            </footer>
          </div>
        </div>
      </Panel>
    </article>
  )
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
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<ArticleSort>('newest')
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const filteredArticles = articleFixtures
    .filter(article => category === 'all' || article.category === category)
    .filter(article => !normalizedQuery || [article.title, article.description, article.author, categoryLabel(article.category)]
      .some(value => value.toLocaleLowerCase('ru-RU').includes(normalizedQuery)))
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
            <TextInput type="search" icon={null} aria-label="Поиск статей, тем или авторов"
              placeholder="Поиск статей, тем или авторов…" value={query}
              onChange={event => { setQuery(event.target.value); setPage(1) }} />
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
