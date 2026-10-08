import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { IconFrame, Panel, PlaceholderIcon, ScrollArea, TextInput } from '../../shared/ui'
import { clearHistory, parseVisits, readHistorySnapshot, subscribeHistory } from '../../entities/encyclopedia'
import { encyclopediaGroups, sectionPath } from './encyclopediaSections'
import { EncyclopediaSectionIcon } from './EncyclopediaSectionIcon'
import { EncyclopediaResults } from './EncyclopediaResults'
import encyclopediaBackground from '../../../assets/backgrounds/encyclopedia.png'
import styles from './EncyclopediaPage.module.css'

export default function EncyclopediaPage() {
  const [params, setParams] = useSearchParams()
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const snapshot = useSyncExternalStore(subscribeHistory, readHistorySnapshot, () => null)
  const history = useMemo(() => parseVisits(snapshot), [snapshot])
  const query = params.get('search') ?? ''

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
            icon={<PlaceholderIcon />}
            value={query}
            rootClassName={styles.searchFrame}
            onChange={(event) => {
              const next = new URLSearchParams(params)
              if (event.target.value) next.set('search', event.target.value)
              else next.delete('search')
              setParams(next, { replace: true })
            }}
          />
          {!query && <span className={styles.searchHint}>Например: заклинания, монстры, состояния…</span>}
          <kbd className={styles.shortcut}>Ctrl + K</kbd>
        </div>

        {query.trim() && (
          <section className={styles.results} aria-label="Результаты поиска">
            <h2>Результаты поиска</h2>
            <EncyclopediaResults key={query.trim()} query={query.trim()} />
          </section>
        )}

        {encyclopediaGroups.map((group) => (
          <section key={group.id} className={styles.section} aria-labelledby={`encyclopedia-${group.id}`}>
            <h2 id={`encyclopedia-${group.id}`}><span aria-hidden="true"><PlaceholderIcon /></span>{group.title}</h2>
            <ScrollArea
              orientation="vertical"
              aria-label={group.title}
              rootClassName={styles.sectionScroller}
              contentClassName={styles.sectionGrid}
              data-group={group.id}
            >
              {group.sections.map((section) => (
                <Link className={`${styles.cardLink} ${styles.sectionCardLink}`} key={section.id} to={sectionPath(section)}>
                  <Panel className={styles.card} padding="compact">
                    <div className={styles.cardContent}>
                      <EncyclopediaSectionIcon sectionId={section.id} variant="category" />
                      <div className={styles.cardCopy}><h3>{section.title}</h3><p>{section.description}</p></div>
                    </div>
                  </Panel>
                </Link>
              ))}
            </ScrollArea>
          </section>
        ))}

        <Panel className={styles.history} padding="normal">
          <section aria-labelledby="encyclopedia-history">
            <div className={styles.historyHeading}>
              <h2 id="encyclopedia-history"><span aria-hidden="true"><PlaceholderIcon /></span>{showHistory ? 'История посещений' : 'Недавно открывали'}</h2>
              {history.length > 0 && <div className={styles.historyActions}>
                <button type="button" aria-expanded={showHistory} onClick={() => setShowHistory((show) => !show)}>{showHistory ? 'Свернуть историю' : 'Показать всю историю'}</button>
                {showHistory && <button type="button" onClick={clearHistory}>Очистить историю</button>}
              </div>}
            </div>
            {history.length === 0 ? (
              <p className={styles.empty}>Здесь появятся разделы и материалы, которые вы откроете. История сохраняется в этом браузере.</p>
            ) : (
              <ScrollArea orientation="horizontal" aria-label="Последние посещения" rootClassName={styles.row} contentClassName={styles.cards}>
                {(showHistory ? history : history.slice(0, 6)).map((visit) => (
                  <Link key={visit.path} to={visit.path} className={`${styles.cardLink} ${styles.recentLink}`}>
                    <Panel className={styles.card} padding="compact">
                      <div className={styles.recentContent}>
                        <IconFrame size="2.75rem" contentSize="1.25rem" glow={false} aria-hidden="true"><PlaceholderIcon /></IconFrame>
                        <div className={styles.cardCopy}><h3>{visit.title}</h3><p>{visit.category}</p></div>
                      </div>
                    </Panel>
                  </Link>
                ))}
              </ScrollArea>
            )}
          </section>
        </Panel>
      </div>
    </main>
  )
}
