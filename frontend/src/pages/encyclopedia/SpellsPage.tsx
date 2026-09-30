import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { recordVisit } from '../../entities/encyclopedia'
import { Button, Checkbox, ListCard, Panel, Popover, TextInput } from '../../shared/ui'
import { fetchEncyclopedia } from './encyclopediaApi'
import { catalogFirstLetter } from './catalogAlphabet'
import { loadSpells, type CatalogSpell } from './spellCatalog'
import {
  emptySpellFilters, filterSpells, spellFacetOptions, SPELL_FACETS,
  type SpellFacetKey, type SpellFilters, type SpellSort,
} from './spellFilters'
import base from './BestiaryPage.module.css'
import styles from './SpellsPage.module.css'

const LETTERS = [...'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ']
const PAGE_SIZE = 120
type SpellDetail = { id: number; content_text?: string }

function groupByLetter(spells: readonly CatalogSpell[]) {
  const groups = new Map<string, CatalogSpell[]>()
  for (const spell of spells) {
    const letter = catalogFirstLetter(spell.name)
    groups.set(letter, [...(groups.get(letter) ?? []), spell])
  }
  return [...groups].map(([letter, entries]) => ({ letter, entries }))
}

function FacetControl({ spells, facet, filters, disabled, onToggle }: {
  spells: readonly CatalogSpell[]
  facet: (typeof SPELL_FACETS)[number]
  filters: SpellFilters
  disabled: boolean
  onToggle: (key: SpellFacetKey, value: string) => void
}) {
  const options = spellFacetOptions(spells, filters, facet.key)
  const count = filters.selected[facet.key].length
  return <Popover
    aria-label={`Фильтр: ${facet.label}`}
    placement="bottom"
    content={<div className={base.facetMenu}>
      <strong>{facet.label}</strong>
      {options.length === 0 ? <p>Нет доступных значений</p> : options.map((option) =>
        <Checkbox
          key={option.value}
          checked={filters.selected[facet.key].includes(option.value)}
          disabled={option.count === 0 && !filters.selected[facet.key].includes(option.value)}
          label={<span className={base.optionLabel}>{option.value}<small>{option.count}</small></span>}
          onCheckedChange={() => onToggle(facet.key, option.value)}
        />)}
    </div>}
  >
    <button className={`${base.facetButton} ${styles.facetButton}`} type="button" disabled={disabled}>
      <span>{facet.label}{count > 0 && <b> · {count}</b>}</span><span aria-hidden="true">⌄</span>
    </button>
  </Popover>
}

export default function SpellsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('search') ?? ''
  const [filters, setFilters] = useState<SpellFilters>(() => ({ ...emptySpellFilters(), query: initialQuery }))
  const [searchDraft, setSearchDraft] = useState(initialQuery)
  const [catalog, setCatalog] = useState<CatalogSpell[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<SpellDetail | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const selected = showFavorites ? undefined : catalog.find((spell) => spell.id === selectedId)
  const results = useMemo(() => showFavorites ? [] : filterSpells(catalog, filters), [catalog, filters, showFavorites])
  const visible = results.slice(0, visibleCount)

  useEffect(() => {
    recordVisit({ path: '/encyclopedia/spells', title: 'Заклинания', category: 'Магия и предметы' })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadSpells(controller.signal).then((spells) => {
      if (controller.signal.aborted) return
      setCatalog(spells)
      setStatus('ready')
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить заклинания')
      setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    if (selectedId === null) return
    const controller = new AbortController()
    fetchEncyclopedia<SpellDetail>(`${selectedId}/`, controller.signal)
      .then((entry) => { if (!controller.signal.aborted) setDetail(entry) })
      .catch(() => { /* Список остаётся доступен, если превью не загрузилось. */ })
    return () => controller.abort()
  }, [selectedId])

  function updateFilters(update: (current: SpellFilters) => SpellFilters) {
    setFilters(update)
    setVisibleCount(PAGE_SIZE)
  }

  function toggleFacet(key: SpellFacetKey, value: string) {
    updateFilters((current) => {
      const old = current.selected[key]
      return { ...current, selected: { ...current.selected,
        [key]: old.includes(value) ? old.filter((item) => item !== value) : [...old, value] } }
    })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateFilters((current) => ({ ...current, query: searchDraft.trim() }))
  }

  function renderSpell(spell: CatalogSpell) {
    const hasConcentration = spell.concentration === 'Да'
    const hasRitual = spell.ritual === 'Да'
    const hasMarkers = hasConcentration || hasRitual

    return <button
      className={base.creatureButton}
      type="button"
      key={spell.id}
      data-selected={selectedId === spell.id}
      aria-pressed={selectedId === spell.id}
      onClick={() => { setSelectedId(spell.id); setDetail(null) }}
      onDoubleClick={() => navigate(`/encyclopedia/entry/${spell.id}`)}
    >
      <span className={styles.spellListItem} data-has-markers={hasMarkers || undefined}>
        <ListCard
          className={`${base.catalogCard} ${styles.spellCard}`}
          name={spell.name}
          metric={spell.level || '—'}
          metricLabel={`Уровень заклинания: ${spell.level || 'не указан'}`}
          tags={[spell.school || 'Школа не указана']}
        />
        {hasMarkers && <span className={styles.spellMarkers} aria-label="Особые свойства заклинания">
          {hasConcentration && <span title="Концентрация" aria-label="Концентрация">К</span>}
          {hasRitual && <span title="Ритуал" aria-label="Ритуал">Р</span>}
        </span>}
      </span>
    </button>
  }

  return <main className={base.page}>
    <h1 className={base.visuallyHidden}>Заклинания</h1>
    <Panel className={`${base.filtersPanel} ${styles.filtersPanel}`} padding="compact">
      <div className={base.sourceTabs} role="group" aria-label="Подборка заклинаний">
        {(['official', 'homebrew'] as const).map((mode) => <button
          className={base.sourceTab} key={mode} type="button"
          data-active={!showFavorites && filters.sourceMode === mode}
          aria-pressed={!showFavorites && filters.sourceMode === mode}
          disabled={status !== 'ready'}
          onClick={() => { setShowFavorites(false); updateFilters((current) => ({ ...current, sourceMode: mode })) }}
        >{mode === 'official' ? 'Официальные' : 'Homebrew'}</button>)}
        <button className={base.sourceTab} type="button" data-active={showFavorites}
          disabled={status !== 'ready'}
          aria-pressed={showFavorites} onClick={() => setShowFavorites(true)}>Избранное</button>
      </div>
      <form className={styles.filters} onSubmit={submitSearch}>
        <div className={`${base.filterGrid} ${styles.filterGrid}`}>
          <TextInput
            className={base.searchInput} fieldClassName={`${base.searchField} ${styles.searchField}`}
            rootClassName={base.compactControl}
            type="search" aria-label="Поиск по разделу" placeholder="Поиск по разделу"
            value={searchDraft} disabled={status !== 'ready'}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          {SPELL_FACETS.map((facet) => <FacetControl
            key={facet.key} spells={catalog} facet={facet} filters={filters}
            disabled={status !== 'ready'} onToggle={toggleFacet}
          />)}
        </div>
        <div className={styles.filterFooter}>
          <div className={styles.sortTabs} role="group" aria-label="Сортировка заклинаний">
            {([['name', 'Название'], ['level', 'Уровень'], ['school', 'Школа']] as const).map(([sort, label]) =>
              <button key={sort} type="button" data-active={filters.sort === sort} disabled={status !== 'ready'}
                aria-pressed={filters.sort === sort}
                onClick={() => updateFilters((current) => ({ ...current, sort: sort as SpellSort, letter: '' }))}
              >{label}</button>)}
          </div>
          <div className={styles.filterActions}>
            <Checkbox
              label="Исключить TCE" checked={filters.excludeTce}
              disabled={status !== 'ready'}
              onCheckedChange={(checked) => updateFilters((current) => ({ ...current, excludeTce: checked }))}
            />
            <Button variant="secondary" decoration="minimal" size="sm" disabled={status !== 'ready'}
              onClick={() => { setSearchDraft(''); updateFilters(() => emptySpellFilters()) }}>Сбросить фильтры</Button>
            <Button variant="primary" size="sm" type="submit" icon={null} disabled={status !== 'ready'}>Поиск</Button>
          </div>
        </div>
      </form>
    </Panel>

    <div className={base.layout}>
      <Panel className={base.listPanel} padding="compact">
        {status === 'loading' && <p className={base.loadStatus} role="status">Загружаем заклинания…</p>}
        {status === 'error' && <div className={base.loadStatus} role="alert">{error}
          <Button variant="secondary" decoration="minimal" size="md" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1) }}>Повторить</Button>
        </div>}
        <div className={base.listToolbar}>
          <div className={base.alphabet} role="group" aria-label="Первая буква названия">
            <button type="button" disabled={status !== 'ready'} data-active={!filters.letter} onClick={() => updateFilters((current) => ({ ...current, letter: '' }))}>Все</button>
            {LETTERS.map((letter) => <button key={letter} type="button" disabled={status !== 'ready'}
              data-active={filters.letter === letter}
              onClick={() => updateFilters((current) => ({ ...current, letter }))}>{letter}</button>)}
          </div>
          <span className={base.count} role="status">Найдено: {results.length}</span>
        </div>
        {showFavorites ? <p className={base.empty}>В избранном пока ничего нет.</p>
          : status === 'ready' && results.length === 0 && <p className={base.empty}>Заклинания не найдены. Измените фильтры или запрос.</p>}
        {filters.sort === 'name' && results.length > 18
          ? <div className={base.creatureGroups}>{groupByLetter(visible).map(({ letter, entries }) =>
            <section className={base.letterGroup} key={letter} aria-label={`Заклинания на букву ${letter}`}>
              <h2 className={base.letterHeading}>{letter}</h2>
              <div className={base.creatureGrid}>{entries.map(renderSpell)}</div>
            </section>)}</div>
          : <div className={base.creatureGrid}>{visible.map(renderSpell)}</div>}
        {results.length > visibleCount && <Button variant="secondary" decoration="minimal" size="md"
          className={base.moreButton} onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
          Показать ещё · {results.length - visibleCount}
        </Button>}
      </Panel>
      <Panel className={base.previewPanel} padding="compact">
        <h2>Выбрано заклинание</h2>
        {!selected && <p className={base.previewHint}>{showFavorites
          ? 'Избранных заклинаний пока нет.'
          : 'Выберите заклинание в списке, чтобы открыть его карточку.'}</p>}
        {selected && <div className={styles.preview}>
          <h3>{selected.name}</h3>
          {selected.nameEn && <p className={styles.nameEn}>{selected.nameEn}</p>}
          <dl>
            <div><dt>Уровень</dt><dd>{selected.level || 'Не указан'}</dd></div>
            <div><dt>Школа</dt><dd>{selected.school || 'Не указана'}</dd></div>
            <div><dt>Время накладывания</dt><dd>{selected.castingTime || 'Не указано'}</dd></div>
            <div><dt>Компоненты</dt><dd>{selected.components.join(', ') || 'Не указаны'}</dd></div>
            <div><dt>Источник</dt><dd>{selected.sources.join(', ') || 'Не указан'}</dd></div>
          </dl>
          {detail?.id === selected.id && detail.content_text && <p className={styles.excerpt}>{detail.content_text}</p>}
          <Button className={base.fullRecordButton} variant="secondary" decoration="minimal" size="md" fullWidth
            onClick={() => navigate(`/encyclopedia/entry/${selected.id}`)}>Открыть полную запись →</Button>
        </div>}
      </Panel>
    </div>
  </main>
}
