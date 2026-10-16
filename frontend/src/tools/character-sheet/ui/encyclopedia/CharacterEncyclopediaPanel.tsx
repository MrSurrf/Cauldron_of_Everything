import { useEffect, useState } from 'react'
import { fetchEncyclopedia } from '../../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../../entities/encyclopedia'
import { Button, ListCard, ScrollArea, TextInput } from '../../../../shared/ui'
import { RichContent } from '../../../../shared/ui/RichContent'
import {
  toCharacterEncyclopediaEntry,
  writeCharacterEncyclopediaDrag,
} from './characterEncyclopediaDrag'
import type { CharacterEncyclopediaEntry, CharacterEncyclopediaMode } from './characterEncyclopediaDrag'
import styles from './CharacterEncyclopediaPanel.module.css'

const PAGE_SIZE = 30

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
    <aside className={[styles.panel, className].filter(Boolean).join(' ')} aria-label="Энциклопедия для листа персонажа" data-preview={Boolean(selectedEntry)}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Библиотека</span>
          <h2>Энциклопедия</h2>
        </div>
        <Button size="sm" variant="secondary" decoration="minimal" aria-label="Закрыть энциклопедию" onClick={onClose}>×</Button>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Раздел энциклопедии">
        <button type="button" role="tab" aria-selected={mode === 'item'} aria-controls="character-encyclopedia-results"
          className={styles.tab} onClick={() => changeMode('item')}>Предметы</button>
        <button type="button" role="tab" aria-selected={mode === 'spell'} aria-controls="character-encyclopedia-results"
          className={styles.tab} onClick={() => changeMode('spell')}>Заклинания</button>
      </div>

      <div className={styles.search}>
        <TextInput type="search" aria-label={mode === 'item' ? 'Поиск предметов' : 'Поиск заклинаний'}
          placeholder={mode === 'item' ? 'Название предмета…' : 'Название заклинания…'} value={query}
          onChange={(event) => { setQuery(event.target.value); setContentQuery(null); setPage(1) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { setContentQuery(query.trim() || null); setPage(1); event.preventDefault() }
          }} />
        <p>Перетащите запись на лист или нажмите «Добавить».</p>
      </div>

      <ScrollArea id="character-encyclopedia-results" rootClassName={styles.results} role="tabpanel"
        aria-label={mode === 'item' ? 'Предметы энциклопедии' : 'Заклинания энциклопедии'} aria-busy={loading}>
        {!currentResult && <p className={styles.message} role="status">Загрузка…</p>}
        {currentResult?.error && !loading && <div className={styles.message} role="alert">
          <p>{currentResult.error}</p>
          <Button size="sm" onClick={() => setAttempt((value) => value + 1)}>Повторить</Button>
        </div>}
        {currentResult && !loading && !currentResult.error && currentResult.entries.length === 0 &&
          <p className={styles.message} role="status">Записи не найдены.</p>}
        {currentResult?.entries.map((entry) => <div className={styles.row} key={`${entry.entityType}:${entry.id}`}>
          <button type="button" className={styles.entry} draggable aria-label={`Показать карточку: ${entry.name}`}
            aria-pressed={selectedEntry?.id === entry.id} onClick={() => setSelected(entry)}
            onDragStart={(event) => writeCharacterEncyclopediaDrag(event.dataTransfer, entry)}>
            <ListCard name={entry.name} tags={entryTags(entry)} />
          </button>
          <Button size="sm" variant="secondary" decoration="minimal" aria-label={`Добавить: ${entry.name}`}
            title="Добавить на лист" onClick={() => onAdd(entry)}>+</Button>
        </div>)}
      </ScrollArea>

      <div className={styles.pagination}>
        <Button size="sm" variant="secondary" disabled={page <= 1} aria-label="Предыдущая страница"
          onClick={() => setPage((value) => Math.max(1, value - 1))}>←</Button>
        <span>{page} · {currentResult?.count ?? '…'} записей</span>
        <Button size="sm" variant="secondary" disabled={loading || !currentResult || page * PAGE_SIZE >= currentResult.count}
          aria-label="Следующая страница" onClick={() => setPage((value) => value + 1)}>→</Button>
      </div>

      {selectedEntry && <section className={styles.preview} aria-label={`Карточка: ${selectedEntry.name}`}>
        <div className={styles.previewHeader}>
          <div><span className={styles.eyebrow}>{mode === 'spell' ? 'Заклинание' : 'Предмет'}</span><h3>{selectedEntry.name}</h3></div>
          <Button size="sm" onClick={() => onAdd(selectedEntry)}>Добавить</Button>
        </div>
        {selectedEntry.nameEn && <p className={styles.originalName}>{selectedEntry.nameEn}</p>}
        <ScrollArea rootClassName={styles.previewScroll} contentClassName={styles.previewContent}
          aria-label={`Описание: ${selectedEntry.name}`}>
          {!currentDetail && <p className={styles.message} role="status">Загрузка карточки…</p>}
          {currentDetail?.error && <p className={styles.message} role="alert">{currentDetail.error}</p>}
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
