import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TextInput } from '../../shared/ui'
import { clearSearches, parseSearches, parseVisits, readHistorySnapshot, readSearchSnapshot, recordSearch, subscribeHistory, subscribeSearches } from '../../entities/encyclopedia'
import { EncyclopediaDashboard } from './EncyclopediaDashboard'
import { EncyclopediaResults } from './EncyclopediaResults'
import encyclopediaBackground from '../../../assets/backgrounds/encyclopedia.png'
import styles from './EncyclopediaPage.module.css'

export default function EncyclopediaPage() {
  const [params, setParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<number | null>(null)
  const snapshot = useSyncExternalStore(subscribeHistory, readHistorySnapshot, () => null)
  const history = useMemo(() => parseVisits(snapshot), [snapshot])
  const searchSnapshot = useSyncExternalStore(subscribeSearches, readSearchSnapshot, () => null)
  const searches = useMemo(() => parseSearches(searchSnapshot), [searchSnapshot])
  const query = params.get('search') ?? ''

  useEffect(() => {
    if (!query.trim()) return
    // Запоминаем выполненный запрос после паузы, а не каждый набранный символ.
    searchTimer.current = window.setTimeout(() => { recordSearch(query); searchTimer.current = null }, 1000)
    return () => { if (searchTimer.current !== null) window.clearTimeout(searchTimer.current); searchTimer.current = null }
  }, [query])

  function changeQuery(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('search', value)
    else next.delete('search')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  return (
    <main className={`${styles.page} ${styles.home}`}>
      <div className={styles.hero}>
        <img className={styles.heroImage} src={encyclopediaBackground} width={1916} height={821} alt="" fetchPriority="high" />
        <div className={`${styles.container} ${styles.heroContent}`}>
          <header className={styles.intro}>
            <h1>Энциклопедия</h1>
            <span className={styles.titleDivider} aria-hidden="true" />
            <p>Центральный справочник по миру, правилам, персонажам и многому другому.</p>
          </header>
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.search} role="search" aria-label="Поиск по энциклопедии">
          <TextInput
            ref={inputRef}
            type="search"
            aria-label="Поиск по энциклопедии"
            placeholder="Поиск по энциклопедии..."
            value={query}
            rootClassName={styles.searchFrame}
            onChange={event => changeQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') recordSearch(query) }}
            onBlur={() => recordSearch(query)}
          />
          {!query && <span className={styles.searchHint}>Например: заклинания, монстры, состояния…</span>}
          <kbd className={styles.shortcut}>Ctrl + K</kbd>
        </div>

        <div className={styles.recentQueries} role="group" aria-label="Недавние запросы">
          <span className={styles.queriesLabel}>Недавние запросы:</span>
          {searches.length === 0 ? <span className={styles.queriesEmpty}>Пока нет запросов</span> : <>
            {searches.map(search => <button type="button" className={styles.queryChip} key={search.query.toLocaleLowerCase('ru')}
              title={search.query} onClick={() => { recordSearch(search.query); changeQuery(search.query) }}>{search.query}</button>)}
            <button type="button" className={styles.clearQueries} onClick={() => {
              if (searchTimer.current !== null) window.clearTimeout(searchTimer.current)
              searchTimer.current = null
              clearSearches()
            }} aria-label="Очистить недавние запросы">Очистить</button>
          </>}
        </div>

        {query.trim() && (
          <section className={styles.results} aria-label="Результаты поиска">
            <h2>Результаты поиска</h2>
            <EncyclopediaResults key={query.trim()} query={query.trim()} />
          </section>
        )}

        <EncyclopediaDashboard history={history} />
      </div>
    </main>
  )
}
