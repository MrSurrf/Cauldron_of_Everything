import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button, Panel, ScrollArea } from '../../../shared/ui'
import { RichContent } from '../../../shared/ui/RichContent'
import type { ClassContentBlock, ClassEntity, ClassSection, ClassTable } from '../model/classEntity'
import styles from './ClassFullView.module.css'

function flattenSections(sections: ClassSection[]): ClassSection[] {
  return sections.flatMap(section => [section, ...flattenSections(section.children)])
}

function ClassTableView({ table, progression = false }: { table: ClassTable; progression?: boolean }) {
  const columnCount = Math.max(0, ...[...table.headers, ...table.rows].map(row => row.reduce((total, cell) => total + cell.colSpan, 0)))
  return <ScrollArea
    orientation="both"
    aria-label={table.title || (progression ? 'Таблица развития класса' : 'Таблица класса')}
    rootClassName={styles.tableArea}
    className={styles.tableViewport}
    contentClassName={styles.tableContent}
  >
    <table className={styles.table} data-progression={progression || undefined} data-wide={columnCount > 7 || undefined}>
      <caption className={styles.tableCaption}>{table.title || (progression ? 'Развитие класса по уровням' : 'Таблица класса')}</caption>
      {table.headers.length > 0 && <thead>{table.headers.map((row, rowIndex) => <tr key={rowIndex}>
        {row.map((cell, cellIndex) => <th key={cellIndex} colSpan={cell.colSpan} rowSpan={cell.rowSpan}
          scope={cell.colSpan > 1 ? 'colgroup' : 'col'}>
          <RichContent className={styles.cellContent} html={cell.html} />
        </th>)}
      </tr>)}</thead>}
      <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>
        {row.map((cell, cellIndex) => {
          const Cell = cell.header || (progression && cellIndex === 0) ? 'th' : 'td'
          return <Cell key={cellIndex} colSpan={cell.colSpan} rowSpan={cell.rowSpan} scope={Cell === 'th' ? 'row' : undefined}>
            <RichContent className={styles.cellContent} html={cell.html} />
          </Cell>
        })}
      </tr>)}</tbody>
    </table>
  </ScrollArea>
}

function ClassContent({ blocks }: { blocks: ClassContentBlock[] }) {
  return blocks.map((block, index) => block.type === 'table'
    ? <div className={styles.localTable} id={block.table.id} key={block.table.id}>
      {block.table.title && <h4 className={styles.localTableTitle}>{block.table.title}</h4>}
      <ClassTableView table={block.table} />
    </div>
    : <RichContent className={styles.richContent} html={block.html} key={index} />)
}

function ClassSectionView({ section, depth = 0 }: { section: ClassSection; depth?: number }) {
  const Heading = section.level <= 2 ? 'h2' : section.level === 3 ? 'h3' : section.level === 4 ? 'h4' : section.level === 5 ? 'h5' : 'h6'
  return <details className={styles.disclosure} id={section.id} data-class-disclosure data-nested={depth > 0 || undefined}>
    <summary className={styles.sectionSummary}>
      <Heading>{section.title}</Heading>
      <span className={styles.chevron} aria-hidden="true" />
    </summary>
    <div className={styles.sectionContent}>
      <ClassContent blocks={section.blocks} />
      {section.children.length > 0 && <div className={styles.children}>
        {section.children.map(child => <ClassSectionView key={child.id} section={child} depth={depth + 1} />)}
      </div>}
    </div>
  </details>
}

function ContentsLinks({ sections }: { sections: ClassSection[] }) {
  return <ol className={styles.contentsList}>
    {sections.map(section => <li key={section.id}>
      <a href={`#${section.id}`}>{section.title}</a>
      {section.children.length > 0 && <ContentsLinks sections={section.children} />}
    </li>)}
  </ol>
}

export function ClassFullView({ entity }: { entity: ClassEntity }) {
  const root = useRef<HTMLDivElement>(null)
  const overviewId = `class-${entity.id}-overview`
  const sectionsId = `class-${entity.id}-sections`
  const headingId = `class-${entity.id}-title`

  useEffect(() => {
    const openHashTarget = () => {
      const container = root.current
      if (!container || !window.location.hash) return
      let id: string
      try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
      const alias = flattenSections(entity.sections).find(section => section.aliases.includes(id))
      const target = document.getElementById(alias?.id ?? id)
      if (!target || !container.contains(target)) return
      for (let current: HTMLElement | null = target; current && current !== container; current = current.parentElement) {
        if (current instanceof HTMLDetailsElement) current.open = true
      }
      target.scrollIntoView({ block: 'start' })
    }
    // Срабатывает и при прямой ссылке, и при возврате по истории браузера.
    openHashTarget()
    window.addEventListener('hashchange', openHashTarget)
    window.addEventListener('popstate', openHashTarget)
    return () => {
      window.removeEventListener('hashchange', openHashTarget)
      window.removeEventListener('popstate', openHashTarget)
    }
  }, [entity])

  function followSection(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!(link instanceof HTMLAnchorElement)) return
    let url: URL
    try { url = new URL(link.href, window.location.href) } catch { return }
    if (!url.hash || url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) return
    let id: string
    try { id = decodeURIComponent(url.hash.slice(1)) } catch { return }
    const alias = flattenSections(entity.sections).find(section => section.aliases.includes(id))
    const target = document.getElementById(alias?.id ?? id)
    if (!target || !root.current?.contains(target)) return
    event.preventDefault()
    for (let current: HTMLElement | null = target; current && current !== root.current; current = current.parentElement) {
      if (current instanceof HTMLDetailsElement) current.open = true
    }
    const hash = `#${encodeURIComponent(target.id)}`
    if (window.location.hash !== hash) window.history.pushState(window.history.state, '', hash)
    const focusTarget = target instanceof HTMLDetailsElement ? target.querySelector<HTMLElement>(':scope > summary') : target
    if (focusTarget) {
      if (focusTarget.tagName !== 'SUMMARY') focusTarget.tabIndex = -1
      focusTarget.focus({ preventScroll: true })
    }
    target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  function toggleAll(open: boolean) {
    root.current?.querySelectorAll<HTMLDetailsElement>('details[data-class-disclosure]').forEach(details => { details.open = open })
  }

  return <div className={styles.view} ref={root} onClick={followSection}>
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
      <Link to="/encyclopedia">Энциклопедия</Link><span aria-hidden="true">/</span>
      <Link to="/encyclopedia/classes">Классы</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{entity.name}</span>
    </nav>

    <header className={styles.header}>
      <div className={styles.identity}>
        <p className={styles.eyebrow}>Справочник персонажа <span aria-hidden="true">✦</span> Класс</p>
        <h1 className={styles.title} id={headingId}>{entity.name}</h1>
        {entity.nameEn && <p className={styles.englishName}>{entity.nameEn}</p>}
      </div>
      {(entity.hitDie || entity.sources.length > 0) && <dl className={styles.facts}>
        {entity.hitDie && <div><dt>Кость хитов</dt><dd>{entity.hitDie}</dd></div>}
        {entity.sources.length > 0 && <div><dt>Источники</dt><dd>{entity.sources.join(' · ')}</dd></div>}
      </dl>}
    </header>

    <div className={styles.layout}>
      <article className={styles.article} aria-labelledby={headingId}>
        {entity.intro.length > 0 && <details className={`${styles.disclosure} ${styles.overview}`} id={overviewId} data-class-disclosure>
          <summary className={styles.sectionSummary}><h2>Описание класса</h2><span className={styles.chevron} aria-hidden="true" /></summary>
          <div className={styles.sectionContent}><ClassContent blocks={entity.intro} /></div>
        </details>}

        {entity.progression && <section className={styles.progression} id={entity.progression.id} aria-labelledby={`${entity.progression.id}-heading`}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>От первого до двадцатого уровня</p><h2 className={styles.sectionTitle} id={`${entity.progression.id}-heading`}>Развитие класса</h2></div>
            <span className={styles.sectionMark} aria-hidden="true">✦</span>
          </div>
          <Panel padding="compact" className={styles.tablePanel}><ClassTableView table={entity.progression} progression /></Panel>
          {entity.progression.rows.some(row => row.some(cell => /<a\b[^>]*href=/i.test(cell.html))) && <p className={styles.tableHint}>Нажмите на название умения в таблице, чтобы перейти к его описанию.</p>}
        </section>}

        {entity.sections.length > 0 && <section className={styles.sections} id={sectionsId} aria-labelledby={`${sectionsId}-heading`}>
          <div className={styles.sectionsToolbar}>
            <h2 className={styles.sectionTitle} id={`${sectionsId}-heading`}>Умения и особенности</h2>
            <div className={styles.disclosureActions}>
              <Button size="sm" variant="secondary" decoration="bare" icon={null} onClick={() => toggleAll(true)}>Раскрыть всё</Button>
              <Button size="sm" variant="secondary" decoration="bare" icon={null} onClick={() => toggleAll(false)}>Свернуть всё</Button>
            </div>
          </div>
          <div className={styles.sectionList}>{entity.sections.map(section => <ClassSectionView key={section.id} section={section} />)}</div>
        </section>}

        {entity.intro.length === 0 && entity.sections.length === 0 && !entity.progression && <Panel padding="normal"><p className={styles.empty}>Описание класса пока не добавлено.</p></Panel>}
      </article>

      <aside className={styles.sidebar} aria-label="Навигация по классу">
        <Panel padding="compact" className={styles.contentsPanel}>
          <nav aria-label="Оглавление класса">
            <h2 className={styles.contentsTitle}>На этой странице</h2>
            <ScrollArea aria-label="Разделы класса" rootClassName={styles.contentsArea} className={styles.contentsViewport}>
              <ol className={styles.contentsList}>
                {entity.intro.length > 0 && <li><a href={`#${overviewId}`}>Описание класса</a></li>}
                {entity.progression && <li><a href={`#${entity.progression.id}`}>Развитие по уровням</a></li>}
              </ol>
              <ContentsLinks sections={entity.sections} />
            </ScrollArea>
          </nav>
        </Panel>
        <Link className={styles.backToClasses} to="/encyclopedia/classes">← Все классы</Link>
      </aside>
    </div>
  </div>
}
