import { useEffect, useState } from 'react'
import { fetchEncyclopedia } from '../../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../../entities/encyclopedia'
import { Button, Combobox, ListCard, ScrollArea, TextInput } from '../../../../shared/ui'
import catalogStyles from '../../../../shared/ui/CatalogSidebar/CatalogSidebar.module.css'
import { RichContent } from '../../../../shared/ui/RichContent'
import {
  toCharacterEncyclopediaEntry,
  writeCharacterEncyclopediaDrag,
} from './characterEncyclopediaDrag'
import type { CharacterEncyclopediaEntry, CharacterEncyclopediaMode } from './characterEncyclopediaDrag'
import styles from './CharacterEncyclopediaPanel.module.css'
import { useCharacterEncyclopediaDrag } from './useCharacterEncyclopediaDrag'
import dragStyles from './characterEncyclopediaDragFeedback.module.css'

const PAGE_SIZE = 30
const SECTIONS: Record<CharacterEncyclopediaMode, { label: string; singular: string; search: string; placeholder: string }> = {
  item: { label: 'Предметы', singular: 'Предмет', search: 'Поиск предметов', placeholder: 'Название предмета…' },
  spell: { label: 'Заклинания', singular: 'Заклинание', search: 'Поиск заклинаний', placeholder: 'Название заклинания…' },
  class: { label: 'Классы', singular: 'Класс', search: 'Поиск классов', placeholder: 'Название класса…' },
  race: { label: 'Расы', singular: 'Раса', search: 'Поиск рас', placeholder: 'Название расы…' },
  background: { label: 'Предыстории', singular: 'Предыстория', search: 'Поиск предысторий', placeholder: 'Название предыстории…' },
}

type SearchResult = {
  key: string
  mode: CharacterEncyclopediaMode
  count: number
  entries: CharacterEncyclopediaEntry[]
  error?: string
}

type EntryDetail = {
  key: string
  entry?: EncyclopediaEntry
  error?: string
}

export type CharacterEncyclopediaPanelProps = {
  mode: CharacterEncyclopediaMode
  onModeChange: (mode: CharacterEncyclopediaMode) => void
  onAdd: (entry: CharacterEncyclopediaEntry) => void
  onClose: () => void
  className?: string
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function entryTags(entry: CharacterEncyclopediaEntry): string[] {
  const { summary } = entry
  if (entry.entityType === 'spell') {
    return [entry.level === 0 ? 'Заговор' : entry.level === null ? '' : `${entry.level}-й уровень`, text(summary.school)]
      .filter(Boolean)
  }
  if (entry.entityType !== 'item') return [entry.nameEn].filter(Boolean)
  return [text(summary.type ?? summary.item_type), text(summary.rarity), text(summary.cost ?? summary.price)]
    .filter(Boolean)
}

export function CharacterEncyclopediaPanel({
  mode,
  onModeChange,
  onAdd,
  onClose,
  className,
}: CharacterEncyclopediaPanelProps) {
  const { entry: draggedEntry, beginDrag } = useCharacterEncyclopediaDrag()
  const [query, setQuery] = useState('')
  const [contentQuery, setContentQuery] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [selected, setSelected] = useState<CharacterEncyclopediaEntry | null>(null)
  const [detail, setDetail] = useState<EntryDetail | null>(null)
  const selectedEntry = selected?.entityType === mode ? selected : null
  const searchByContent = Boolean(contentQuery && contentQuery === query.trim())
  const searchKey = JSON.stringify([mode, query.trim(), searchByContent, page, attempt])
  const detailKey = selectedEntry ? `${selectedEntry.entityType}:${selectedEntry.id}` : ''
  const currentResult = result?.mode === mode ? result : null
  const loading = currentResult?.key !== searchKey
  const currentDetail = detail?.key === detailKey ? detail : null
  const section = SECTIONS[mode]

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ type: mode, page: String(page), page_size: String(PAGE_SIZE) })
      if (query.trim()) params.set(searchByContent ? 'q' : 'name_prefix', query.trim())
      fetchEncyclopedia<{ count: number; results: EncyclopediaEntry[] }>(`?${params}`, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return
          setResult({
            key: searchKey,
            mode,
            count: data.count,
            entries: data.results.flatMap((entry) => {
              const converted = toCharacterEncyclopediaEntry(entry)
              return converted ? [converted] : []
            }),
          })
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setResult({
            key: searchKey,
            mode,
            count: 0,
            entries: [],
            error: cause instanceof Error ? cause.message : 'Не удалось загрузить энциклопедию.',
          })
        })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [mode, query, page, attempt, searchKey, searchByContent])

  useEffect(() => {
    if (!selectedEntry) return
    const controller = new AbortController()
    fetchEncyclopedia<EncyclopediaEntry>(`${selectedEntry.id}/`, controller.signal)
      .then((entry) => {
        if (!controller.signal.aborted) setDetail({ key: detailKey, entry })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setDetail({
          key: detailKey,
          error: cause instanceof Error ? cause.message : 'Не удалось загрузить карточку.',
        })
      })
    return () => controller.abort()
  }, [selectedEntry, detailKey])

  const changeMode = (nextMode: CharacterEncyclopediaMode) => {
    if (nextMode === mode) return
    setPage(1)
    setContentQuery(null)
    onModeChange(nextMode)
  }

  return (
    <aside className={[catalogStyles.panel, styles.panel, className].filter(Boolean).join(' ')} aria-label="Энциклопедия для листа персонажа" data-preview={Boolean(selectedEntry)}>
      <header className={catalogStyles.header}>
        <h2>Энциклопедия</h2>
        <Button size="sm" variant="secondary" decoration="minimal" aria-label="Закрыть энциклопедию" onClick={onClose}>×</Button>
      </header>

      <div className={catalogStyles.filters}>
        <Combobox aria-label="Раздел энциклопедии" value={mode}
          options={(Object.keys(SECTIONS) as CharacterEncyclopediaMode[]).map((value) => ({ value, label: SECTIONS[value].label }))}
          onValueChange={(value) => { if (value !== null) changeMode(value as CharacterEncyclopediaMode) }} />
        <TextInput type="search" aria-label={section.search}
          placeholder={section.placeholder} value={query}
          onChange={(event) => { setQuery(event.target.value); setContentQuery(null); setPage(1) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { setContentQuery(query.trim() || null); setPage(1); event.preventDefault() }
          }} />
      </div>
      <p className={catalogStyles.hint}>{mode === 'class' || mode === 'race' || mode === 'background'
        ? `Перетащите запись в поле «${section.singular}» или нажмите «Добавить».`
        : 'Перетащите запись на лист или нажмите «Добавить».'}</p>

      <ScrollArea id="character-encyclopedia-results" rootClassName={catalogStyles.results}
        aria-label={`${section.label} энциклопедии`} aria-busy={loading}>
        {!currentResult && <p className={catalogStyles.message} role="status">Загрузка…</p>}
        {currentResult?.error && !loading && <div className={catalogStyles.message} role="alert">
          <p>{currentResult.error}</p>
          <Button size="sm" onClick={() => setAttempt((value) => value + 1)}>Повторить</Button>
        </div>}
        {currentResult && !loading && !currentResult.error && currentResult.entries.length === 0 &&
          <p className={catalogStyles.message} role="status">Записи не найдены.</p>}
        {currentResult?.entries.map((entry) => <div className={catalogStyles.row} key={`${entry.entityType}:${entry.id}`}>
          <button type="button" className={`${catalogStyles.entry} ${dragStyles.source}`} draggable aria-label={`Показать карточку: ${entry.name}`}
            data-encyclopedia-dragging={draggedEntry?.id === entry.id && draggedEntry.entityType === entry.entityType || undefined}
            aria-pressed={selectedEntry?.id === entry.id} onClick={() => setSelected(entry)}
            onDragStart={(event) => {
              writeCharacterEncyclopediaDrag(event.dataTransfer, entry)
              beginDrag(event, entry)
            }}>
            <ListCard name={entry.name} tags={entryTags(entry)} />
          </button>
          <Button size="sm" variant="secondary" decoration="minimal" aria-label={`Добавить: ${entry.name}`}
            title="Добавить на лист" onClick={() => onAdd(entry)}>+</Button>
        </div>)}
      </ScrollArea>

      <div className={catalogStyles.pagination}>
        <Button size="sm" variant="secondary" disabled={page <= 1} aria-label="Предыдущая страница"
          onClick={() => setPage((value) => Math.max(1, value - 1))}>←</Button>
        <span>{page} · {currentResult?.count ?? '…'} записей</span>
        <Button size="sm" variant="secondary" disabled={loading || !currentResult || page * PAGE_SIZE >= currentResult.count}
          aria-label="Следующая страница" onClick={() => setPage((value) => value + 1)}>→</Button>
      </div>

      {selectedEntry && <section className={styles.preview} aria-label={`Карточка: ${selectedEntry.name}`}>
        <div className={styles.previewHeader}>
          <div><span className={styles.eyebrow}>{section.singular}</span><h3>{selectedEntry.name}</h3></div>
          <Button size="sm" onClick={() => onAdd(selectedEntry)}>Добавить</Button>
        </div>
        {selectedEntry.nameEn && <p className={styles.originalName}>{selectedEntry.nameEn}</p>}
        <ScrollArea rootClassName={styles.previewScroll} contentClassName={styles.previewContent}
          aria-label={`Описание: ${selectedEntry.name}`}>
          {!currentDetail && <p className={catalogStyles.message} role="status">Загрузка карточки…</p>}
          {currentDetail?.error && <p className={catalogStyles.message} role="alert">{currentDetail.error}</p>}
          {currentDetail?.entry && (currentDetail.entry.content_html
            ? <RichContent html={currentDetail.entry.content_html} />
            : <p className={styles.description}>{currentDetail.entry.content_text || 'Описание отсутствует.'}</p>)}
        </ScrollArea>
        <a className={styles.fullLink} href={`/encyclopedia/entry/${selectedEntry.id}`} target="_blank" rel="noopener noreferrer">
          Открыть полную запись ↗
        </a>
      </section>}
    </aside>
  )
}
