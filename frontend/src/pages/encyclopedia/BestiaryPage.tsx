import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CreatureCompactCard,
  CreatureReference,
} from '../../entities/creature'
import { Button, Checkbox, Panel, Popover, TextInput } from '../../shared/ui'
import type { CatalogCreature } from './bestiaryCatalog'
import { getBestiaryCreature, loadBestiary } from './bestiaryApi'
import { tarrasqueCatalogEntry } from './mockBestiary'
import {
  emptyFilters,
  FACETS,
  facetOptions,
  filterCatalog,
} from './bestiaryFilters'
import type { FacetKey, FilterState, SortKey, SourceMode } from './bestiaryFilters'
import styles from './BestiaryPage.module.css'

const LETTERS = [...'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ']
const PAGE_SIZE = 120

function groupByFirstLetter(creatures: readonly CatalogCreature[]) {
  const groups = new Map<string, CatalogCreature[]>()
  for (const creature of creatures) {
    const letter = creature.name.charAt(0).toLocaleUpperCase('ru-RU') || '#'
    const group = groups.get(letter) ?? []
    group.push(creature)
    groups.set(letter, group)
  }
  return [...groups].map(([letter, entries]) => ({ letter, entries }))
}

function FacetControl({
  creatures,
  facet,
  filters,
  disabled,
  onToggle,
}: {
  creatures: readonly CatalogCreature[]
  facet: (typeof FACETS)[number]
  filters: FilterState
  disabled: boolean
  onToggle: (key: FacetKey, value: string) => void
}) {
  const options = facetOptions(creatures, filters, facet.key)
  const count = filters.selected[facet.key].length
  return (
    <Popover
      aria-label={`Фильтр: ${facet.label}`}
      placement="bottom"
      content={
        <div className={styles.facetMenu}>
          <strong>{facet.label}</strong>
          {options.length === 0 ? (
            <p>Нет доступных значений</p>
          ) : options.map((option) => (
            <Checkbox
              key={option.value}
              checked={filters.selected[facet.key].includes(option.value)}
              disabled={option.count === 0 && !filters.selected[facet.key].includes(option.value)}
              label={<span className={styles.optionLabel}>{option.value}<small>{option.count}</small></span>}
              onCheckedChange={() => onToggle(facet.key, option.value)}
            />
          ))}
        </div>
      }
    >
      <button
        className={`${styles.facetButton} ${['languages', 'habitats', 'movements'].includes(facet.key) ? styles.facetWide : ''}`}
        type="button"
        disabled={disabled}
      >
        <span>{facet.label}{count > 0 && <b> · {count}</b>}</span>
        <span aria-hidden="true">⌄</span>
      </button>
    </Popover>
  )
}

export default function BestiaryPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(emptyFilters)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [catalog, setCatalog] = useState<CatalogCreature[]>([tarrasqueCatalogEntry])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CatalogCreature | null>(null)
  const [status, setStatus] = useState<'loading' | 'indexing' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const selected = selectedDetail?.id === selectedId
    ? selectedDetail
    : catalog.find((creature) => creature.id === selectedId) ?? null
  const results = useMemo(() => filterCatalog(catalog, filters), [catalog, filters])
  const visible = results.slice(0, visibleCount)

  useEffect(() => {
    const controller = new AbortController()
    loadBestiary(
      controller.signal,
      (creatures) => {
        setCatalog([...creatures, tarrasqueCatalogEntry])
        setStatus('indexing')
      },
      (completed, total) => setProgress({ completed, total }),
    ).then((creatures) => {
      setCatalog([...creatures, tarrasqueCatalogEntry])
      setStatus('ready')
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить бестиарий')
      setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    if (status !== 'indexing' || selectedId === null || selectedId < 0) return
    const creature = catalog.find((item) => item.id === selectedId)
    if (!creature) return
    const controller = new AbortController()
    getBestiaryCreature(creature, controller.signal)
      .then(setSelectedDetail)
      .catch(() => { /* Общая загрузка каталога сообщит об ошибке отдельно. */ })
    return () => controller.abort()
  }, [catalog, selectedId, status])

  function updateFilters(update: (current: FilterState) => FilterState) {
    setFilters(update)
    setVisibleCount(PAGE_SIZE)
  }

  function toggleFacet(key: FacetKey, value: string) {
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

  function renderCreature(creature: CatalogCreature) {
    return (
      <button
        key={creature.id}
        type="button"
        className={styles.creatureButton}
        data-selected={selected?.id === creature.id}
        aria-pressed={selected?.id === creature.id}
        onClick={() => setSelectedId(creature.id)}
      >
        <CreatureReference entity={creature.entity} />
      </button>
    )
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.visuallyHidden}>Бестиарий</h1>
      <Panel className={styles.filtersPanel} padding="compact">
        <div className={styles.sourceTabs} role="group" aria-label="Происхождение существ">
          {(['official', 'homebrew'] as SourceMode[]).map((mode) => (
            <button
              key={mode}
              className={styles.sourceTab}
              data-active={filters.sourceMode === mode}
              type="button"
              disabled={status !== 'ready'}
              aria-pressed={filters.sourceMode === mode}
              onClick={() => updateFilters((current) => ({ ...current, sourceMode: mode }))}
            >
              {mode === 'official' ? 'Официальные' : 'Homebrew'}
            </button>
          ))}
        </div>
        <div className={styles.filterGrid}>
          <TextInput
            className={styles.searchInput}
            fieldClassName={styles.searchField}
            aria-label="Поиск по названию и содержанию карточки"
            type="search"
            placeholder="Поиск по названию и содержанию карточки"
            value={filters.query}
            disabled={status !== 'ready'}
            onChange={(event) => updateFilters((current) => ({ ...current, query: event.target.value }))}
          />
          {FACETS.map((facet) => (
            <FacetControl
              key={facet.key}
              creatures={catalog}
              facet={facet}
              filters={filters}
              disabled={status !== 'ready'}
              onToggle={toggleFacet}
            />
          ))}
          <label className={styles.sortField}>
            <span>Порядок</span>
            <select
              value={filters.sort}
              disabled={status !== 'ready'}
              onChange={(event) => updateFilters((current) => ({ ...current, sort: event.target.value as SortKey }))}
            >
              <option value="alphabetical">По алфавиту</option>
              <option value="challenge-asc">Опасность: по возрастанию</option>
              <option value="challenge-desc">Опасность: по убыванию</option>
            </select>
          </label>
          <Button
            variant="secondary"
            decoration="minimal"
            size="md"
            disabled={status !== 'ready'}
            onClick={() => updateFilters(() => emptyFilters())}
          >
            Сброс
          </Button>
        </div>
      </Panel>

      <div className={styles.layout}>
        <Panel className={styles.listPanel} padding="compact">
          {status === 'loading' && <p className={styles.loadStatus} role="status">Загружаем существ из базы данных…</p>}
          {status === 'indexing' && <p className={styles.loadStatus} role="status">Загружаем данные для фильтров и поиска: {progress.completed} из {progress.total}. Список уже доступен.</p>}
          {status === 'error' && (
            <div className={styles.loadStatus} role="alert">
              Не удалось загрузить существ: {error}. <Button variant="secondary" decoration="minimal" size="md" onClick={() => { setError(''); setStatus('loading'); setAttempt((value) => value + 1) }}>Повторить</Button>
            </div>
          )}
          <div className={styles.listToolbar}>
            <div className={styles.alphabet} role="group" aria-label="Первая буква названия">
              <button type="button" disabled={status !== 'ready'} data-active={!filters.letter} onClick={() => updateFilters((current) => ({ ...current, letter: '' }))}>Все</button>
              {LETTERS.map((letter) => (
                <button key={letter} type="button" disabled={status !== 'ready'} data-active={filters.letter === letter} onClick={() => updateFilters((current) => ({ ...current, letter }))}>{letter}</button>
              ))}
            </div>
            <span className={styles.count} role="status">Найдено: {results.length}</span>
          </div>
          {results.length === 0 && <p className={styles.empty}>Существа не найдены. Измените фильтры или запрос.</p>}
          {results.length > 18 ? (
            <div className={styles.creatureGroups}>
              {groupByFirstLetter(visible).map(({ letter, entries }) => (
                <section className={styles.letterGroup} key={letter} aria-label={`Существа на букву ${letter}`}>
                  <h3 className={styles.letterHeading}>{letter}</h3>
                  <div className={styles.creatureGrid}>{entries.map(renderCreature)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className={styles.creatureGrid}>{visible.map(renderCreature)}</div>
          )}
          {results.length > visibleCount && (
            <Button variant="secondary" decoration="minimal" size="md" className={styles.moreButton} onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              Показать ещё · {results.length - visibleCount}
            </Button>
          )}
        </Panel>

        <Panel className={styles.previewPanel} padding="compact">
          <h2>Выбрано существо</h2>
          {!selected && <p className={styles.previewHint}>Выберите существо в списке, чтобы открыть его карточку.</p>}
          {selected && (
            <>
              <CreatureCompactCard entity={selected.entity} />
              <Button
                className={styles.fullRecordButton}
                variant="secondary"
                decoration="minimal"
                size="md"
                fullWidth
                disabled={!selected.fullRecord}
                title={selected.fullRecord ? undefined : 'Полная запись пока доступна только для Тараска'}
                onClick={() => {
                  if (selected.fullRecord) navigate('/encyclopedia/bestiary/tarrasque')
                }}
              >
                Открыть полную запись →
              </Button>
            </>
          )}
        </Panel>
      </div>
    </main>
  )
}
