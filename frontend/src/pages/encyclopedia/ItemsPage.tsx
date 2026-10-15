import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { recordVisit } from '../../entities/encyclopedia'
import { toItemEntity, type EncyclopediaItemDetail, type ItemEntity } from '../../entities/item'
import { Button, Checkbox, ListCard, Panel, PlaceholderIcon, Popover, TextInput } from '../../shared/ui'
import { fetchEncyclopedia } from './encyclopediaApi'
import { catalogFirstLetter, catalogNameStartsWith } from './catalogAlphabet'
import { filterItems, emptyItemFilters, itemFacetOptions, ITEM_FACETS } from './itemFilters'
import type { ItemFacetKey, ItemFilters } from './itemFilters'
import { loadItems, type CatalogItem } from './itemCatalog'
import base from './BestiaryPage.module.css'
import styles from './ItemsPage.module.css'

const LETTERS = [...'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ']
const PAGE_SIZE = 120

function groupByLetter(items: readonly CatalogItem[]) {
  const groups = new Map<string, CatalogItem[]>()
  for (const item of items) {
    const letter = catalogFirstLetter(item.name)
    groups.set(letter, [...(groups.get(letter) ?? []), item])
  }
  return [...groups].map(([letter, entries]) => ({ letter, entries }))
}

function FacetControl({ items, facet, filters, disabled, onToggle }: {
  items: readonly CatalogItem[]
  facet: (typeof ITEM_FACETS)[number]
  filters: ItemFilters
  disabled: boolean
  onToggle: (key: ItemFacetKey, value: string) => void
}) {
  const options = itemFacetOptions(items, filters, facet.key)
  const selectedCount = filters.selected[facet.key].length
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
    <button className={base.facetButton} type="button" aria-label={`Фильтр: ${facet.label}`} disabled={disabled}>
      <span>{facet.label}{selectedCount > 0 && <b> · {selectedCount}</b>}</span>
      <span aria-hidden="true">⌄</span>
    </button>
  </Popover>
}

export default function ItemsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('search') ?? ''
  const [filters, setFilters] = useState<ItemFilters>(emptyItemFilters)
  const [searchDraft, setSearchDraft] = useState(initialQuery)
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery.trim())
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [searchResult, setSearchResult] = useState<{ query: string; items: CatalogItem[] } | null>(null)
  const [searchError, setSearchError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ItemEntity | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const searchableCatalog = useMemo(() => submittedQuery
    ? searchResult?.query === submittedQuery ? searchResult.items : []
    : catalog,
  [catalog, searchResult, submittedQuery])
  const searchPending = Boolean(submittedQuery && searchResult?.query !== submittedQuery && !searchError)
  const selected = showFavorites ? undefined : searchableCatalog.find((item) => item.id === selectedId)
  const results = useMemo(() => showFavorites ? [] : filterItems(searchableCatalog, filters)
    .filter((item) => submittedQuery || catalogNameStartsWith(item.name, searchDraft)),
  [filters, searchDraft, searchableCatalog, showFavorites, submittedQuery])
  const visible = results.slice(0, visibleCount)

  useEffect(() => {
    recordVisit({ path: '/encyclopedia/items', title: 'Магические предметы', category: 'Магия и предметы' })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadItems(controller.signal).then((items) => {
      if (controller.signal.aborted) return
      setCatalog(items)
      setStatus('ready')
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить предметы')
      setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    if (status !== 'ready' || !submittedQuery) return
    const controller = new AbortController()
    loadItems(controller.signal, submittedQuery).then((items) => {
      if (controller.signal.aborted) return
      setSearchResult({ query: submittedQuery, items })
      setSearchError('')
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setSearchError(cause instanceof Error ? cause.message : 'Не удалось выполнить поиск')
    })
    return () => controller.abort()
  }, [attempt, status, submittedQuery])

  useEffect(() => {
    if (selectedId === null) return
    const controller = new AbortController()
    fetchEncyclopedia<EncyclopediaItemDetail>(`${selectedId}/`, controller.signal)
      .then((entry) => { if (!controller.signal.aborted) setDetail(toItemEntity(entry)) })
      .catch(() => { /* Каталог остаётся доступным, если превью не загрузилось. */ })
    return () => controller.abort()
  }, [selectedId])

  function updateFilters(update: (current: ItemFilters) => ItemFilters) {
    setFilters(update)
    setVisibleCount(PAGE_SIZE)
  }

  function toggleFacet(key: ItemFacetKey, value: string) {
    updateFilters((current) => {
      const old = current.selected[key]
      return {
        ...current,
        selected: {
          ...current.selected,
          [key]: old.includes(value) ? old.filter((item) => item !== value) : [...old, value],
        },
      }
    })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearchError('')
    setSubmittedQuery(searchDraft.trim())
    updateFilters((current) => ({ ...current, letter: '' }))
  }

  function resetFilters() {
    setSearchDraft('')
    setSubmittedQuery('')
    setSearchError('')
    setSearchResult(null)
    setShowFavorites(false)
    updateFilters(() => emptyItemFilters())
  }

  function renderItem(item: CatalogItem) {
    return <button
      className={base.creatureButton}
      type="button"
      key={item.id}
      data-selected={selectedId === item.id}
      aria-pressed={selectedId === item.id}
      onClick={() => { setSelectedId(item.id); setDetail(null) }}
      onDoubleClick={() => navigate(`/encyclopedia/item/${encodeURIComponent(item.slug)}`)}
    >
      <ListCard
        className={`${base.catalogCard} ${styles.itemCard}`}
        name={item.name}
        icon={<PlaceholderIcon />}
      />
    </button>
  }

  return <main className={base.page}>
    <h1 className={base.visuallyHidden}>Магические предметы</h1>
    <Panel className={`${base.filtersPanel} ${styles.filtersPanel}`} padding="compact">
      <div className={base.sourceTabs} role="group" aria-label="Подборка предметов">
        {(['official', 'homebrew'] as const).map((mode) => <button
          className={base.sourceTab}
          key={mode}
          type="button"
          data-active={!showFavorites && filters.sourceMode === mode}
          aria-pressed={!showFavorites && filters.sourceMode === mode}
          disabled={status !== 'ready'}
          onClick={() => { setShowFavorites(false); updateFilters((current) => ({ ...current, sourceMode: mode })) }}
        >{mode === 'official' ? 'Официальные' : 'Homebrew'}</button>)}
        <button className={base.sourceTab} type="button" data-active={showFavorites}
          disabled={status !== 'ready'} aria-pressed={showFavorites}
          onClick={() => setShowFavorites(true)}>Избранное</button>
      </div>

      <form className={styles.filters} onSubmit={submitSearch}>
        <div className={`${base.filterGrid} ${styles.filterGrid}`}>
          <TextInput
            className={base.searchInput}
            fieldClassName={`${base.searchField} ${styles.searchField}`}
            rootClassName={base.compactControl}
            type="search"
            aria-label="Поиск по предметам"
            placeholder="Название; Enter — поиск по описанию"
            value={searchDraft}
            disabled={status !== 'ready'}
            onChange={(event) => {
              setSearchDraft(event.target.value)
              setSubmittedQuery('')
              setSearchError('')
              updateFilters((current) => ({ ...current, letter: '' }))
            }}
          />
          {ITEM_FACETS.map((facet) => <FacetControl
            key={facet.key}
            items={searchableCatalog}
            facet={facet}
            filters={filters}
            disabled={status !== 'ready' || searchPending}
            onToggle={toggleFacet}
          />)}
        </div>
        <div className={styles.filterActions}>
          <Button variant="secondary" decoration="minimal" size="sm" icon={null}
            disabled={status !== 'ready'} onClick={resetFilters}>Сбросить фильтры</Button>
          <Button variant="primary" size="sm" type="submit" icon={null}
            disabled={status !== 'ready'}>Найти</Button>
        </div>
      </form>
    </Panel>

    <div className={base.layout}>
      <Panel className={`${base.listPanel} ${styles.listPanel}`} padding="compact">
        {status === 'loading' && <p className={base.loadStatus} role="status">Загружаем предметы…</p>}
        {searchPending && <p className={base.loadStatus} role="status">Ищем предметы…</p>}
        {searchError && <div className={base.loadStatus} role="alert">Не удалось выполнить поиск: {searchError}.
          <Button variant="secondary" decoration="minimal" size="md" onClick={() => { setSearchError(''); setAttempt((value) => value + 1) }}>Повторить</Button>
        </div>}
        {status === 'error' && <div className={base.loadStatus} role="alert">{error}.
          <Button variant="secondary" decoration="minimal" size="md" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1) }}>Повторить</Button>
        </div>}

        <div className={base.listToolbar}>
          <div className={base.alphabet} role="group" aria-label="Первая буква названия">
            <button type="button" disabled={status !== 'ready'} data-active={!filters.letter}
              onClick={() => updateFilters((current) => ({ ...current, letter: '' }))}>Все</button>
            {LETTERS.map((letter) => <button key={letter} type="button" disabled={status !== 'ready'}
              data-active={filters.letter === letter}
              onClick={() => updateFilters((current) => ({ ...current, letter }))}>{letter}</button>)}
          </div>
          <span className={base.count} role="status">Найдено: {results.length}</span>
        </div>

        {showFavorites ? <p className={base.empty}>В избранном пока ничего нет.</p>
          : status === 'ready' && results.length === 0 && !searchPending && !searchError
            && <p className={base.empty}>Предметы не найдены. Измените фильтры или запрос.</p>}

        {results.length > 18
          ? <div className={base.creatureGroups}>{groupByLetter(visible).map(({ letter, entries }) =>
            <section className={base.letterGroup} key={letter} aria-label={`Предметы на букву ${letter}`}>
              <h2 className={base.letterHeading}>{letter}</h2>
              <div className={base.creatureGrid}>{entries.map(renderItem)}</div>
            </section>)}</div>
          : <div className={base.creatureGrid}>{visible.map(renderItem)}</div>}

        {results.length > visibleCount && <Button variant="secondary" decoration="minimal" size="md"
          className={base.moreButton} onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
          Показать ещё · {results.length - visibleCount}
        </Button>}
      </Panel>

      <Panel className={`${base.previewPanel} ${styles.previewPanel}`} padding="compact">
        <h2>Выбранный предмет</h2>
        {!selected && <p className={base.previewHint}>{showFavorites
          ? 'Избранных предметов пока нет.'
          : 'Выберите предмет в списке, чтобы открыть его карточку.'}</p>}
        {selected && <div className={styles.preview}>
          <span className={styles.previewIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <h3>{selected.name}</h3>
          {selected.nameEn && <p className={styles.nameEn}>{selected.nameEn}</p>}
          <dl>
            <div><dt>Тип</dt><dd>{selected.itemType}</dd></div>
            <div><dt>Редкость</dt><dd>{selected.rarity}</dd></div>
            <div><dt>Настройка</dt><dd>{selected.attunement}</dd></div>
            <div><dt>Источник</dt><dd>{selected.sources.join(', ') || 'Не указан'}</dd></div>
          </dl>
          {detail?.id === String(selected.id) && detail.facts.length > 0 && <dl className={styles.detailFacts}>
            {detail.facts.slice(0, 4).map((fact) => <div key={fact.key}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>}
          <Button className={base.fullRecordButton} variant="secondary" decoration="minimal" size="md" fullWidth
            onClick={() => navigate(`/encyclopedia/item/${encodeURIComponent(selected.slug)}`)}>Открыть полную запись →</Button>
        </div>}
      </Panel>
    </div>
  </main>
}
