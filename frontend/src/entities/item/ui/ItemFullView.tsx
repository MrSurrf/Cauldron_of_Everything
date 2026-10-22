import { Link } from 'react-router-dom'

import { Panel, Tooltip } from '../../../shared/ui'
import { RichContent } from '../../../shared/ui/RichContent'
import type { ItemEntity } from '../model/item'
import styles from './ItemFullView.module.css'

export type ItemFullViewProps = {
  entity: ItemEntity
}

function Ornament() {
  return <span className={styles.ornament} aria-hidden="true">✦</span>
}

export function ItemFullView({ entity }: ItemFullViewProps) {
  const summary = [entity.classification, entity.rarity].filter(Boolean).join(' · ')
  const chips = [entity.rarity, entity.attunement, ...entity.tags]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)

  return (
    <div className={styles.view}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link to="/encyclopedia" aria-label="Энциклопедия">⌂</Link>
        <span aria-hidden="true">›</span>
        <Link to="/encyclopedia/items">Магические предметы</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{entity.name}</span>
      </nav>

      <Panel className={styles.frame} padding="none">
        <article className={styles.article}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Карточка предмета</p>
            <div className={styles.titleLine}>
              <h1>{entity.name}</h1>
              {entity.nameEn && <span className={styles.english}>[{entity.nameEn}]</span>}
            </div>
            <p className={styles.summary}>{summary || 'Магический предмет'}</p>
            {chips.length > 0 && (
              <ul className={styles.tags} aria-label="Свойства предмета">
                {chips.map((chip) => <li key={chip}>{chip}</li>)}
              </ul>
            )}
          </header>

          {entity.facts.length > 0 && (
            <dl className={styles.facts} aria-label="Основные параметры предмета">
              {entity.facts.map((fact) => (
                <div className={styles.fact} key={fact.key}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className={styles.body}>
            {entity.sections.length > 0 ? entity.sections.map((section, index) => (
              <section className={styles.section} key={section.id} aria-labelledby={section.title ? `${section.id}-title` : undefined}>
                {section.title && (index > 0 || section.title !== 'Описание') && (
                  <h2 id={`${section.id}-title`}><Ornament />{section.title}</h2>
                )}
                <RichContent className={styles.richContent} html={section.html} />
              </section>
            )) : (
              <p className={styles.empty}>Описание предмета пока не добавлено.</p>
            )}

            {entity.tables.map((table) => (
              <section className={styles.section} key={table.id}>
                {table.title && <h2><Ornament />{table.title}</h2>}
                <div className={styles.tableScroll}>
                  <table>
                    {table.columns.length > 0 && <thead><tr>{table.columns.map((column, index) => <th key={`${column}-${index}`}>{column}</th>)}</tr></thead>}
                    <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </section>
            ))}

            {entity.tooltips.length > 0 && (
              <section className={`${styles.section} ${styles.explanations}`} aria-labelledby="item-explanations">
                <h2 id="item-explanations"><Ornament />Пояснения</h2>
                <ul>
                  {entity.tooltips.map((tooltip) => (
                    <li key={`${tooltip.term}:${tooltip.text}`}>
                      <Tooltip content={tooltip.text} openDelay={180}>
                        <button type="button">{tooltip.term}</button>
                      </Tooltip>
                      <span>{tooltip.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {entity.sources.length > 0 && (
            <footer className={styles.sources}>
              <span>Источники</span>
              <p>{entity.sources.join(' · ')}</p>
            </footer>
          )}
        </article>
      </Panel>
    </div>
  )
}
