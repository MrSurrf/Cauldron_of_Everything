import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ListCard, Panel, PlaceholderIcon, ScrollArea } from '../../shared/ui'
import { clearHistory, fetchPopularEncyclopedia } from '../../entities/encyclopedia'
import type { EncyclopediaVisit, PopularEncyclopediaEntry } from '../../entities/encyclopedia'
import { entryPath } from './encyclopediaApi'
import { encyclopediaGroups, encyclopediaSections, sectionPath, typeLabel } from './encyclopediaSections'
import { EncyclopediaSectionIcon } from './EncyclopediaSectionIcon'
import styles from './EncyclopediaDashboard.module.css'

const descriptions: Record<string, string> = {
  directories: 'Существа, персонажи и их особенности. Всё, что оживляет мир.',
  magic: 'Заклинания, магические предметы и всё, что наполняет мир силой.',
  rules: 'Ключевые правила, системы и механики игры.',
}

function SectionGroup({ group }: { group: (typeof encyclopediaGroups)[number] }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(Math.min(5, group.sections.length))
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const observer = new ResizeObserver(() => {
      const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0
      const minWidth = 11 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      setColumns(Math.min(5, group.sections.length, Math.max(1, Math.floor((grid.clientWidth + gap) / (minWidth + gap)))))
    })
    observer.observe(grid)
    return () => observer.disconnect()
  }, [group.sections.length])

  const hasMore = columns < group.sections.length
  const sections = expanded ? group.sections : group.sections.slice(0, columns)

  return <Panel className={styles.groupPanel} padding="normal" aria-labelledby={`encyclopedia-${group.id}`}>
    <section>
      <div className={styles.groupHeading}>
        <span className={styles.groupIcon} aria-hidden="true"><PlaceholderIcon /></span>
        <div className={styles.groupCopy}>
          <h2 id={`encyclopedia-${group.id}`}>{group.title}</h2>
          <p>{descriptions[group.id]}</p>
        </div>
        {hasMore && <button type="button" className={styles.expandButton}
          aria-controls={`section-grid-${group.id}`} aria-expanded={expanded}
          aria-label={`${expanded ? 'Свернуть' : 'Показать все разделы'}: ${group.title}`}
          onClick={() => setExpanded(value => !value)}>
          <span>{expanded ? 'Свернуть' : 'Все разделы'}</span><span className={styles.chevron} aria-hidden="true" />
        </button>}
      </div>
      <div ref={gridRef} className={styles.sectionGrid} id={`section-grid-${group.id}`} data-group={group.id}
        style={{ '--section-columns': columns } as CSSProperties}>
        {sections.map(section => <Link className={styles.sectionButton} to={sectionPath(section)} key={section.id}>
          <ListCard appearance="navigation" name={section.title} tags={[section.description]}
            icon={<EncyclopediaSectionIcon sectionId={section.id} />} />
        </Link>)}
      </div>
    </section>
  </Panel>
}

function VisitLink({ visit }: { visit: EncyclopediaVisit }) {
  const section = encyclopediaSections.find(section => sectionPath(section) === visit.path)
  return <Link to={visit.path} className={styles.rowLink} title={new Date(visit.visitedAt).toLocaleString('ru')}>
    <ListCard className={styles.sidebarCard} appearance="navigation" name={visit.title} tags={[visit.category]}
      icon={<EncyclopediaSectionIcon sectionId={section?.id ?? ''} />} />
    <span className={styles.rowArrow} aria-hidden="true" />
  </Link>
}

function PopularPanel() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ attempt: number; entries?: PopularEncyclopediaEntry[]; error?: boolean } | null>(null)
  const current = state?.attempt === attempt ? state : null

  useEffect(() => {
    const controller = new AbortController()
    fetchPopularEncyclopedia(controller.signal).then(page => {
      if (!controller.signal.aborted) setState({ attempt, entries: page.results })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ attempt, error: true })
    })
    return () => controller.abort()
  }, [attempt])

  return <Panel className={styles.sidebarPanel} padding="compact">
    <section className={styles.sidebarSection} aria-labelledby="encyclopedia-popular">
      <h2 id="encyclopedia-popular"><span aria-hidden="true"><PlaceholderIcon /></span>Популярное</h2>
      <ScrollArea aria-label="Популярные материалы" orientation="vertical" rootClassName={styles.panelScroll}>
        {!current ? <p className={styles.empty} role="status">Загружаем общий рейтинг…</p>
          : current.error ? <div role="status"><p className={styles.empty}>Общий рейтинг пока недоступен.</p>
            <button type="button" className={styles.textAction} onClick={() => setAttempt(value => value + 1)}>Повторить</button></div>
          : current.entries?.length === 0 ? <p className={styles.empty}>Пока нет данных об открытиях.</p>
          : current.entries?.map((entry, index) => <Link to={entryPath(entry)} className={styles.rowLink} key={entry.id}>
            <ListCard className={styles.sidebarCard} appearance="navigation" name={entry.name} tags={[typeLabel(entry.entity_type)]}
              icon={<span className={styles.rank}>{index + 1}</span>} />
            <span className={styles.rowArrow} aria-hidden="true" />
          </Link>)}
      </ScrollArea>
    </section>
  </Panel>
}

export function EncyclopediaDashboard({ history }: { history: EncyclopediaVisit[] }) {

  return <div className={styles.dashboard}>
    <div className={styles.groups}>
      {encyclopediaGroups.map(group => <SectionGroup key={group.id} group={group} />)}
    </div>
    <aside className={styles.sidebar} aria-label="Подборки энциклопедии">
      <Panel className={styles.sidebarPanel} padding="compact">
        <section className={styles.sidebarSection} aria-labelledby="encyclopedia-history">
          <div className={styles.sidebarHeading}>
            <h2 id="encyclopedia-history"><span aria-hidden="true"><PlaceholderIcon /></span>Недавно открывали</h2>
            {history.length > 0 && <button type="button" className={styles.textAction} onClick={clearHistory}>Очистить историю</button>}
          </div>
          <ScrollArea id="recent-visits" aria-label="История посещений" orientation="vertical" rootClassName={styles.panelScroll}>
            {history.length === 0 ? <p className={styles.empty}>Здесь появятся открытые вами материалы.</p>
              : history.map(visit => <VisitLink key={visit.path} visit={visit} />)}
          </ScrollArea>
        </section>
      </Panel>
      <PopularPanel />
    </aside>
  </div>
}
