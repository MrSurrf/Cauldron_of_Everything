import { useEffect, useState } from 'react'
import { CreatureCompactCard, CreatureReference, getCreatureById, searchCreatures } from '../../../entities/creature'
import type { CreatureEntity } from '../../../entities/creature'
import { Button, TextInput } from '../../../shared/ui'
import type { CreatureLink } from '../model/table'
import styles from './CampaignTable.module.css'

export const CREATURE_DRAG_TYPE = 'application/x-cauldron-creature'

function CreatureInspector({ creature, onClose }: { creature: CreatureLink; onClose: () => void }) {
  const [result, setResult] = useState<{ entity?: CreatureEntity; error?: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getCreatureById(creature.id, controller.signal).then(entity => {
      if (!controller.signal.aborted) setResult(entity ? { entity } : { error: 'Существо больше не доступно в бестиарии.' })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ error: 'Не удалось загрузить карточку существа.' })
    })
    return () => controller.abort()
  }, [creature.id, attempt])
  return <section className={styles.inspector} aria-label="Карточка существа">
    <div className={styles.sectionHeading}><h2>Карточка существа</h2>
      <Button size="sm" variant="secondary" decoration="minimal" onClick={onClose} aria-label="Закрыть карточку">×</Button>
    </div>
    <CreatureCompactCard entity={result?.entity ?? { ...creature, entityType: 'creature', sections: [] }} />
    {!result && <p role="status">Загрузка характеристик…</p>}
    {result?.error && <div role="alert"><p>{result.error}</p><Button size="sm" onClick={() => { setResult(null); setAttempt(value => value + 1) }}>Повторить</Button></div>}
    {result?.entity && <a className={styles.recordLink} href={`/encyclopedia/bestiary/${encodeURIComponent(creature.slug)}`} target="_blank" rel="noreferrer">Полная запись ↗</a>}
  </section>
}

export function BestiarySidebar({ selected, onSelect, onAdd }: {
  selected: CreatureLink | null
  onSelect: (creature: CreatureLink | null) => void
  onAdd: (creature: CreatureLink) => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; entities: CreatureEntity[]; count: number; error?: string } | null>(null)
  const key = `${query.trim()}:${page}:${attempt}`
  const ready = result?.key === key
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchCreatures(query, page, controller.signal).then(data => {
        if (!controller.signal.aborted) setResult({ key, ...data })
      }).catch(() => {
        if (!controller.signal.aborted) setResult({ key, entities: [], count: 0, error: 'Бестиарий недоступен. Проверьте подключение к серверу.' })
      })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [key, query, page])

  return <aside className={styles.bestiary} aria-label="Бестиарий">
    <div className={styles.sectionHeading}><h2>Бестиарий</h2><span className={styles.badge}>Существа</span></div>
    <TextInput type="search" aria-label="Поиск существ" placeholder="Поиск существ…" value={query}
      rootClassName={styles.search} onChange={event => { setQuery(event.target.value); setPage(1) }} />
    <p className={styles.hint}>Перетащите существо на холст или нажмите «+».</p>
    <div className={styles.catalog} aria-busy={!ready}>
      {!ready && <p role="status">Ищем существ…</p>}
      {ready && result.error && <div role="alert"><p>{result.error}</p><Button size="sm" onClick={() => setAttempt(value => value + 1)}>Повторить</Button></div>}
      {ready && !result.error && result.entities.length === 0 && <p role="status">Существа не найдены.</p>}
      {ready && result.entities.map(entity => <div key={entity.id} className={styles.catalogRow}>
        <button type="button" className={styles.creature} draggable aria-label={`Открыть: ${entity.name}`}
          onClick={() => onSelect(entity)} onDragStart={event => {
            const link: CreatureLink = { id: entity.id, slug: entity.slug, name: entity.name }
            event.dataTransfer.setData(CREATURE_DRAG_TYPE, JSON.stringify(link))
            event.dataTransfer.effectAllowed = 'copy'
          }}><CreatureReference entity={entity} /></button>
        <Button size="sm" variant="secondary" decoration="minimal" aria-label={`Добавить на холст: ${entity.name}`} onClick={() => onAdd(entity)}>+</Button>
      </div>)}
    </div>
    <div className={styles.pagination}>
      <Button size="sm" variant="secondary" decoration="minimal" disabled={page === 1} onClick={() => setPage(value => value - 1)} aria-label="Предыдущая страница">←</Button>
      <span>{page} · {ready ? `Найдено: ${result.count}` : '…'}</span>
      <Button size="sm" variant="secondary" decoration="minimal" disabled={!ready || page * 40 >= result.count} onClick={() => setPage(value => value + 1)} aria-label="Следующая страница">→</Button>
    </div>
    {selected && <CreatureInspector key={selected.id} creature={selected} onClose={() => onSelect(null)} />}
  </aside>
}
