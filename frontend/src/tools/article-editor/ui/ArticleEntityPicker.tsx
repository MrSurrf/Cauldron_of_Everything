import { useEffect, useRef, useState } from 'react'

import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { BookIcon, Button, ListCard, Popover, ScrollArea, Select, TextInput } from '../../../shared/ui'
import type { ArticleEntity } from '../model'
import styles from './ArticleEntityPicker.module.css'

const SECTIONS = [
  { value: 'spell', label: 'Заклинания' },
  { value: 'item', label: 'Предметы' },
  { value: 'creature', label: 'Существа' },
  { value: 'class', label: 'Классы' },
  { value: 'race', label: 'Расы' },
  { value: 'feat', label: 'Черты' },
  { value: 'background', label: 'Предыстории' },
  { value: 'sidekick', label: 'Спутники' },
]
const PAGE_SIZE = 20

type SearchResult = {
  key: string
  entries: ArticleEntity[]
  count: number
  error?: string
}
type SearchEntry = EncyclopediaEntry & { sources?: unknown }

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function entryTags(entity: ArticleEntity): string[] {
  const { summary } = entity
  const type = SECTIONS.find((section) => section.value === entity.type)?.label ?? entity.type
  const sources = Array.isArray(summary.sources)
    ? summary.sources.flatMap((source) => {
      if (typeof source === 'string') return [source]
      if (source && typeof source === 'object') return [text((source as Record<string, unknown>).short ?? (source as Record<string, unknown>).name)]
      return []
    }).filter(Boolean).join(', ')
    : text(summary.sources)
  const level = entity.type === 'spell' && summary.level !== undefined
    ? Number(summary.level) === 0 ? 'Заговор' : `${text(summary.level)}-й уровень`
    : ''
  return [type, level, text(summary.school ?? summary.rarity ?? summary.challenge_rating), sources].filter(Boolean)
}

function toArticleEntity(entry: SearchEntry): ArticleEntity | null {
  if (!Number.isSafeInteger(entry.id) || entry.id <= 0 || typeof entry.name !== 'string') return null
  return {
    id: entry.id,
    type: entry.entity_type,
    slug: entry.slug,
    name: entry.name,
    nameEn: entry.name_en ?? '',
    summary: { ...(entry.data ?? {}), ...(entry.summary ?? {}), ...(entry.sources === undefined ? {} : { sources: entry.sources }) },
  }
}

export function ArticleEntityPicker({ onInsert }: { onInsert: (entity: ArticleEntity) => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('spell')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<SearchResult | null>(null)
  const searchKey = JSON.stringify([type, query.trim(), page, attempt])
  const currentResult = result?.key === searchKey ? result : null
  const loading = open && !currentResult

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    // Native modal делает триггер inert до завершения закрытия.
    if (!nextOpen) requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ type, page: String(page), page_size: String(PAGE_SIZE) })
      if (query.trim()) params.set('q', query.trim())
      fetchEncyclopedia<{ count: number; results: SearchEntry[] }>(`?${params}`, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return
          setResult({
            key: searchKey,
            count: data.count,
            entries: data.results.flatMap((entry) => {
              const entity = toArticleEntity(entry)
              return entity ? [entity] : []
            }),
          })
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return
          setResult({
            key: searchKey,
            count: 0,
            entries: [],
            error: cause instanceof Error ? cause.message : 'Не удалось загрузить энциклопедию.',
          })
        })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [open, type, query, page, attempt, searchKey])

  return (
    <Popover
      modal
      open={open}
      onOpenChange={changeOpen}
      aria-label="Вставить карточку сущности"
      className={styles.modal}
      content={(
        <section className={styles.picker}>
          <header className={styles.header}>
            <div>
              <h2>Карточка сущности</h2>
              <p>Выберите запись энциклопедии, чтобы вставить её в статью.</p>
            </div>
            <Button size="sm" variant="secondary" decoration="bare" aria-label="Закрыть выбор сущности"
              onClick={() => changeOpen(false)}>×</Button>
          </header>
          <div className={styles.filters}>
            <TextInput ref={searchRef} type="search" aria-label="Поиск сущности для статьи" placeholder="Найти в энциклопедии…"
              value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
            <Select aria-label="Тип сущности" value={type} options={SECTIONS}
              onValueChange={(value) => { setType(value); setPage(1) }} />
          </div>
          <ScrollArea rootClassName={styles.results} contentClassName={styles.list}
            aria-label="Найденные сущности" aria-busy={loading}>
            {loading && <p className={styles.message} role="status">Загрузка энциклопедии…</p>}
            {currentResult?.error && <div className={styles.message} role="alert">
              <p>{currentResult.error}</p>
              <Button size="sm" variant="secondary" decoration="minimal" onClick={() => setAttempt((value) => value + 1)}>Повторить</Button>
            </div>}
            {currentResult && !currentResult.error && !currentResult.entries.length
              && <p className={styles.message} role="status">Ничего не найдено. Попробуйте другое название.</p>}
            {currentResult?.entries.map((entity) => (
              <button className={styles.entry} type="button" key={entity.id} aria-label={`Вставить карточку: ${entity.name}`}
                onClick={() => { changeOpen(false); onInsert(entity) }}>
                <ListCard appearance="navigation" icon={<BookIcon />} name={entity.name} tags={entryTags(entity)} />
              </button>
            ))}
          </ScrollArea>
          {currentResult && !currentResult.error && currentResult.count > PAGE_SIZE && <footer className={styles.pagination}>
            <Button size="sm" variant="secondary" decoration="bare" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Назад</Button>
            <span>Страница {page} из {Math.ceil(currentResult.count / PAGE_SIZE)}</span>
            <Button size="sm" variant="secondary" decoration="bare" disabled={page * PAGE_SIZE >= currentResult.count} onClick={() => setPage((value) => value + 1)}>Далее</Button>
          </footer>}
          <p className={styles.hint}>Карточка и её название сохранятся в черновике. Для поиска нужен доступ к энциклопедии.</p>
        </section>
      )}
    >
      <Button ref={triggerRef} size="sm" variant="secondary" decoration="bare" title="Вставить карточку сущности">
        <span className={styles.triggerIcon} aria-hidden="true"><BookIcon /></span> Карточка сущности
      </Button>
    </Popover>
  )
}
