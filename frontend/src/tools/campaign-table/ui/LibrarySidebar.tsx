import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, ListCard, TextInput } from '../../../shared/ui'
import { canPlaceReference, LIBRARY_SECTIONS, searchLibrary } from '../model/library'
import type { LibraryReference, LibrarySection } from '../model/library'
import { ENTITY_DRAG_TYPE } from './tableContext'
import { ResizeGrip } from './ResizeGrip'
import styles from './CampaignTable.module.css'

const encyclopediaSections = LIBRARY_SECTIONS.filter(([id]) => id !== 'character' && id !== 'campaign')
const mineSections = LIBRARY_SECTIONS.filter(([id]) => id === 'character' || id === 'campaign')

export function LibrarySidebar({ section, query, width, onCollapse, onSection, onQuery, onResize, onOpen, onAdd }: {
  section: LibrarySection; query: string; width: number
  onCollapse: () => void; onSection: (section: LibrarySection) => void; onQuery: (query: string) => void; onResize: (width: number) => void
  onOpen: (reference: LibraryReference) => void; onAdd: (reference: LibraryReference) => void
}) {
  const paneRef = useRef<HTMLElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState(width)
  const [lastSection, setLastSection] = useState<{ encyclopedia: LibrarySection; mine: LibrarySection }>({
    encyclopedia: encyclopediaSections.some(([id]) => id === section) ? section : 'creature',
    mine: mineSections.some(([id]) => id === section) ? section : 'character',
  })
  const source = mineSections.some(([id]) => id === section) ? 'mine' : 'encyclopedia'
  const sections = source === 'mine' ? mineSections : encyclopediaSections
  function selectSection(next: LibrarySection) {
    setLastSection(current => ({ ...current, [mineSections.some(([id]) => id === next) ? 'mine' : 'encyclopedia']: next }))
    onSection(next)
  }
  useLayoutEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    const observer = new ResizeObserver(() => setMeasuredWidth(Math.round(pane.getBoundingClientRect().width)))
    observer.observe(pane)
    return () => observer.disconnect()
  }, [])
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
  return <aside ref={paneRef} className={styles.bestiary} aria-label="Библиотека">
    <ResizeGrip label="Ширина библиотеки" width={measuredWidth} onResize={onResize} max={650} />
    <div className={styles.sectionHeading}><h2>Библиотека</h2><Button size="sm" variant="secondary" decoration="minimal" aria-label="Свернуть библиотеку" onClick={onCollapse}>×</Button></div>
    <div className={styles.librarySources} role="tablist" aria-label="Источник библиотеки">
      <button id="library-source-encyclopedia" type="button" role="tab" aria-selected={source === 'encyclopedia'} aria-controls="library-results"
        tabIndex={source === 'encyclopedia' ? 0 : -1} onClick={() => selectSection(lastSection.encyclopedia)}
        onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); selectSection(lastSection.mine); document.getElementById('library-source-mine')?.focus() } }}>Энциклопедия</button>
      <button id="library-source-mine" type="button" role="tab" aria-selected={source === 'mine'} aria-controls="library-results"
        tabIndex={source === 'mine' ? 0 : -1} onClick={() => selectSection(lastSection.mine)}
        onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); selectSection(lastSection.encyclopedia); document.getElementById('library-source-encyclopedia')?.focus() } }}>Моё</button>
    </div>
    <div className={styles.libraryFilters}>
      <select aria-label="Раздел библиотеки" value={section} onChange={event => selectSection(event.target.value as LibrarySection)}>
        {sections.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
      </select>
      <TextInput type="search" aria-label="Поиск в библиотеке" placeholder="Поиск…" rootClassName={styles.search} value={query} onChange={event => onQuery(event.target.value)} />
    </div>
    <div className={styles.catalog} id="library-results" role="tabpanel" aria-labelledby={`library-source-${source}`} aria-busy={!current}>
      {!current && <p role="status">Загрузка…</p>}
      {current?.error && <div role="alert"><p>{current.error}</p><Button size="sm" onClick={() => setAttempt(value => value + 1)}>Повторить</Button></div>}
      {current && !current.error && !current.entries.length && <p role="status">{section === 'reference' ? 'Справочные материалы в энциклопедии пока не опубликованы.' : 'Записи не найдены.'}</p>}
      {current?.entries.map(reference => <div key={`${reference.source}:${reference.entityId}`} className={styles.catalogRow}>
        <button type="button" className={styles.creature} draggable={canPlaceReference(reference)} aria-label={`Открыть: ${reference.name}`} onClick={() => onOpen(reference)} onDragStart={event => {
          if (!canPlaceReference(reference)) { event.preventDefault(); return }
          event.dataTransfer.setData(ENTITY_DRAG_TYPE, JSON.stringify(reference)); event.dataTransfer.effectAllowed = 'copy'
        }}><ListCard name={reference.name} tags={reference.facts} /></button>
        {canPlaceReference(reference) && <Button size="sm" variant="secondary" decoration="minimal" aria-label={`Добавить на холст: ${reference.name}`} onClick={() => onAdd(reference)}>+</Button>}
      </div>)}
    </div>
    <div className={styles.pagination}>
      <Button size="sm" variant="secondary" disabled={currentPage === 1} onClick={() => setPage({ section, query, value: currentPage - 1 })}>←</Button>
      <span>{currentPage} · {current?.count ?? '…'} записей</span>
      <Button size="sm" variant="secondary" disabled={!current || currentPage * 30 >= current.count} onClick={() => setPage({ section, query, value: currentPage + 1 })}>→</Button>
    </div>
  </aside>
}
