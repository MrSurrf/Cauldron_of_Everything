import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { recordVisit } from '../../entities/encyclopedia'
import { Button, Combobox, ListCard, Panel, TextInput } from '../../shared/ui'
import { groupBackgroundsBySource, loadBackgrounds } from './backgroundCatalog'
import type { CatalogBackground } from './backgroundCatalog'
import { entryPath } from './encyclopediaApi'
import base from './BestiaryPage.module.css'
import styles from './BackgroundsPage.module.css'

export default function BackgroundsPage() {
  const [catalog, setCatalog] = useState<CatalogBackground[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<string | null>(null)
  const [skill, setSkill] = useState<string | null>(null)
  const [mode, setMode] = useState<'official' | 'homebrew'>('official')
  const [showFavorites, setShowFavorites] = useState(false)

  useEffect(() => { recordVisit({ path: '/encyclopedia/backgrounds', title: 'Предыстории', category: 'Справочники' }) }, [])
  useEffect(() => {
    const controller = new AbortController()
    loadBackgrounds(controller.signal).then(entries => {
      if (controller.signal.aborted) return
      setCatalog(entries)
      setStatus('ready')
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить предыстории.')
      setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])

  const currentCatalog = useMemo(() => showFavorites ? [] : catalog.filter(entry => entry.homebrew === (mode === 'homebrew')), [catalog, mode, showFavorites])
  const sourceOptions = useMemo(() => groupBackgroundsBySource(currentCatalog).map(group => ({ value: group.source, label: group.source })), [currentCatalog])
  const skillOptions = useMemo(() => [...new Set(currentCatalog.flatMap(entry => entry.skills))].sort((a, b) => a.localeCompare(b, 'ru')).map(value => ({ value, label: value })), [currentCatalog])
  const results = useMemo(() => currentCatalog.filter(entry =>
    (!query || `${entry.name} ${entry.name_en}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')))
    && (!skill || entry.skills.includes(skill))
    && (!source || (entry.sources.length ? entry.sources : ['Источник не указан']).includes(source)),
  ), [currentCatalog, query, skill, source])
  const groups = useMemo(() => groupBackgroundsBySource(results).filter(group => !source || group.source === source), [results, source])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(search.trim())
  }

  return <main className={base.page}>
    <h1 className={base.visuallyHidden}>Предыстории</h1>
    <Panel className={base.filtersPanel} padding="compact">
      <div className={base.sourceTabs} role="group" aria-label="Подборка предысторий">
        {(['official', 'homebrew'] as const).map(value => <button key={value} type="button" className={base.sourceTab}
          data-active={!showFavorites && mode === value} aria-pressed={!showFavorites && mode === value} disabled={status !== 'ready'}
          onClick={() => { setShowFavorites(false); setMode(value); setSource(null); setSkill(null) }}
        >{value === 'official' ? 'Официальные' : 'Homebrew'}</button>)}
        <button className={base.sourceTab} type="button" data-active={showFavorites}
          disabled={status !== 'ready'}
          aria-pressed={showFavorites} onClick={() => setShowFavorites(true)}>Избранное</button>
      </div>
      <form className={styles.filters} onSubmit={submit}>
        <TextInput type="search" aria-label="Поиск по разделу" placeholder="Поиск по разделу" value={search} disabled={status !== 'ready'} onChange={event => setSearch(event.target.value)} />
        <Combobox label="Навыки" options={skillOptions} value={skill} onValueChange={setSkill} disabled={status !== 'ready'} />
        <Combobox label="Источник" options={sourceOptions} value={source} onValueChange={setSource} disabled={status !== 'ready'} />
        <Button size="md" icon={null} type="submit" disabled={status !== 'ready'}>Найти</Button>
        <Button size="md" variant="secondary" decoration="minimal" icon={null} disabled={status !== 'ready'} onClick={() => { setSearch(''); setQuery(''); setSource(null); setSkill(null) }}>Сбросить</Button>
      </form>
    </Panel>
    <Panel className={`${base.listPanel} ${styles.list}`} padding="compact">
      {status === 'loading' && <p role="status" className={base.loadStatus}>Загружаем предыстории…</p>}
      {status === 'error' && <div role="alert" className={base.loadStatus}>{error}<Button size="md" variant="secondary" icon={null} onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>Повторить</Button></div>}
      {status === 'ready' && <>
        <div className={`${base.listToolbar} ${styles.toolbar}`}><span>По источникам</span><span className={base.count} role="status">Найдено: {results.length}</span></div>
        {!results.length && <p className={base.empty}>{showFavorites ? 'В избранном пока ничего нет.' : 'Предыстории не найдены. Измените фильтры или запрос.'}</p>}
        <div className={base.creatureGroups}>{groups.map(group => <section key={group.source} aria-label={group.source}>
          <h2 className={styles.sourceHeading}>{group.source}</h2>
          <ul className={`${base.creatureGrid} ${styles.cards}`}>{group.entries.map(entry => <li key={entry.id}>
            <Link to={entryPath(entry)} className={`${base.creatureButton} ${styles.cardLink}`}>
              <ListCard name={entry.name} tags={entry.skills} />
            </Link>
          </li>)}</ul>
        </section>)}</div>
      </>}
    </Panel>
  </main>
}
