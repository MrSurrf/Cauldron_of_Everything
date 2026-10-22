import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { recordVisit } from '../../entities/encyclopedia'
import { Button, Combobox, Panel, PlaceholderIcon } from '../../shared/ui'
import { type CatalogClass, type ClassCollection, filterClasses, loadClasses } from './classCatalog'
import { entryPath } from './encyclopediaApi'
import { EncyclopediaQuickNav } from './EncyclopediaQuickNav'
import styles from './ClassesPage.module.css'

type CollectionFilter = 'all' | ClassCollection
type ViewMode = 'grid' | 'list'

const collectionTabs: { value: CollectionFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'base', label: 'Базовые' },
  { value: 'expanded', label: 'Расширенные' },
]

const optionList = (values: readonly string[]) => [...new Set(values)]
  .sort((left, right) => left.localeCompare(right, 'ru'))
  .map(value => ({ value, label: value }))

function ClassCard({ entry }: { entry: CatalogClass }) {
  return <Link className={styles.cardLink} to={entryPath(entry)}>
    <Panel className={styles.card} padding="compact">
      <article className={styles.cardBody}>
        <div className={styles.cardIcon} aria-hidden="true"><PlaceholderIcon /></div>
        <div className={styles.cardCopy}>
          <div className={styles.cardTitle}>
            <span className={styles.sparkle} aria-hidden="true">✦</span>
            <div>
              <h2>{entry.name}</h2>
              {entry.name_en && <p className={styles.nameEn}>{entry.name_en}</p>}
            </div>
          </div>
          <p className={styles.description}>{entry.description}</p>
          <div className={styles.meta}>
            {entry.hitDie && <span>Кость хитов: {entry.hitDie}</span>}
            <span>{entry.roles.join(' · ')}</span>
            {entry.homebrew && <span>Homebrew</span>}
          </div>
        </div>
      </article>
    </Panel>
  </Link>
}

export default function ClassesPage() {
  const [catalog, setCatalog] = useState<CatalogClass[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [collection, setCollection] = useState<CollectionFilter>('all')
  const [role, setRole] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('grid')

  useEffect(() => {
    recordVisit({ path: '/encyclopedia/classes', title: 'Классы', category: 'Справочники' })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadClasses(controller.signal).then(entries => {
      if (controller.signal.aborted) return
      setCatalog(entries)
      setStatus('ready')
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить классы.')
      setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])

  const roleOptions = useMemo(() => optionList(catalog.flatMap(entry => entry.roles)), [catalog])
  const sourceOptions = useMemo(() => optionList(catalog.flatMap(entry => entry.sources)), [catalog])
  const results = useMemo(() => filterClasses(catalog, { collection, role, source }), [catalog, collection, role, source])

  function resetFilters() {
    setCollection('all')
    setRole(null)
    setSource(null)
  }

  return <main className={styles.page}>
    <section className={styles.hero} aria-labelledby="classes-title">
      <Link className={styles.back} to="/encyclopedia">← Энциклопедия</Link>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Справочник персонажа</p>
        <h1 id="classes-title">Классы</h1>
        <p className={styles.lead}>Классы персонажей и их особенности.</p>
        <p className={styles.intro}>Выберите класс, чтобы узнать о его возможностях, стиле игры, ключевых особенностях и развитии персонажа.</p>
      </div>
      <span className={styles.heroMark} aria-hidden="true"><PlaceholderIcon /></span>
    </section>

    <Panel className={styles.filtersPanel} padding="compact">
      <div className={styles.filters}>
        <div className={styles.collectionTabs} role="group" aria-label="Подборка классов">
          {collectionTabs.map(tab => <button
            type="button"
            key={tab.value}
            data-active={collection === tab.value}
            aria-pressed={collection === tab.value}
            disabled={status !== 'ready'}
            onClick={() => setCollection(tab.value)}
          >{tab.label}</button>)}
        </div>
        <Combobox
          rootClassName={styles.compactControl}
          label="Игровая роль"
          options={roleOptions}
          value={role}
          disabled={status !== 'ready'}
          onValueChange={setRole}
        />
        <Combobox
          rootClassName={styles.compactControl}
          label="Источник"
          options={sourceOptions}
          value={source}
          disabled={status !== 'ready'}
          onValueChange={setSource}
        />
        <Button size="sm" icon={null} variant="secondary" decoration="minimal" disabled={status !== 'ready'} onClick={resetFilters}>Сбросить</Button>
      </div>
    </Panel>

    <div className={styles.layout}>
      <section className={styles.catalog} aria-labelledby="classes-results">
        <div className={styles.catalogToolbar}>
          <p id="classes-results" role="status">Найдено материалов: {results.length}</p>
          <div className={styles.viewToggle} role="group" aria-label="Вид списка">
            <button type="button" data-active={view === 'grid'} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Сетка</button>
            <button type="button" data-active={view === 'list'} aria-pressed={view === 'list'} onClick={() => setView('list')}>Список</button>
          </div>
        </div>

        {status === 'loading' && <p className={styles.status} role="status">Загружаем классы из базы данных…</p>}
        {status === 'error' && <div className={styles.status} role="alert">
          <p>{error}</p>
          <Button size="md" variant="secondary" icon={null} onClick={() => { setError(''); setStatus('loading'); setAttempt(value => value + 1) }}>Повторить</Button>
        </div>}
        {status === 'ready' && results.length === 0 && <p className={styles.status}>Классы не найдены. Измените фильтры.</p>}
        {status === 'ready' && results.length > 0 && <div className={styles.cards} data-view={view}>
          {results.map(entry => <ClassCard entry={entry} key={entry.id} />)}
        </div>}
      </section>

      <aside className={styles.sidebar} aria-label="Быстрая навигация">
        <EncyclopediaQuickNav currentSectionId="classes" />
      </aside>
    </div>
  </main>
}
