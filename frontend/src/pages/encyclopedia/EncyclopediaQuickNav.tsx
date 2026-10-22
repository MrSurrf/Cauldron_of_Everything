import { Link } from 'react-router-dom'

import { Panel, PlaceholderIcon } from '../../shared/ui'
import { encyclopediaSections, sectionPath } from './encyclopediaSections'
import styles from './EncyclopediaQuickNav.module.css'

const navigation = [
  { id: 'bestiary' },
  { id: 'classes' },
  { id: 'races' },
  { id: 'backgrounds' },
  { id: 'feats' },
  { id: 'spells' },
  { id: 'items' },
  {
    id: 'formulas',
    title: 'Правила и механики',
    description: 'Правила, механики и справочные таблицы.',
  },
].flatMap(item => {
  const section = encyclopediaSections.find(entry => entry.id === item.id)
  return section ? [{ ...section, ...item }] : []
})

const ruleSectionIds = new Set([
  'formulas', 'conditions', 'combat', 'actions', 'creature-statistics', 'spellcasting', 'multiclassing',
])

export function EncyclopediaQuickNav({ currentSectionId }: { currentSectionId?: string }) {
  return <Panel className={styles.panel} padding="compact">
    <nav aria-labelledby="encyclopedia-quick-navigation">
      <h2 id="encyclopedia-quick-navigation">Навигация по энциклопедии</h2>
      <div className={styles.links}>
        {navigation.map(section => {
          const active = section.id === currentSectionId
            || (section.id === 'formulas' && ruleSectionIds.has(currentSectionId ?? ''))
          return <Link
            className={styles.link}
            data-active={active || undefined}
            aria-current={active ? 'page' : undefined}
            to={sectionPath(section)}
            key={section.id}
          >
            <span className={styles.icon} aria-hidden="true"><PlaceholderIcon /></span>
            <span className={styles.copy}>
              <strong>{section.title}</strong>
              <small>{section.description}</small>
            </span>
            <span className={styles.arrow} aria-hidden="true" />
          </Link>
        })}
      </div>
      <Link className={styles.allLink} to="/encyclopedia">Вся энциклопедия →</Link>
    </nav>
  </Panel>
}
