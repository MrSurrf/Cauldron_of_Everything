import { useEffect, useState } from 'react'
import { Button, ListCard, TextInput } from '../../../shared/ui'
import { LIBRARY_SECTIONS, searchLibrary } from '../model/library'
import type { LibraryReference, LibrarySection } from '../model/library'
import { ENTITY_DRAG_TYPE } from './tableContext'
import { ResizeGrip } from './ResizeGrip'
import styles from './CampaignTable.module.css'

export function LibrarySidebar({ section, query, width, onSection, onQuery, onResize, onOpen, onAdd }: {
  section: LibrarySection; query: string; width: number
  onSection: (section: LibrarySection) => void; onQuery: (query: string) => void; onResize: (width: number) => void
  onOpen: (reference: LibraryReference) => void; onAdd: (reference: LibraryReference) => void
}) {
  const [page, setPage] = useState({ section, query, value: 1 })
  const currentPage = page.section === section && page.query === query ? page.value : 1
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; count: number; entries: LibraryReference[]; error?: string } | null>(null)
  const key = JSON.stringify([section, query, currentPage, attempt])
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchLibrary(section, query, currentPage, controller.signal).then(value => {
        if (!controller.signal.aborted) setResult({ key, ...value })
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, count: 0, entries: [], error: error instanceof Error ? error.message : 'Не удалось загрузить библиотеку.' })
      })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [key, section, query, currentPage])
  const current = result?.key === key ? result : null
  return <aside className={styles.bestiary} aria-label="Библиотека">
    <ResizeGrip label="Ширина библиотеки" width={width} onResize={onResize} max={650} />
    <div className={styles.sectionHeading}><h2>Библиотека</h2></div>
    <div className={styles.libraryTabs} role="tablist" aria-label="Разделы библиотеки">
      {LIBRARY_SECTIONS.map(([id, title]) => <button key={id} id={`library-tab-${id}`} type="button" role="tab" aria-selected={section === id} aria-controls="library-results"
        onClick={() => onSection(id)}>{title}</button>)}
    </div>
    <TextInput type="search" aria-label="Поиск в библиотеке" placeholder="Поиск по разделу…" rootClassName={styles.search} value={query} onChange={event => onQuery(event.target.value)} />
    <p className={styles.hint}>Перетащите запись на схему или нажмите «+».</p>
    <div className={styles.catalog} id="library-results" role="tabpanel" aria-labelledby={`library-tab-${section}`} aria-busy={!current}>
      {!current && <p role="status">Загрузка…</p>}
      {current?.error && <div role="alert"><p>{current.error}</p><Button size="sm" onClick={() => setAttempt(value => value + 1)}>Повторить</Button></div>}
      {current && !current.error && !current.entries.length && <p role="status">{section === 'reference' ? 'Справочные материалы в энциклопедии пока не опубликованы.' : 'Записи не найдены.'}</p>}
      {current?.entries.map(reference => <div key={`${reference.source}:${reference.entityId}`} className={styles.catalogRow}>
        <button type="button" className={styles.creature} draggable aria-label={`Открыть: ${reference.name}`} onClick={() => onOpen(reference)} onDragStart={event => {
          event.dataTransfer.setData(ENTITY_DRAG_TYPE, JSON.stringify(reference)); event.dataTransfer.effectAllowed = 'copy'
        }}><ListCard name={reference.name} tags={reference.facts} /></button>
        <Button size="sm" variant="secondary" decoration="minimal" aria-label={`Добавить на холст: ${reference.name}`} onClick={() => onAdd(reference)}>+</Button>
      </div>)}
    </div>
    <div className={styles.pagination}>
      <Button size="sm" variant="secondary" disabled={currentPage === 1} onClick={() => setPage({ section, query, value: currentPage - 1 })}>←</Button>
      <span>{currentPage} · {current?.count ?? '…'} записей</span>
      <Button size="sm" variant="secondary" disabled={!current || currentPage * 30 >= current.count} onClick={() => setPage({ section, query, value: currentPage + 1 })}>→</Button>
    </div>
  </aside>
}
