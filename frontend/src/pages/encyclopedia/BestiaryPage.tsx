import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CreatureCompactCard,
  CreatureReference,
} from '../../entities/creature'
import { Button, Checkbox, Panel, Popover, TextInput } from '../../shared/ui'
import type { CatalogCreature } from './bestiaryCatalog'
import { mockBestiaryCatalog } from './mockBestiary'
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
  onToggle,
}: {
  creatures: readonly CatalogCreature[]
  facet: (typeof FACETS)[number]
  filters: FilterState
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
  const [selected, setSelected] = useState<CatalogCreature | null>(null)
  const results = useMemo(() => filterCatalog(mockBestiaryCatalog, filters), [filters])
  const visible = results.slice(0, visibleCount)

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

  function chooseCreature(creature: CatalogCreature) {
    setSelected(creature)
  }

  function renderCreature(creature: CatalogCreature) {
    return (
      <button
        key={creature.id}
        type="button"
        className={styles.creatureButton}
        data-selected={selected?.id === creature.id}
        aria-pressed={selected?.id === creature.id}
        onClick={() => chooseCreature(creature)}
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
            onChange={(event) => updateFilters((current) => ({ ...current, query: event.target.value }))}
          />
          {FACETS.map((facet) => (
            <FacetControl
              key={facet.key}
              creatures={mockBestiaryCatalog}
              facet={facet}
              filters={filters}
              onToggle={toggleFacet}
            />
          ))}
          <label className={styles.sortField}>
            <span>Порядок</span>
            <select
              value={filters.sort}
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
            onClick={() => updateFilters(() => emptyFilters())}
          >
            Сброс
          </Button>
        </div>
      </Panel>

      <div className={styles.layout}>
        <Panel className={styles.listPanel} padding="compact">
          <div className={styles.listToolbar}>
            <div className={styles.alphabet} role="group" aria-label="Первая буква названия">
              <button type="button" data-active={!filters.letter} onClick={() => updateFilters((current) => ({ ...current, letter: '' }))}>Все</button>
              {LETTERS.map((letter) => (
                <button key={letter} type="button" data-active={filters.letter === letter} onClick={() => updateFilters((current) => ({ ...current, letter }))}>{letter}</button>
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
