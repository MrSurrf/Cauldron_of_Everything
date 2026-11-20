import { useEffect, useRef, useState } from 'react'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { Button, Popover, ScrollArea, Select, TextInput } from '../../../shared/ui'
import { entityLabel } from '../model/library'
import type { CanvasEntity } from '../model/table'
import styles from './WikiLinkPicker.module.css'

const encyclopediaTypes = [
  { value: 'spell', label: 'Заклинания' },
  { value: 'item', label: 'Предметы' },
  { value: 'creature', label: 'Существа' },
  { value: 'class', label: 'Классы' },
  { value: 'race', label: 'Расы' },
  { value: 'feat', label: 'Черты' },
  { value: 'background', label: 'Предыстории' },
  { value: 'sidekick', label: 'Спутники' },
] as const

function encyclopediaPath(entry: EncyclopediaEntry) {
  if (['creature', 'item', 'class'].includes(entry.entity_type)) {
    return `/encyclopedia/${entry.entity_type}/${encodeURIComponent(entry.slug)}`
  }
  return `/encyclopedia/entry/${entry.id}`
}

export function WikiLinkPicker({ currentEntityId, entities, onInsert }: {
  currentEntityId: string
  entities: CanvasEntity[]
  onInsert: (label: string, target: string) => void
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<'campaign' | 'encyclopedia'>('campaign')
  const [type, setType] = useState('spell')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ key: string; entries: EncyclopediaEntry[]; error?: string } | null>(null)
  const key = `${type}:${query.trim()}`

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, source])

  useEffect(() => {
    if (!open || source !== 'encyclopedia') return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ type, q: query.trim(), page_size: '20' })
      void fetchEncyclopedia<{ results: EncyclopediaEntry[] }>(`?${params}`, controller.signal)
        .then(page => { if (!controller.signal.aborted) setResult({ key, entries: page.results }) })
        .catch((cause: unknown) => { if (!controller.signal.aborted) setResult({ key, entries: [], error: cause instanceof Error ? cause.message : 'Не удалось загрузить энциклопедию.' }) })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [key, open, query, source, type])

  const localEntries = entities.filter(entity => entity.id !== currentEntityId
    && (!query.trim() || entity.name.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))))
  const encyclopediaResult = result?.key === key ? result : null

  function insert(label: string, target: string) {
    onInsert(label, target)
    setOpen(false)
    setQuery('')
  }

  return <Popover modal open={open} onOpenChange={setOpen} aria-label="Вставить внутреннюю ссылку"
    className={styles.popover} content={<section className={styles.picker}>
      <header><div><h2>Внутренняя ссылка</h2><p>Страница откроется в этой же правой панели.</p></div>
        <Button size="sm" variant="secondary" decoration="bare" aria-label="Закрыть выбор ссылки" onClick={() => setOpen(false)}>×</Button></header>
      <div className={styles.sources} role="tablist" aria-label="Источник ссылки">
        <button type="button" role="tab" aria-selected={source === 'campaign'} onClick={() => { setSource('campaign'); setQuery('') }}>Кампания</button>
        <button type="button" role="tab" aria-selected={source === 'encyclopedia'} onClick={() => { setSource('encyclopedia'); setQuery('') }}>Энциклопедия</button>
      </div>
      <div className={styles.filters}>
        <TextInput ref={searchRef} type="search" aria-label="Поиск страницы для ссылки" placeholder="Найти страницу…" value={query} onChange={event => setQuery(event.target.value)} />
        {source === 'encyclopedia' && <Select aria-label="Раздел энциклопедии" value={type} options={encyclopediaTypes} onValueChange={setType} />}
      </div>
      <ScrollArea rootClassName={styles.results} contentClassName={styles.list} aria-label="Страницы для ссылки">
        {source === 'campaign' && localEntries.map(entity => <button type="button" key={entity.id}
          onClick={() => insert(entity.name, `#entity:${encodeURIComponent(entity.id)}`)}><strong>{entity.name}</strong><small>{entityLabel(entity.entityType)}</small></button>)}
        {source === 'campaign' && !localEntries.length && <p role="status">Подходящих страниц кампании нет.</p>}
        {source === 'encyclopedia' && !encyclopediaResult && <p role="status">Загрузка энциклопедии…</p>}
        {source === 'encyclopedia' && encyclopediaResult?.error && <p role="alert">{encyclopediaResult.error}</p>}
        {source === 'encyclopedia' && encyclopediaResult && !encyclopediaResult.error && !encyclopediaResult.entries.length && <p role="status">Ничего не найдено.</p>}
        {source === 'encyclopedia' && encyclopediaResult?.entries.map(entry => <button type="button" key={entry.id}
          onClick={() => insert(entry.name, encyclopediaPath(entry))}><strong>{entry.name}</strong><small>{encyclopediaTypes.find(option => option.value === entry.entity_type)?.label ?? entry.entity_type}</small></button>)}
      </ScrollArea>
    </section>}>
    <Button size="sm" variant="secondary" decoration="bare">+ Ссылка</Button>
  </Popover>
}
