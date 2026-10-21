import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, Combobox, ListCard, ScrollArea, TextInput } from '../../../shared/ui'
import catalogStyles from '../../../shared/ui/CatalogSidebar/CatalogSidebar.module.css'
import { canPlaceReference, PLACEMENT_LIBRARY_SECTIONS, searchLibrary } from '../model/library'
import type { LibraryReference, LibrarySection } from '../model/library'
import { ENTITY_DRAG_TYPE } from './tableContext'
import { ResizeGrip } from './ResizeGrip'
import styles from './CampaignTable.module.css'

const encyclopediaSections = PLACEMENT_LIBRARY_SECTIONS.filter(([id]) => id !== 'character' && id !== 'campaign')
const mineSections = PLACEMENT_LIBRARY_SECTIONS.filter(([id]) => id === 'character' || id === 'campaign')

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
  return <aside ref={paneRef} className={`${catalogStyles.panel} ${styles.bestiary}`} aria-label="Библиотека">
    <ResizeGrip label="Ширина библиотеки" width={measuredWidth} onResize={onResize} max={650} />
    <div className={catalogStyles.header}><h2>Библиотека</h2><Button size="sm" variant="secondary" decoration="minimal" aria-label="Свернуть библиотеку" onClick={onCollapse}>×</Button></div>
    <div className={styles.librarySources} role="tablist" aria-label="Источник библиотеки">
      <button id="library-source-encyclopedia" type="button" role="tab" aria-selected={source === 'encyclopedia'} aria-controls="library-results"
        tabIndex={source === 'encyclopedia' ? 0 : -1} onClick={() => selectSection(lastSection.encyclopedia)}
        onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); selectSection(lastSection.mine); document.getElementById('library-source-mine')?.focus() } }}>Энциклопедия</button>
      <button id="library-source-mine" type="button" role="tab" aria-selected={source === 'mine'} aria-controls="library-results"
        tabIndex={source === 'mine' ? 0 : -1} onClick={() => selectSection(lastSection.mine)}
        onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); selectSection(lastSection.encyclopedia); document.getElementById('library-source-encyclopedia')?.focus() } }}>Моё</button>
    </div>
    <div className={catalogStyles.filters}>
      <Combobox aria-label="Раздел библиотеки" value={section}
        options={sections.map(([value, label]) => ({ value, label }))}
        onValueChange={value => { if (value !== null) selectSection(value as LibrarySection) }} />
      <TextInput type="search" aria-label="Поиск в библиотеке" placeholder="Поиск…" value={query} onChange={event => onQuery(event.target.value)} />
    </div>
    <ScrollArea rootClassName={catalogStyles.results} id="library-results" role="tabpanel" aria-labelledby={`library-source-${source}`} aria-busy={!current}>
      {!current && <p className={catalogStyles.message} role="status">Загрузка…</p>}
      {current?.error && <div className={catalogStyles.message} role="alert"><p>{current.error}</p><Button size="sm" onClick={() => setAttempt(value => value + 1)}>Повторить</Button></div>}
      {current && !current.error && !current.entries.length && <p className={catalogStyles.message} role="status">{section === 'reference' ? 'Справочные материалы в энциклопедии пока не опубликованы.' : 'Записи не найдены.'}</p>}
      {current?.entries.map(reference => <div key={`${reference.source}:${reference.entityId}`} className={catalogStyles.row}>
        <button type="button" className={catalogStyles.entry} draggable={canPlaceReference(reference)} aria-label={`Открыть: ${reference.name}`} onClick={() => onOpen(reference)} onDragStart={event => {
          if (!canPlaceReference(reference)) { event.preventDefault(); return }
          event.dataTransfer.setData(ENTITY_DRAG_TYPE, JSON.stringify(reference)); event.dataTransfer.effectAllowed = 'copy'
        }}><ListCard name={reference.name} tags={reference.facts} /></button>
        {canPlaceReference(reference) && <Button size="sm" variant="secondary" decoration="minimal" aria-label={`Добавить на холст: ${reference.name}`} onClick={() => onAdd(reference)}>+</Button>}
      </div>)}
    </ScrollArea>
    <div className={catalogStyles.pagination}>
      <Button size="sm" variant="secondary" disabled={currentPage === 1} aria-label="Предыдущая страница" onClick={() => setPage({ section, query, value: currentPage - 1 })}>←</Button>
      <span>{currentPage} · {current?.count ?? '…'} записей</span>
      <Button size="sm" variant="secondary" disabled={!current || currentPage * 30 >= current.count} aria-label="Следующая страница" onClick={() => setPage({ section, query, value: currentPage + 1 })}>→</Button>
    </div>
  </aside>
}
