import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Panel } from '../../shared/ui'
import { recordVisit } from '../../entities/encyclopedia'
import { encyclopediaSections, sectionPath } from './encyclopediaSections'
import { EncyclopediaResults } from './EncyclopediaResults'
import { EncyclopediaQuickNav } from './EncyclopediaQuickNav'
import pageStyles from './EncyclopediaPage.module.css'
import styles from './EncyclopediaSectionPage.module.css'

export default function EncyclopediaSectionPage() {
  const { sectionId } = useParams()
  const section = encyclopediaSections.find((entry) => entry.id === sectionId)
  useEffect(() => {
    if (section) recordVisit({ path: sectionPath(section), title: section.title, category: 'Раздел энциклопедии' })
  }, [section])

  return <main className={pageStyles.page}><div className={pageStyles.container}>
    <Link className={pageStyles.back} to="/encyclopedia">← Энциклопедия</Link>
    <header className={pageStyles.intro}><h1>{section?.title ?? 'Раздел не найден'}</h1><p>{section?.description}</p></header>
    <div className={styles.layout}>
      <div className={styles.content}>
        {section?.type ? <EncyclopediaResults key={section.type} type={section.type} /> : section && (
          <Panel padding="normal"><h2>Материалы готовятся</h2><p className={pageStyles.empty}>В этом разделе пока нет опубликованных материалов.</p></Panel>
        )}
      </div>
      {section && <aside className={styles.sidebar} aria-label="Быстрая навигация">
        <EncyclopediaQuickNav currentSectionId={section.id} />
      </aside>}
    </div>
  </div></main>
}
