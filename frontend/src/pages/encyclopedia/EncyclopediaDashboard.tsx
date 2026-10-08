import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ListCard, Panel, PlaceholderIcon, ScrollArea } from '../../shared/ui'
import { clearHistory } from '../../entities/encyclopedia'
import type { EncyclopediaVisit } from '../../entities/encyclopedia'
import { encyclopediaGroups, encyclopediaSections, sectionPath } from './encyclopediaSections'
import { EncyclopediaSectionIcon } from './EncyclopediaSectionIcon'
import styles from './EncyclopediaDashboard.module.css'

const descriptions: Record<string, string> = {
  directories: 'Существа, персонажи и их особенности. Всё, что оживляет мир.',
  magic: 'Заклинания, магические предметы и всё, что наполняет мир силой.',
  rules: 'Ключевые правила, системы и механики игры.',
}
const quickSections = ['spells', 'bestiary', 'classes', 'items', 'conditions']
  .flatMap(id => encyclopediaSections.filter(section => section.id === id))

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

function VisitLink({ visit, rank }: { visit: EncyclopediaVisit; rank?: number }) {
  const section = encyclopediaSections.find(section => sectionPath(section) === visit.path)
  return <Link to={visit.path} className={styles.rowLink} title={new Date(visit.visitedAt).toLocaleString('ru')}>
    <ListCard className={styles.sidebarCard} appearance="navigation" name={visit.title} tags={[visit.category]}
      icon={rank === undefined ? <EncyclopediaSectionIcon sectionId={section?.id ?? ''} /> : <span className={styles.rank}>{rank}</span>} />
    <span className={styles.rowArrow} aria-hidden="true" />
  </Link>
}

export function EncyclopediaDashboard({ history }: { history: EncyclopediaVisit[] }) {
  const [showHistory, setShowHistory] = useState(false)
  const popular = [...history].sort((a, b) => (b.visitCount ?? 1) - (a.visitCount ?? 1) || b.visitedAt - a.visitedAt).slice(0, 5)

  return <div className={styles.dashboard}>
    <div className={styles.groups}>
      {encyclopediaGroups.map(group => <SectionGroup key={group.id} group={group} />)}
    </div>
    <aside className={styles.sidebar} aria-label="Подборки энциклопедии">
      <Panel className={styles.sidebarPanel} padding="compact">
        <section aria-labelledby="encyclopedia-quick">
          <h2 id="encyclopedia-quick"><span aria-hidden="true"><PlaceholderIcon /></span>Быстрый доступ</h2>
          <nav aria-label="Быстрый доступ">
            {quickSections.map(section => <Link to={sectionPath(section)} className={styles.rowLink} key={section.id}>
              <ListCard className={styles.sidebarCard} appearance="navigation" name={section.title}
                icon={<EncyclopediaSectionIcon sectionId={section.id} />} />
              <span className={styles.rowArrow} aria-hidden="true" />
            </Link>)}
          </nav>
        </section>
      </Panel>
      <Panel className={styles.sidebarPanel} padding="compact">
        <section aria-labelledby="encyclopedia-history">
          <div className={styles.sidebarHeading}>
            <h2 id="encyclopedia-history"><span aria-hidden="true"><PlaceholderIcon /></span>Недавно открывали</h2>
            {history.length > 0 && <button type="button" className={styles.textAction}
              aria-expanded={showHistory} aria-controls="recent-visits" onClick={() => setShowHistory(value => !value)}>
              {showHistory ? 'Свернуть' : 'Вся история'}
            </button>}
          </div>
          {history.length === 0 ? <p className={styles.empty}>Здесь появятся открытые вами материалы.</p>
            : showHistory ? <ScrollArea id="recent-visits" aria-label="История посещений" orientation="vertical"
              rootClassName={styles.historyScroll} rootStyle={{ height: `${Math.min(history.length * 4.5, 24)}rem` }}>
              {history.map(visit => <VisitLink key={visit.path} visit={visit} />)}
            </ScrollArea> : <div id="recent-visits">{history.slice(0, 3).map(visit => <VisitLink key={visit.path} visit={visit} />)}</div>}
          {history.length > 0 && showHistory && <button type="button" className={styles.textAction} onClick={clearHistory}>Очистить историю</button>}
        </section>
      </Panel>
      <Panel className={styles.sidebarPanel} padding="compact">
        <section aria-labelledby="encyclopedia-popular">
          <h2 id="encyclopedia-popular"><span aria-hidden="true"><PlaceholderIcon /></span>Популярное</h2>
          <p className={styles.popularCaption}>По вашим открытиям</p>
          {popular.length === 0 ? <p className={styles.empty}>Здесь появятся часто открываемые вами материалы.</p>
            : popular.map((visit, index) => <VisitLink key={visit.path} visit={visit} rank={index + 1} />)}
        </section>
      </Panel>
    </aside>
  </div>
}
