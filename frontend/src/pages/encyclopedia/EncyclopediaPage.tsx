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
  const snapshot = useSyncExternalStore(subscribeHistory, readHistorySnapshot, () => null)
  const history = useMemo(() => parseVisits(snapshot), [snapshot])
  const searchSnapshot = useSyncExternalStore(subscribeSearches, readSearchSnapshot, () => null)
  const searches = useMemo(() => parseSearches(searchSnapshot), [searchSnapshot])
  const query = params.get('search') ?? ''
  const fullSearch = params.get('search_mode') === 'full'

  function changeQuery(value: string, submit = false) {
    const next = new URLSearchParams(params)
    if (value) next.set('search', value)
    else next.delete('search')
    if (submit && value.trim()) next.set('search_mode', 'full')
    else next.delete('search_mode')
    setParams(next, { replace: true })
    if (submit) recordSearch(value)
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
            placeholder="Название; Enter — поиск по содержимому"
            value={query}
            rootClassName={styles.searchFrame}
            onChange={event => changeQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); changeQuery(query, true) } }}
          />
          {!query && <span className={styles.searchHint}>Например: заклинания, монстры, состояния…</span>}
          <kbd className={styles.shortcut}>Ctrl + K</kbd>
        </div>

        <div className={styles.recentQueries} role="group" aria-label="Недавние запросы">
          <span className={styles.queriesLabel}>Недавние запросы:</span>
          {searches.length === 0 ? <span className={styles.queriesEmpty}>Пока нет запросов</span> : <>
            {searches.map(search => <button type="button" className={styles.queryChip} key={search.query.toLocaleLowerCase('ru')}
              title={search.query} onClick={() => changeQuery(search.query, true)}>{search.query}</button>)}
            <button type="button" className={styles.clearQueries} onClick={() => {
              clearSearches()
            }} aria-label="Очистить недавние запросы">Очистить</button>
          </>}
        </div>

        {query.trim() && (
          <section className={styles.results} aria-label="Результаты поиска">
            <h2>Результаты поиска</h2>
            <EncyclopediaResults key={`${query.trim()}:${fullSearch}`} query={query.trim()} fullSearch={fullSearch} />
          </section>
        )}

        <EncyclopediaDashboard history={history} />
      </div>
    </main>
  )
}
